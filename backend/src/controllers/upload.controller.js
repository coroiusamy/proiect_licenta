import pdf from 'pdf-parse/lib/pdf-parse.js';
import { parseSynevoPdf } from '../services/pdfParser.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // Asigură-te că ai inițializat Prisma

export const uploadAnalysisFile = async (req, res) => {
  if (!req.file || req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ message: 'Încărcați un fișier PDF valid.' });
  }

  try {
    // Pas 1: Extrage textul
    const data = await pdf(req.file.buffer);
    const textContent = data.text;
    const userId = req.userId; // ID-ul userului (din 'protect')

    // Pas 2: Apelează parser-ul
    console.log('Controller: Trimit textul către parser...');
    const resultsToSave = await parseSynevoPdf(textContent, userId);

    if (resultsToSave.length === 0) {
      console.warn('Controller: Parser-ul nu a returnat niciun rezultat.');
      // Poți alege să dai eroare sau succes cu 0
      return res
        .status(400)
        .json({
          message:
            'PDF procesat, dar nu s-au putut extrage rezultate compatibile.',
        });
    }

    // --- PASUL NOU: SALVAREA ÎN BAZA DE DATE ---
    console.log(
      `Controller: Încerc să salvez ${resultsToSave.length} rezultate în baza de date...`
    );

    // Folosim 'createMany' pentru a insera toate rezultatele odată (mult mai eficient)
    const creationResult = await prisma.analysisResult.createMany({
      data: resultsToSave,
      skipDuplicates: true, // În caz că o combinație unică e violată (deși nu ar trebui)
    });

    console.log(
      `Controller: ${creationResult.count} rezultate salvate cu succes.`
    );
    // ---------------------------------------------

    res.status(201).json({
      // 201 Created (e mai corect decât 200)
      message: `PDF procesat și ${creationResult.count} rezultate salvate cu succes!`,
      count: creationResult.count,
      // Trimitem înapoi rezultatele salvate (sau doar un preview)
      data: resultsToSave.slice(0, 5), // Trimitem doar primele 5 ca preview
    });
  } catch (error) {
    console.error('Eroare în procesul de upload/parsare:', error);
    res
      .status(500)
      .json({ message: error.message || 'Eroare server la procesarea PDF.' });
  }
};
