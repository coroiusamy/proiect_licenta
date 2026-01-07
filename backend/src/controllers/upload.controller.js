import pdf from 'pdf-parse/lib/pdf-parse.js';
import { parseSynevoPdf } from '../services/parseSynevo.service.js';
import { parseReginaMariaPdf } from '../services/parseReginaMaria.service.js';
import { PrismaClient } from '@prisma/client';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { generateWellnessAdvice } from '../services/ai.service.js';

const prisma = new PrismaClient();

// === HELPER: Detectare clinică ===
function detectClinic(textContent) {
  const lower = textContent.toLowerCase();

  if (lower.includes('synevo')) return 'Synevo';
  if (lower.includes('regina maria')) return 'Regina Maria';
  if (lower.includes('medlife')) return 'MedLife';
  if (lower.includes('bioclinica')) return 'Bioclinica';

  return 'Unknown';
}

// === CONTROLLER PRINCIPAL (HIBRID) ===
export const uploadAnalysisFile = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ message: 'Niciun fișier nu a fost încărcat.' });
  }

  const userId = req.userId;
  let textContent = '';

  try {
    console.log('📄 [Upload] Primire fișier:', req.file.originalname);

    // --- 1. EXTRAGERE TEXT (PDF sau OCR) ---
    if (req.file.mimetype === 'application/pdf') {
      const data = await pdf(req.file.buffer);
      textContent = data.text;
    } else if (req.file.mimetype.startsWith('image/')) {
      const processedImage = await sharp(req.file.buffer)
        .grayscale()
        .toBuffer();
      const worker = await createWorker('ron', 1);
      const ret = await worker.recognize(processedImage);
      textContent = ret.data.text;
      await worker.terminate();
    } else {
      return res.status(400).json({ message: 'Format neacceptat.' });
    }

    if (!textContent || textContent.length < 10) {
      return res.status(400).json({
        message: 'Nu s-a putut citi textul din fișier.',
      });
    }

    // --- 2. DETECTARE CLINICĂ ---
    const clinic = detectClinic(textContent);
    console.log(`🏥 [Upload] Clinică detectată: ${clinic}`);

    // --- 3. PARSARE INTELIGENTĂ (Selectăm parser-ul corespunzător) ---
    console.log('🔍 [Upload] Parsare text...');

    let extractedResults = [];

    if (clinic === 'Regina Maria') {
      console.log('🔴 [Upload] Folosim parser Regina Maria (multi-line)...');
      extractedResults = await parseReginaMariaPdf(textContent, userId);
    } else if (clinic === 'Synevo') {
      console.log('📋 [Upload] Folosim parser Synevo...');
      extractedResults = await parseSynevoPdf(textContent, userId);
    } else {
      // Fallback: încearcă Synevo (cel mai comun)
      console.log('⚠️ [Upload] Clinică necunoscută, folosim parser Synevo...');
      extractedResults = await parseSynevoPdf(textContent, userId);
    }

    if (extractedResults.length === 0) {
      return res.status(400).json({
        message: 'Nu s-au putut extrage analize. Încearcă un PDF mai clar.',
      });
    }

    console.log(
      `✅ [Upload] ${extractedResults.length} analize identificate din ${clinic}!`
    );

    // --- 4. PREGĂTIRE DATE (Luăm toate tipurile din DB pentru referințe) ---
    const allTypes = await prisma.analysisType.findMany();

    const savedResults = [];
    const backgroundJobs = [];

    // --- 5. PROCESARE INTELIGENTĂ (Iterăm prin fiecare rezultat) ---
    for (const item of extractedResults) {
      const typeInfo = allTypes.find((t) => t.id === item.analysisTypeId);
      let status = 'normal';
      const numValue = item.value;

      if (
        typeInfo &&
        numValue !== null &&
        typeInfo.refMin !== null &&
        typeInfo.refMax !== null
      ) {
        if (numValue < typeInfo.refMin) status = 'low';
        else if (numValue > typeInfo.refMax) status = 'high';
      }

      // Logică Hibridă: Mesaj Instant pentru Normal
      let aiAdvice = null;
      if (status === 'normal' && numValue !== null) {
        aiAdvice = `✅ Rezultatul de ${numValue} ${
          typeInfo?.unit || ''
        } este în limite normale (${typeInfo?.refMin} - ${
          typeInfo?.refMax
        }).\nSănătatea ta este protejată!`;
      }

      // Salvăm în baza de date (individual, pentru a avea ID-ul)
      const savedRecord = await prisma.analysisResult.create({
        data: {
          userId: userId,
          analysisTypeId: item.analysisTypeId,
          date: item.date,
          value: item.value,
          stringValue: item.stringValue,
          notes: `Importat din ${req.file.originalname} (${clinic})`,
          status: status,
          aiAdvice: aiAdvice,
        },
        include: { analysisType: true },
      });

      savedResults.push(savedRecord);

      // Dacă e ANORMAL, îl punem pe lista de așteptare pentru AI
      if (status !== 'normal' && numValue !== null && typeInfo) {
        backgroundJobs.push({
          id: savedRecord.id,
          name: typeInfo.name,
          value: numValue,
          unit: typeInfo.unit,
          status: status,
          refMin: typeInfo.refMin,
          refMax: typeInfo.refMax,
        });
      }
    }

    // --- 6. RĂSPUNS RAPID CĂTRE CLIENT ---
    console.log(
      `✅ [Upload] Salvate: ${savedResults.length}. Job-uri AI în coadă: ${backgroundJobs.length}`
    );

    res.status(201).json({
      message: `Procesat cu succes! ${savedResults.length} analize salvate din ${clinic}.`,
      count: savedResults.length,
      clinic: clinic,
      aiPending: backgroundJobs.length,
    });

    // --- 7. EXECUTARE AI ÎN BACKGROUND (După răspuns) ---
    if (backgroundJobs.length > 0) {
      setTimeout(async () => {
        console.log(
          `🤖 [Background] Începem procesarea a ${backgroundJobs.length} analize anormale...`
        );

        // Procesăm câte 3 simultan (batch processing)
        const batchSize = 3;
        for (let i = 0; i < backgroundJobs.length; i += batchSize) {
          const batch = backgroundJobs.slice(i, i + batchSize);

          await Promise.all(
            batch.map(async (job) => {
              try {
                console.log(`   🔄 AI pentru: ${job.name} (${job.status})...`);
                const advice = await generateWellnessAdvice(
                  job.name,
                  job.value,
                  job.unit || '',
                  job.status,
                  job.refMin,
                  job.refMax
                );

                if (advice) {
                  await prisma.analysisResult.update({
                    where: { id: job.id },
                    data: { aiAdvice: advice },
                  });
                  console.log(`   ✅ Sfat salvat pentru ${job.name}`);
                }
              } catch (err) {
                console.error(
                  `   ❌ AI Error pentru ${job.name}:`,
                  err.message
                );
              }
            })
          );
        }

        console.log(`✅ [Background] Toate job-urile AI finalizate!`);
      }, 1000); // Pornim după 1 secundă
    }
  } catch (error) {
    console.error('❌ [Upload] Eroare:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Eroare la procesarea fișierului.' });
    }
  }
};
