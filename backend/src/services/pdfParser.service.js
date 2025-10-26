import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to try and extract a numeric value after a name
// Returns null if no number is found reasonably close
const extractValueAfterName = (textBlock, analysisName) => {
  try {
    // Find the position of the analysis name
    const nameIndex = textBlock
      .toLowerCase()
      .indexOf(analysisName.toLowerCase());
    if (nameIndex === -1) return null;

    // Look for the first number (integer or decimal) AFTER the name
    // Limit the search to a reasonable character window (e.g., next 50 chars)
    const searchArea = textBlock.substring(
      nameIndex + analysisName.length,
      nameIndex + analysisName.length + 50
    );

    // Regex to find the first number (potentially with <, >, ≤)
    const valueRegex = /(?:<|>|≤)?\s*(\d+(\.\d+)?)/;
    const valueMatch = searchArea.match(valueRegex);

    if (valueMatch && valueMatch[1]) {
      return parseFloat(valueMatch[1]);
    }
    return null; // No number found nearby
  } catch (e) {
    // Log error during extraction for this specific name
    console.error(`Error extracting value for ${analysisName}:`, e);
    return null;
  }
};

// Helper function to extract text value (like Pozitiv/Negativ)
const extractTextValueAfterName = (textBlock, analysisName) => {
  try {
    const nameIndex = textBlock
      .toLowerCase()
      .indexOf(analysisName.toLowerCase());
    if (nameIndex === -1) return null;
    const searchArea = textBlock.substring(
      nameIndex + analysisName.length,
      nameIndex + analysisName.length + 50
    );
    const valueRegex =
      /(Pozitiv|Negativ|Reactiv|Nedecelabil|Normal|Prezente|Absente)/i;
    const valueMatch = searchArea.match(valueRegex);
    if (valueMatch && valueMatch[0]) {
      return valueMatch[0];
    }
    return null;
  } catch (e) {
    console.error(`Error extracting text value for ${analysisName}:`, e);
    return null;
  }
};

export const parseSynevoPdf = async (textContent, userId) => {
  console.log('--- Starting Synevo Specific Parsing ---');
  const resultsToSave = [];

  // --- Step 1: Extract Analysis Date (remains the same) ---
  let analysisDate = null;
  const dateRegex = /Data recoltarii:[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i;
  const dateMatch = textContent.match(dateRegex);
  if (dateMatch && dateMatch[1]) {
    const dateParts = dateMatch[1].split('/');
    if (dateParts.length === 3) {
      analysisDate = new Date(
        `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
      );
      console.log('Parser: Analysis date found:', analysisDate.toISOString());
    }
  }
  if (!analysisDate) {
    console.error('Parser: Could not extract analysis date.');
    throw new Error('Data recoltării nu a putut fi extrasă din PDF.');
  }

  // --- Step 2: Iterate through KNOWN analysis types and search ---
  console.log('--- Searching for known analysis types in text ---');
  // Fetch all known analysis types from the database (our library)
  const knownTypes = await prisma.analysisType.findMany();

  for (const analysisType of knownTypes) {
    const analysisName = analysisType.name;

    // Try to find the name in the text (case-insensitive)
    if (textContent.toLowerCase().includes(analysisName.toLowerCase())) {
      console.log(`Parser: Found name "${analysisName}" in text.`);

      // Try to extract the numeric value appearing AFTER the name
      const numericValue = extractValueAfterName(textContent, analysisName);
      // Try to extract text value appearing AFTER the name
      const stringValue = extractTextValueAfterName(textContent, analysisName);

      if (numericValue !== null) {
        console.log(
          `--> Associated numeric value ${numericValue} with ${analysisName}`
        );
        resultsToSave.push({
          userId: userId,
          analysisTypeId: analysisType.id,
          date: analysisDate,
          value: numericValue,
          stringValue: null,
          notes: null,
        });
      } else if (stringValue !== null) {
        console.log(
          `--> Associated text value "${stringValue}" with ${analysisName}`
        );
        resultsToSave.push({
          userId: userId,
          analysisTypeId: analysisType.id,
          date: analysisDate,
          value: null,
          stringValue: stringValue,
          notes: null,
        });
      } else {
        console.log(
          `Parser: Found name "${analysisName}" but couldn't extract value nearby.`
        );
      }
    }
  }

  console.log(
    `--- Parsing finished. ${resultsToSave.length} results collected. ---`
  );
  return resultsToSave;
};
