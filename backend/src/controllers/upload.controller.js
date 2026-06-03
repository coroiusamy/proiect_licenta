import pdf from 'pdf-parse/lib/pdf-parse.js';
import { parseSynevoPdf } from '../services/parseSynevo.service.js';
import { parseReginaMariaPdf } from '../services/parseReginaMaria.service.js';
import { PrismaClient } from '@prisma/client';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { generateWellnessAdvice } from '../services/ai.service.js';

const prisma = new PrismaClient();
const OCR_DEBUG = process.env.UPLOAD_DEBUG === '1';
const OCR_PROVIDER = process.env.OCR_PROVIDER || 'auto';
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

const ocrDebugLog = (...args) => {
  if (OCR_DEBUG) {
    console.log('[UploadOCRDebug]', ...args);
  }
};

const resolveOcrProvider = () => {
  if (OCR_PROVIDER === 'google-vision') return 'google-vision';
  if (OCR_PROVIDER === 'tesseract') return 'tesseract';
  if (OCR_PROVIDER === 'auto') {
    return GOOGLE_VISION_API_KEY ? 'google-vision' : 'tesseract';
  }
  return 'tesseract';
};

const extractTextWithGoogleVision = async (imageBuffer) => {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('Lipsește GOOGLE_VISION_API_KEY pentru OCR Google Vision.');
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageBuffer.toString('base64'),
            },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            imageContext: {
              languageHints: ['ro', 'en'],
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Vision HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const first = data?.responses?.[0];

  if (first?.error) {
    throw new Error(`Google Vision error: ${first.error.message}`);
  }

  const text =
    first?.fullTextAnnotation?.text ||
    first?.textAnnotations?.[0]?.description ||
    '';
  return {
    text,
    confidence: null,
  };
};

function scoreOcrText(text) {
  if (!text) return 0;

  const compact = text.replace(/\s+/g, ' ').trim();
  const words = compact.split(' ').filter((w) => w.length >= 2);
  const wordsCount = words.length;
  const digits = (compact.match(/\d/g) || []).length;
  const letters = (compact.match(/[a-zA-ZăâîșțĂÂÎȘȚ]/g) || []).length;
  const weirdSymbols = (compact.match(/[^\w\s.,:;()\/%<>=\-]/g) || []).length;
  const totalChars = Math.max(compact.length, 1);
  const weirdRatio = weirdSymbols / totalChars;
  const alphaNumRatio = (letters + digits) / totalChars;
  const upperCaseWords = words.filter((w) =>
    /^[A-ZĂÂÎȘȚ0-9]{3,}$/.test(w),
  ).length;

  const medicalHints = (
    compact.match(
      /glicemie|hemoleucograma|colesterol|trigliceride|creatinina|uree|tsh|analiz|rezultat/gi,
    ) || []
  ).length;

  const structuralHints = (
    compact.match(
      /buletin analize medicale|denumire|interval de referinta|numar leucocite|hematocrit|synevo|recoltarii/gi,
    ) || []
  ).length;

  // Penalizare pentru text „zgomotos” (ca în varianta threshold care a regresat).
  const noisePenalty =
    weirdRatio * 800 +
    Math.max(0, upperCaseWords - wordsCount * 0.2) * 12 +
    (alphaNumRatio < 0.45 ? 220 : 0);

  return (
    Math.min(compact.length, 2600) +
    wordsCount * 4 +
    digits * 2 +
    medicalHints * 35 +
    structuralHints * 70 -
    noisePenalty
  );
}

function buildVariantCompositeScore({ text, score, confidence }) {
  const conf = typeof confidence === 'number' ? confidence : 0;
  const compact = (text || '').replace(/\s+/g, ' ').trim();
  const hasAnchors =
    /buletin analize medicale|denumire|interval de referinta|synevo/i.test(
      compact,
    );

  let composite = score + conf * 45;

  if (!hasAnchors) composite -= 350;
  if (conf < 45) composite -= 900;
  if (conf >= 70) composite += 220;

  return composite;
}

