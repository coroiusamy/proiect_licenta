import pdf from 'pdf-parse/lib/pdf-parse.js';
import { parseSynevoPdf } from '../services/pdfParser.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const uploadAnalysisFile = async (req, res) => {
  if (!req.file || req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ message: 'Încărcați un fișier PDF valid.' });
  }

  try {
    // Extragere text din PDF
    const data = await pdf(req.file.buffer);
    const textContent = data.text;
    const userId = req.userId;

    // Functie parser specifică Synevo
    console.log('Controller: Trimit textul către parser...');
    const resultsToSave = await parseSynevoPdf(textContent, userId);

    // Step 3: (Future) Save the results returned by the parser
    // For now, we just log how many results the parser found (currently 0)
    console.log(
      `Controller: Parser a returnat ${resultsToSave.length} rezultate.`
    );
    // await prisma.analysisResult.createMany({ data: resultsToSave }); // This will save them later

    res.status(200).json({
      message: `PDF procesat. Parser a identificat ${resultsToSave.length} rezultate (implementare în curs).`,
      // Optionally send back the first few results found for debugging
      // parsedResultsPreview: resultsToSave.slice(0, 5)
    });
  } catch (error) {
    console.error('Eroare în procesul de upload/parsare:', error);
    // Pass the specific error message from the parser if it exists
    res
      .status(500)
      .json({ message: error.message || 'Eroare server la procesarea PDF.' });
  }
};
