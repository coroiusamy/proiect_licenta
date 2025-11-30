import pdf from 'pdf-parse/lib/pdf-parse.js';
import { parseSynevoPdf } from '../services/pdfParser.service.js';
import { PrismaClient } from '@prisma/client';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

const prisma = new PrismaClient();

export const uploadAnalysisFile = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ message: 'Niciun fișier nu a fost încărcat.' });
  }

  const userId = req.userId;
  let textContent = '';

  try {
    console.log(
      'Fișierul primit de server:',
      req.file.originalname,
      req.file.mimetype
    );

    // --- Procesare PDF ---
    if (req.file.mimetype === 'application/pdf') {
      console.log('Controller: Procesare PDF...');
      const data = await pdf(req.file.buffer);
      textContent = data.text;

      // --- Procesare Imagine (OCR cu pre-procesare SIMPLIFICATĂ) ---
    } else if (req.file.mimetype.startsWith('image/')) {
      console.log('Controller: Procesare Imagine (OCR)...');

      // Pre-procesare imagine, convertim la grayscale.
      const processedImage = await sharp(req.file.buffer)
        .grayscale()
        .toBuffer();

      const worker = await createWorker('ron', 1);

      const ret = await worker.recognize(processedImage);
      textContent = ret.data.text;

      await worker.terminate();

      console.log('--- TEXT EXTRAS DIN OCR (SIMPLIFICAT) ---');
      console.log(textContent.substring(0, 800) + '...');
      console.log('---------------------------');
    } else {
      return res.status(400).json({
        message: 'Tip de fișier neacceptat. Încărcați PDF sau imagine.',
      });
    }

    // --- Parsarea Textului Extras ---
    console.log('Controller: Trimit textul către parser...');
    const resultsToSave = await parseSynevoPdf(textContent, userId);

    if (resultsToSave.length === 0) {
      console.warn('Controller: Parser-ul nu a returnat niciun rezultat.');
      return res.status(400).json({
        message:
          'Fișier procesat, dar nu s-au putut extrage rezultate compatibile. Verifică calitatea imaginii sau încarcă un PDF.',
      });
    }

    // --- Salvarea în Baza de Date ---
    console.log(
      `Controller: Încerc să salvez ${resultsToSave.length} rezultate...`
    );

    const creationResult = await prisma.analysisResult.createMany({
      data: resultsToSave,
      skipDuplicates: true,
    });

    console.log(`Controller: ${creationResult.count} rezultate salvate.`);

    res.status(201).json({
      message: `Fișier procesat și ${creationResult.count} rezultate salvate!`,
      count: creationResult.count,
      data: resultsToSave.slice(0, 5),
    });
  } catch (error) {
    console.error('Eroare în procesul de upload/parsare:', error);
    res.status(500).json({
      message: error.message || 'Eroare server la procesarea fișierului.',
      hint: req.file.mimetype.startsWith('image/')
        ? 'Pentru poze, asigură-te că imaginea este clară și bine luminată. PDF-urile dau rezultate mai bune.'
        : undefined,
    });
  }
};