async function prepareImageForOcr(buffer) {
  try {
    // `failOn: 'none'` tolerează JPEG-uri imperfecte produse de unele camere Android.
    // Pipeline-ul crește lizibilitatea pentru OCR: orientare, reducere zgomot, contrast, claritate.
    return await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({
        width: 2200,
        height: 2200,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .grayscale()
      .normalise()
      .sharpen({ sigma: 1.2, m1: 1, m2: 2 })
      .png({ compressionLevel: 6 })
      .toBuffer();
  } catch (sharpError) {
    console.warn('[UploadAPI] sharp preprocess failed', {
      message: sharpError?.message,
    });
    return null;
  }
}

async function prepareImageVariantsForOcr(buffer) {
  const variants = [];

  const base = await prepareImageForOcr(buffer);
  if (base) {
    variants.push({ name: 'enhanced_base', buffer: base });
  }

  try {
    const highContrast = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({
        width: 2600,
        height: 2600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .grayscale()
      .normalise()
      .linear(1.18, -8)
      .sharpen({ sigma: 1.1, m1: 1, m2: 2 })
      .png({ compressionLevel: 6 })
      .toBuffer();

    variants.push({ name: 'enhanced_contrast', buffer: highContrast });
  } catch (err) {
    ocrDebugLog('variant_failed', {
      variant: 'enhanced_contrast',
      message: err?.message,
    });
  }

  try {
    const thresholded = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({
        width: 2600,
        height: 2600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .grayscale()
      .normalise()
      .threshold(168)
      .png({ compressionLevel: 6 })
      .toBuffer();

    variants.push({ name: 'enhanced_threshold', buffer: thresholded });
  } catch (err) {
    ocrDebugLog('variant_failed', {
      variant: 'enhanced_threshold',
      message: err?.message,
    });
  }

  return variants;
}

async function extractBestTextFromImage(worker, imageBuffer) {
  const variants = await prepareImageVariantsForOcr(imageBuffer);

  if (!variants.length) {
    throw new Error('Imaginea nu a putut fi preprocesată pentru OCR.');
  }

  const results = [];
  for (const variant of variants) {
    try {
      const ocrResult = await worker.recognize(variant.buffer);
      const text = ocrResult?.data?.text || '';
      const score = scoreOcrText(text);
      const confidence = ocrResult?.data?.confidence ?? null;

      results.push({
        variant: variant.name,
        text,
        score,
        confidence,
      });
    } catch (err) {
      ocrDebugLog('ocr_variant_failed', {
        variant: variant.name,
        message: err?.message,
      });
    }
  }

  if (!results.length) {
    throw new Error('OCR a eșuat pe toate variantele de preprocesare.');
  }

  for (const result of results) {
    result.composite = buildVariantCompositeScore(result);
  }

  results.sort((a, b) => b.composite - a.composite);
  const best = results[0];

  ocrDebugLog(
    'variant_scores',
    results.map((r) => ({
      variant: r.variant,
      score: r.score,
      confidence: r.confidence,
      composite: r.composite,
    })),
  );

  return {
    text: best.text,
    usedVariant: best.variant,
    enhancedScore: best.score,
    originalScore: 0,
    confidence: best.confidence,
  };
}

// === HELPER: Detectare clinică ===
function detectClinic(textContent) {
  const lower = textContent.toLowerCase();

  if (lower.includes('synevo')) return 'Synevo';
  if (lower.includes('regina maria')) return 'Regina Maria';
  if (lower.includes('medlife')) return 'MedLife';
  if (lower.includes('bioclinica')) return 'Bioclinica';

  return 'Unknown';
}

function hasMinimumMedicalAnchors(textContent) {
  const compact = (textContent || '').toLowerCase();
  const anchors = [
    'buletin analize medicale',
    'denumire',
    'interval de referinta',
    'numar leucocite',
    'hematocrit',
    'synevo',
    'regina maria',
    'laborator',
    'rezultat',
    'metoda',
    'certificat',
    'rezultate',
    'analize',
  ];

  let hits = 0;
  for (const anchor of anchors) {
    if (compact.includes(anchor)) hits += 1;
  }

  return hits >= 2;
}

// === CONTROLLER PRINCIPAL (HIBRID) ===
export const uploadAnalysisFile = async (req, res) => {
  const singleFile = req.files?.analysisFile?.[0] || null;
  const imageFiles = req.files?.analysisFiles || [];
  const uploadedFiles = [singleFile, ...imageFiles].filter(Boolean);

  console.log('[UploadAPI] request start', {
    userId: req.userId,
    pdfCount: singleFile ? 1 : 0,
    imageCount: imageFiles.length,
    totalFiles: uploadedFiles.length,
  });

  if (uploadedFiles.length === 0) {
    return res
      .status(400)
      .json({ message: 'Niciun fișier nu a fost încărcat.' });
  }

  const userId = req.userId;
  let textContent = '';
  let useOcrHeuristics = false;
  let worker = null;
  const activeProvider = resolveOcrProvider();

  try {
    const hasPdf = uploadedFiles.some(
      (file) => file.mimetype === 'application/pdf',
    );

    if (hasPdf && uploadedFiles.length > 1) {
      console.log('[UploadAPI] invalid mix: pdf + images');
      return res.status(400).json({
        message:
          'Pentru moment poți încărca ori un PDF, ori mai multe imagini, nu ambele simultan.',
      });
    }

    // 1. Extragere text (PDF sau OCR multiplu)
    if (hasPdf) {
      const pdfFile = uploadedFiles.find(
        (file) => file.mimetype === 'application/pdf',
      );
      console.log('[UploadAPI] process pdf', {
        name: pdfFile?.originalname,
        bytes: pdfFile?.size,
      });
      const data = await pdf(pdfFile.buffer);
      textContent = data.text;
      useOcrHeuristics = false;
    } else if (
      uploadedFiles.every((file) => file.mimetype.startsWith('image/'))
    ) {
      console.log('[UploadAPI] process images via OCR', {
        count: uploadedFiles.length,
        provider: activeProvider,
      });

      if (activeProvider === 'tesseract') {
        worker = await createWorker('ron+eng', 1);
        await worker.setParameters({
          tessedit_pageseg_mode: '6',
          preserve_interword_spaces: '1',
          user_defined_dpi: '300',
        });
      }

      const extractedTexts = [];
      let successImages = 0;
      const failedImages = [];

      for (const imageFile of uploadedFiles) {
        console.log('[UploadAPI] OCR image', {
          name: imageFile?.originalname,
          bytes: imageFile?.size,
          mime: imageFile?.mimetype,
        });

        try {
          const ocrResult =
            activeProvider === 'google-vision'
              ? {
                  ...(await extractTextWithGoogleVision(imageFile.buffer)),
                  usedVariant: 'google_vision_document_text',
                  enhancedScore: null,
                  originalScore: null,
                }
              : await extractBestTextFromImage(worker, imageFile.buffer);

          extractedTexts.push(ocrResult.text || '');
          console.log('[UploadAPI] OCR variant selected', {
            name: imageFile?.originalname,
            usedVariant: ocrResult.usedVariant,
            enhancedScore: ocrResult.enhancedScore,
            originalScore: ocrResult.originalScore,
            confidence: ocrResult.confidence,
            provider: activeProvider,
          });

          ocrDebugLog('raw_text_start', {
            name: imageFile?.originalname,
            confidence: ocrResult.confidence,
            chars: (ocrResult.text || '').length,
          });
          ocrDebugLog(ocrResult.text || '');
          ocrDebugLog('raw_text_end', {
            name: imageFile?.originalname,
          });

          successImages += 1;
        } catch (ocrError) {
          console.error('[UploadAPI] OCR failed for image', {
            name: imageFile?.originalname,
            message: ocrError?.message,
          });
          failedImages.push(imageFile?.originalname || 'imagine-necunoscuta');
        }
      }

      console.log('[UploadAPI] OCR summary', {
        successImages,
        failedImagesCount: failedImages.length,
      });

      if (successImages === 0) {
        return res.status(400).json({
          message:
            'Nicio imagine nu a putut fi procesată. Încearcă poze mai clare sau exportă buletinul ca PDF.',
          failedImages,
        });
      }

      textContent = extractedTexts.join('\n\n');
      useOcrHeuristics = true;

      ocrDebugLog('merged_text_start', {
        totalChars: textContent.length,
        files: extractedTexts.length,
      });
      ocrDebugLog(textContent);
      ocrDebugLog('merged_text_end');
    } else {
      return res.status(400).json({ message: 'Format neacceptat.' });
    }

    if (!textContent || textContent.length < 10) {
      return res.status(400).json({
        message: 'Nu s-a putut citi textul din fișier.',
      });
    }

    if (!hasMinimumMedicalAnchors(textContent)) {
      console.log('[UploadAPI] rejected low-quality OCR text', {
        chars: textContent.length,
      });
      return res.status(400).json({
        message:
          'Textul extras este prea slab calitativ. Încearcă poze mai clare, fără umbre, sau încarcă PDF.',
      });
    }

    // 2. Detectare clinică
    const clinic = detectClinic(textContent);

    // 3. Parsare inteligentă
    let extractedResults = [];
    let usedLlmFallback = false;

    if (clinic === 'Regina Maria') {
      extractedResults = await parseReginaMariaPdf(textContent, userId);
    } else if (clinic === 'Synevo') {
      extractedResults = await parseSynevoPdf(textContent, userId, {
        useOcrHeuristics,
      });
    } else {
      extractedResults = await parseSynevoPdf(textContent, userId, {
        useOcrHeuristics,
      });
    }

    // HIBRID FALLBACK: Dacă nu s-au găsit rezultate sau clinica este Unknown, rulăm parsing-ul LLM
    if (extractedResults.length === 0 || clinic === 'Unknown') {
      console.log(`[UploadAPI] Rulăm parsing LLM ca fallback (clinic: ${clinic}, regex results count: ${extractedResults.length})...`);
      try {
        const { parseLlmPdf } = await import('../services/parseLlm.service.js');
        const llmResults = await parseLlmPdf(textContent, userId);
        if (llmResults && llmResults.length > 0) {
          extractedResults = llmResults;
          usedLlmFallback = true;
        }
      } catch (llmError) {
        console.error('[UploadAPI] LLM parsing fallback failed:', llmError);
      }
    }

    if (extractedResults.length === 0) {
      console.log('[UploadAPI] no extracted results');
      return res.status(400).json({
        message: 'Nu s-au putut extrage analize. Încearcă un PDF mai clar sau o altă metodă.',
      });
    }

    // 4. Pregătire date
    const allTypes = await prisma.analysisType.findMany();

    const savedResults = [];
    const backgroundJobs = [];

    // 5. Procesare (iterăm prin fiecare rezultat)
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
          notes: `Importat din ${uploadedFiles.map((file) => file.originalname).join(', ')} (${clinic})${usedLlmFallback ? ' [LLM Fallback]' : ''}`,
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

    // 6. Răspuns către client
    res.status(201).json({
      message: `Procesat cu succes! ${savedResults.length} analize salvate din ${clinic}.`,
      count: savedResults.length,
      clinic: clinic,
      aiPending: backgroundJobs.length,
    });

    console.log('[UploadAPI] success', {
      clinic,
      savedCount: savedResults.length,
      aiPending: backgroundJobs.length,
    });

    // 7. AI în background (după răspuns)
    if (backgroundJobs.length > 0) {
      setTimeout(async () => {
        const batchSize = 3;
        for (let i = 0; i < backgroundJobs.length; i += batchSize) {
          const batch = backgroundJobs.slice(i, i + batchSize);

          await Promise.all(
            batch.map(async (job) => {
              try {
                const advice = await generateWellnessAdvice(
                  job.name,
                  job.value,
                  job.unit || '',
                  job.status,
                  job.refMin,
                  job.refMax,
                );

                if (advice) {
                  await prisma.analysisResult.update({
                    where: { id: job.id },
                    data: { aiAdvice: advice },
                  });
                }
              } catch (err) {
                // Eroarea AI nu afectează rezultatul salvat
              }
            }),
          );
        }
      }, 1000);
    }
  } catch (error) {
    console.error('[UploadAPI] error', {
      message: error?.message,
      stack: error?.stack,
    });
    if (!res.headersSent) {
      res.status(500).json({ message: 'Eroare la procesarea fișierului.' });
    }
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
};
