import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Normalize text for better matching (OCR-friendly)
const normalizeText = (text) => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[oO0]/g, 'o') // Normalizează O și 0
    .replace(/[iI1l|]/g, 'i') // Normalizează i, I, 1, l, |
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/[^\w\s{}()\-]/g, '') // Remove special chars except {}()-
    .toLowerCase()
    .trim();
};

// Helper to check if a match is a whole word (not part of another word)
const isWholeWordMatch = (text, index, word) => {
  const before = index > 0 ? text[index - 1] : ' ';
  const after =
    index + word.length < text.length ? text[index + word.length] : ' ';

  // Check if surrounded by word boundaries
  const wordBoundary = /[^a-zA-Z0-9]/;
  return wordBoundary.test(before) && wordBoundary.test(after);
};

// Extract numeric value after a name - FIXED VERSION
const extractValueAfterName = (textBlock, analysisName, startIndex) => {
  try {
    // Look for numbers in the text
    const searchArea = textBlock.substring(startIndex, startIndex + 400);

    // Split into lines - don't filter empty lines yet
    const rawLines = searchArea.split('\n');
    const lines = rawLines.map((l) => l.trim());

    // DEBUG: Show what lines we're analyzing
    const shouldDebug =
      analysisName.includes('Bilirubina directa') ||
      analysisName.includes('Fier seric') ||
      analysisName.includes('Feritina') ||
      analysisName.includes('HEM}') ||
      analysisName.includes('CHEM}') ||
      analysisName.includes('RET-He') ||
      analysisName.includes('reticulocitare') ||
      analysisName.includes('anti-transglutaminaza') ||
      analysisName.includes('transglutaminază');

    if (shouldDebug) {
      console.log(`  [DEBUG] Raw lines after "${analysisName}":`);
      lines.slice(0, 10).forEach((line, idx) => {
        console.log(`    ${idx}: "${line}" (length: ${line.length})`);
      });
    }

    // Synevo format is typically:
    // Line 0: (empty or rest of analysis name)
    // Line 1-3: "LT" or method info
    // Line 4-5: VALUE on one line
    // Line 6: UNIT and REFERENCE on same or next line

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines
      if (line.length === 0) continue;

      // Skip lines that are clearly metadata
      if (line.toLowerCase().includes('metoda')) continue;
      if (line.match(/^(LT|LC)\s*$/)) continue; // Lab code
      if (line === '*') continue;
      if (line.toLowerCase().includes('ser /')) continue;
      if (line.toLowerCase().includes('sange')) continue;
      if (line.toLowerCase().includes('urina')) continue;
      if (line.match(/\d{2}\/\d{2}\/\d{4}/)) continue; // Dates
      if (line.toLowerCase().includes('pagina')) continue;
      if (line.match(/^\d{4}\s+\d{3}\s+\d{3}$/)) continue; // Phone numbers like "0256 200 039"

      // Look for a line with numbers
      // IMPROVED: Also match numbers that might be stuck to text like "pg/cell27"
      const valueRegex = /(\d+(?:[.,]\d+)?)/g;
      const numbersInLine = [];
      let match;

      while ((match = valueRegex.exec(line)) !== null) {
        const value = parseFloat(match[1].replace(',', '.'));

        // Skip years
        if (value >= 1900 && value <= 2100) continue;

        numbersInLine.push({
          value: value,
          position: match.index,
          fullMatch: match[0],
        });
      }

      if (numbersInLine.length === 0) continue;

      // DEBUG
      if (shouldDebug) {
        console.log(`  [DEBUG] Line ${i} with numbers: "${line}"`);
        console.log(
          `  [DEBUG] Numbers found:`,
          numbersInLine.map((n) => n.value)
        );
      }

      // Check if line contains a range (dash between two numbers)
      // IMPROVED: Handle ranges with no spaces like "27-32" or "pg/cell27 - 32"
      const hasRange = line.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)/);

      // FIXED: Better detection of value vs reference range
      if (hasRange && numbersInLine.length >= 3) {
        // Extract the two numbers that form the range
        const rangeMatch = line.match(
          /(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)/
        );
        if (rangeMatch) {
          const rangeMin = parseFloat(rangeMatch[1].replace(',', '.'));
          const rangeMax = parseFloat(rangeMatch[2].replace(',', '.'));

          // Find which number in our list is NOT part of the range
          const valueNumber = numbersInLine.find(
            (n) =>
              Math.abs(n.value - rangeMin) > 0.01 &&
              Math.abs(n.value - rangeMax) > 0.01
          );

          if (valueNumber) {
            if (shouldDebug) {
              console.log(
                `  [DEBUG] Found value separate from range (${rangeMin}-${rangeMax}): ${valueNumber.value}`
              );
            }
            return valueNumber.value;
          }
        }

        // Fallback: return first number
        if (shouldDebug) {
          console.log(
            `  [DEBUG] Detected range with 3+ numbers, returning first: ${numbersInLine[0].value}`
          );
        }
        return numbersInLine[0].value;
      }

      // Check if this line is just the reference range (2 numbers with dash)
      if (numbersInLine.length === 2 && hasRange) {
        // This is just "MIN - MAX", skip to next line
        if (shouldDebug) {
          console.log(
            `  [DEBUG] This is just reference range (2 numbers with dash), skipping...`
          );
        }
        continue;
      }

      // Single number or number with operator
      if (numbersInLine.length === 1) {
        // Check if it has an operator like ≤, <, >, ≥
        if (line.match(/[<>≤≥]/)) {
          // This might be a reference value like "≤ 0.3" or "<20 Negativ"
          // Check the NEXT line for the actual value
          if (shouldDebug) {
            console.log(
              `  [DEBUG] Found operator, might be reference. Checking next line...`
            );
          }

          // Look at next non-empty lines for the actual value
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextLine = lines[j];
            if (nextLine.length === 0) continue;

            // Skip lines that also have comparison operators (they're also reference values)
            if (nextLine.match(/[<>≤≥]/)) continue;

            // Skip lines with "Negativ" or "Pozitiv" (test result indicators, not values)
            if (nextLine.match(/negativ|pozitiv/i)) continue;

            const nextLineNumbers = [];
            const nextRegex = /(\d+(?:[.,]\d+)?)/g;
            let nextMatch;
            while ((nextMatch = nextRegex.exec(nextLine)) !== null) {
              const val = parseFloat(nextMatch[1].replace(',', '.'));
              if (val < 1900 || val > 2100) {
                nextLineNumbers.push(val);
              }
            }

            if (nextLineNumbers.length > 0) {
              if (shouldDebug) {
                console.log(
                  `  [DEBUG] Found number on next line: ${nextLineNumbers[0]}`
                );
              }
              return nextLineNumbers[0];
            }
          }

          // If we found an operator but no valid number in next lines, skip this line entirely
          if (shouldDebug) {
            console.log(
              `  [DEBUG] Found operator but no valid value in next lines, skipping...`
            );
          }
          continue;
        }

        // Single standalone number (no operator) - this is likely the patient value
        if (shouldDebug) {
          console.log(
            `  [DEBUG] Single number, returning: ${numbersInLine[0].value}`
          );
        }
        return numbersInLine[0].value;
      }

      // Multiple numbers without range - return first one
      if (numbersInLine.length > 1 && !hasRange) {
        if (shouldDebug) {
          console.log(
            `  [DEBUG] Multiple numbers without range (${numbersInLine.length}), returning first: ${numbersInLine[0].value}`
          );
        }
        return numbersInLine[0].value;
      }
    }

    return null;
  } catch (e) {
    console.error(`Error extracting value for ${analysisName}:`, e);
    return null;
  }
};

// Extract text value (Pozitiv/Negativ/etc)
const extractTextValueAfterName = (textBlock, analysisName, startIndex) => {
  try {
    const searchArea = textBlock.substring(startIndex, startIndex + 150);
    const valueRegex =
      /(Pozitiv|Negativ|Reactiv|Nedecelabil|Normal|Prezente|Absente|pozitiv|negativ|reactiv|nedecelabil|normal|prezente|absente)/i;
    const valueMatch = searchArea.match(valueRegex);

    if (valueMatch && valueMatch[0]) {
      return (
        valueMatch[0].charAt(0).toUpperCase() +
        valueMatch[0].slice(1).toLowerCase()
      );
    }
    return null;
  } catch (e) {
    console.error(`Error extracting text value for ${analysisName}:`, e);
    return null;
  }
};

// Parse analysis blocks
const parseAnalysisBlock = (block, knownTypes, userId, analysisDate) => {
  const results = [];
  const foundAnalyses = new Set(); // Track what we've already found

  // Split into lines
  const lines = block.split('\n').filter((line) => line.trim().length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = normalizeText(line);

    // Skip lines that are test description headers (contain multiple test names)
    // These usually have patterns like "Hemograma cu form. leucocitara, Hb,Ht,indici si reticulocite"
    if (
      normalizedLine.includes('hemograma') ||
      normalizedLine.includes('cu form') ||
      (normalizedLine.includes('indici') && normalizedLine.includes('si'))
    ) {
      continue;
    }

    // Try to match against known analysis types
    for (const analysisType of knownTypes) {
      const normalizedTypeName = normalizeText(analysisType.name);

      // Special handling for multi-line names like "Echivalent al hemoglobinei reticulocitare (RET-He)"
      // which appears in PDF as two lines
      let matchIndex = -1;
      let usedShortName = false;

      if (analysisType.name.includes('RET-He')) {
        // Try matching without the parenthetical part first
        const nameWithoutParens = analysisType.name
          .replace(/\s*\([^)]+\)\s*$/, '')
          .trim();
        const normalizedWithoutParens = normalizeText(nameWithoutParens);
        matchIndex = normalizedLine.indexOf(normalizedWithoutParens);

        if (matchIndex !== -1) {
          console.log(
            `  [RET-He] Matched without parentheses: "${nameWithoutParens}"`
          );
          usedShortName = true;
        }
      }

      // Normal matching
      if (matchIndex === -1) {
        matchIndex = normalizedLine.indexOf(normalizedTypeName);
      }

      // Check if line contains the analysis name
      if (matchIndex !== -1) {
        // Verify it's a whole word match (not part of another word)
        // This prevents "INR" matching in "Inregistrat"
        const nameToCheck =
          usedShortName && analysisType.name.includes('RET-He')
            ? normalizeText(
                analysisType.name.replace(/\s*\([^)]+\)\s*$/, '').trim()
              )
            : normalizedTypeName;

        if (!isWholeWordMatch(normalizedLine, matchIndex, nameToCheck)) {
          continue;
        }

        // Skip lines that are ONLY a single word (like just "reticulocite") with nothing else
        // BUT only if it's NOT the complete analysis name
        // This filters headers like "reticulocite" that appear in test descriptions
        // while keeping valid single-word analyses like "Neutrofil", "Limfocit", etc.
        const trimmedLine = line.trim();
        const normalizedTrimmedLine = normalizeText(trimmedLine);

        // Check if this line is ONLY a partial match (not the full analysis name)
        if (
          normalizedTrimmedLine !== normalizedTypeName &&
          normalizedTrimmedLine.split(/\s+/).length === 1
        ) {
          // Line is a single word but not the complete analysis name - skip it
          console.log(
            `  [SKIP] Line is partial match, not complete name: "${trimmedLine}"`
          );
          continue;
        }

        // Additional check: Skip lines that are lowercase versions of the analysis name
        // These are typically from headers/descriptions, not actual results
        // Real analysis names in Synevo reports start with capital letters
        // EXCEPTION: Skip this check for names starting with * or special characters
        if (
          trimmedLine.length > 0 &&
          !trimmedLine.startsWith('*') &&
          !trimmedLine.startsWith('>') &&
          !trimmedLine.startsWith('<') &&
          trimmedLine[0] === trimmedLine[0].toLowerCase() &&
          normalizedTrimmedLine === normalizedTypeName
        ) {
          console.log(
            `  [SKIP] Line is lowercase version (header): "${trimmedLine}"`
          );
          continue;
        }

        // Create unique key to avoid duplicates
        const uniqueKey = `${analysisType.id}-${i}`;

        // Skip if we've already processed this analysis on this line
        if (foundAnalyses.has(uniqueKey)) {
          continue;
        }

        console.log(
          `Parser: Found match for "${
            analysisType.name
          }" in line: "${line.substring(0, 80)}..."`
        );

        // Extra debug for Reticulocite to find false matches
        if (analysisType.name === 'Reticulocite') {
          console.log(`  [Reticulocite DEBUG] Full line: "${line}"`);
        }

        // Look for value in current line and next 5-6 lines (Synevo format has values far below)
        const searchText = lines
          .slice(i, Math.min(i + 7, lines.length))
          .join('\n');

        // SPECIAL DEBUG for HEM and RET-He
        const shouldDebugAnalysis =
          analysisType.name.includes('HEM}') ||
          analysisType.name.includes('CHEM}') ||
          analysisType.name.includes('RET-He') ||
          analysisType.name.includes('reticulocitare');

        if (shouldDebugAnalysis) {
          console.log(`  [${analysisType.name} DEBUG] Full line: "${line}"`);
          console.log(
            `  [${
              analysisType.name
            } DEBUG] Search text (first 300 chars): "${searchText.substring(
              0,
              300
            )}"`
          );
        }

        // Find the analysis name in the original line
        // Since we matched using normalized text, we need to find where it actually is in the original line
        // The issue is that the line might have extra spaces, so indexOf won't work
        // Instead, we'll search for the normalized version and calculate the position

        // For RET-He, use the short name without parentheses
        const nameForExtraction = usedShortName
          ? analysisType.name.replace(/\s*\([^)]+\)\s*$/, '').trim()
          : analysisType.name;

        const normalizedAnalysisName = normalizeText(nameForExtraction);
        const normalizedLineText = normalizeText(line);
        const normalizedIndex = normalizedLineText.indexOf(
          normalizedAnalysisName
        );

        if (shouldDebugAnalysis) {
          console.log(
            `  [${analysisType.name} DEBUG] normalizedIndex: ${normalizedIndex}`
          );
          console.log(
            `  [${analysisType.name} DEBUG] nameForExtraction: "${nameForExtraction}"`
          );
          console.log(
            `  [${analysisType.name} DEBUG] analysisType.name: "${analysisType.name}"`
          );
          console.log(`  [${analysisType.name} DEBUG] line: "${line}"`);
        }

        if (normalizedIndex !== -1) {
          // Since we found it in normalized text, we know it's there
          // For extraction, we'll just use the whole line after the analysis name
          // We can approximate by using the normalized match position
          // Try to extract value from the REST of the current line first
          // Since spacing might be different, we'll search for the value on the same line
          // by looking after the analysis name appears
          const restOfLine = line.substring(
            normalizedIndex + nameForExtraction.length
          );

          if (shouldDebugAnalysis) {
            console.log(
              `  [${analysisType.name} DEBUG] Rest of line: "${restOfLine}"`
            );
            console.log(
              `  [${analysisType.name} DEBUG] Calling extractValueAfterName on rest of line...`
            );
          }

          let numericValue = extractValueAfterName(
            restOfLine,
            analysisType.name,
            0
          );

          if (shouldDebugAnalysis) {
            console.log(
              `  [${analysisType.name} DEBUG] Result from rest of line: ${numericValue}`
            );
          }

          let stringValue = null;

          // If not found in current line, search in next lines
          if (numericValue === null) {
            // Search in the combined text of next lines
            const nextLinesText = lines
              .slice(i + 1, Math.min(i + 7, lines.length))
              .join('\n');

            if (shouldDebugAnalysis) {
              console.log(
                `  [${analysisType.name} DEBUG] Searching in next lines...`
              );
              console.log(
                `  [${
                  analysisType.name
                } DEBUG] Next lines text: "${nextLinesText.substring(0, 200)}"`
              );
            }

            numericValue = extractValueAfterName(
              nextLinesText,
              analysisType.name,
              0
            );

            if (shouldDebugAnalysis) {
              console.log(
                `  [${analysisType.name} DEBUG] Result from next lines: ${numericValue}`
              );
            }
          }

          // Try text value if no numeric value
          if (numericValue === null) {
            const nextLinesText = lines
              .slice(i + 1, Math.min(i + 7, lines.length))
              .join('\n');
            stringValue = extractTextValueAfterName(
              nextLinesText,
              analysisType.name,
              0
            );
          }

          if (numericValue !== null) {
            console.log(`  --> Extracted numeric value: ${numericValue}`);

            const isPercentLikeAnalysis =
              analysisType.name.includes('%') ||
              analysisType.name.includes('Fractia reticulocitelor imature');

            // Guardrail + recovery for OCR noise: percent-like analyses should not exceed 100.
            // If they do, try decimal-shift recovery (e.g. 155 -> 15.5 or 1.55).
            if (isPercentLikeAnalysis && numericValue > 100) {
              const candidates = [numericValue / 10, numericValue / 100].filter(
                (v) => v > 0 && v <= 100
              );

              const scoreByReference = (value) => {
                const min = analysisType.refMin;
                const max = analysisType.refMax;

                if (min == null || max == null) {
                  return -Math.abs(value - 50); // weak fallback if no reference exists
                }

                if (value >= min && value <= max) {
                  return 100;
                }

                const distToMin = Math.abs(value - min);
                const distToMax = Math.abs(value - max);
                return -Math.min(distToMin, distToMax);
              };

              if (candidates.length > 0) {
                candidates.sort((a, b) => scoreByReference(b) - scoreByReference(a));
                const corrected = candidates[0];
                console.log(
                  `  --> Corrected percent-like OCR value ${numericValue} -> ${corrected}`
                );
                numericValue = corrected;
              } else {
                console.log(
                  `  --> Skipping impossible percent-like value (>100): ${numericValue}`
                );
                continue;
              }
            }

            const existingResultSameType = results.find(
              (r) => r.analysisTypeId === analysisType.id && r.value !== null
            );

            // For % analyses OCR often captures both percentage and absolute count under same label.
            // Keep only one value and prefer the larger one (usually the real percentage).
            if (
              isPercentLikeAnalysis &&
              existingResultSameType &&
              existingResultSameType.value !== numericValue
            ) {
              if (numericValue > existingResultSameType.value) {
                console.log(
                  `  --> Replacing previous % value ${existingResultSameType.value} with ${numericValue}`
                );
                existingResultSameType.value = numericValue;
              } else {
                console.log(
                  `  --> Skipping secondary % candidate (likely absolute value): ${numericValue}`
                );
              }
              foundAnalyses.add(uniqueKey);
              continue;
            }

            // Check if we already have this analysis with the same value (avoid duplicates within same section)
            const isDuplicate = results.some(
              (r) =>
                r.analysisTypeId === analysisType.id && r.value === numericValue
            );

            if (!isDuplicate) {
              results.push({
                userId: userId,
                analysisTypeId: analysisType.id,
                date: analysisDate,
                value: numericValue,
                stringValue: null,
                notes: null,
              });
              foundAnalyses.add(uniqueKey);
            } else {
              console.log(`  --> Skipping duplicate value`);
            }
          } else if (stringValue !== null) {
            console.log(`  --> Extracted text value: "${stringValue}"`);
            results.push({
              userId: userId,
              analysisTypeId: analysisType.id,
              date: analysisDate,
              value: null,
              stringValue: stringValue,
              notes: null,
            });
            foundAnalyses.add(uniqueKey);
          } else {
            console.log(`  --> Could not extract value`);
          }
        } else {
          // Could not find analysis name in line (shouldn't happen since we already matched)
          console.log(`  --> Could not locate analysis name in line`);
        }

        break; // Move to next line after finding first match
      }
    }
  }

  return results;
};

export const parseSynevoPdf = async (textContent, userId) => {
  console.log('--- Starting Synevo Specific Parsing ---');
  console.log(`Text content length: ${textContent.length} characters`);

  const resultsToSave = [];

  // --- Step 1: Extract Analysis Date ---
  let analysisDate = null;

  // Încercăm mai multe pattern-uri de dată
  const datePatterns = [
    /Data recoltarii:[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
    /Data\s+recoltarii[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
    /recoltarii[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
    /Data[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
    // Pentru OCR - caută orice dată în format dd/mm/yyyy
    /(\d{2}\/\d{2}\/\d{4})/,
  ];

  for (const pattern of datePatterns) {
    const dateMatch = textContent.match(pattern);
    if (dateMatch && dateMatch[1]) {
      const dateParts = dateMatch[1].split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const year = parseInt(dateParts[2]);

        // Validare dată
        if (
          day >= 1 &&
          day <= 31 &&
          month >= 1 &&
          month <= 12 &&
          year >= 2000 &&
          year <= 2030
        ) {
          analysisDate = new Date(
            `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
              2,
              '0'
            )}`
          );
          console.log(
            'Parser: Analysis date found:',
            analysisDate.toISOString()
          );
          break;
        }
      }
    }
  }

  if (!analysisDate) {
    console.error('Parser: Could not extract analysis date.');
    // În loc să arunci eroare, folosește data curentă ca fallback pentru OCR
    analysisDate = new Date();
    console.warn(
      'Parser: Using current date as fallback for OCR:',
      analysisDate.toISOString()
    );
  }

  // --- Step 2: Fetch all known analysis types ---
  console.log('--- Fetching known analysis types from database ---');
  const knownTypes = await prisma.analysisType.findMany();
  console.log(`Found ${knownTypes.length} known analysis types in database`);

  if (knownTypes.length === 0) {
    console.warn('WARNING: No analysis types found in database!');
    return resultsToSave;
  }

  // Log first few for debugging
  console.log(
    'Sample analysis types:',
    knownTypes.slice(0, 5).map((t) => t.displayName || t.name)
  );

  // Check if RET-He exists
  const retHeType = knownTypes.find(
    (t) =>
      t.name.includes('RET-He') ||
      t.name.includes('reticulocitare') ||
      t.displayName?.includes('RET-He')
  );
  if (retHeType) {
    console.log('Found RET-He in database:', retHeType.name);
  } else {
    console.log('WARNING: RET-He NOT found in database!');
  }

  // --- Step 3: Split document into sections ---
  const sections = textContent.split(
    /(?=Biochimie|Hematologie|Imunologie|Imunochimie|Urina)/
  );

  console.log(`--- Document split into ${sections.length} sections ---`);

  // --- Step 4: Process each section ---
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    console.log(
      `\n--- Processing section ${sectionIndex + 1} (${section
        .substring(0, 50)
        .replace(/\n/g, ' ')}...) ---`
    );

    const sectionResults = parseAnalysisBlock(
      section,
      knownTypes,
      userId,
      analysisDate
    );
    resultsToSave.push(...sectionResults);
  }

  console.log(
    `\n--- Parsing finished. ${resultsToSave.length} results collected. ---`
  );

  // Log what was found
  if (resultsToSave.length > 0) {
    console.log('Results summary:');
    resultsToSave.forEach((result, idx) => {
      const type = knownTypes.find((t) => t.id === result.analysisTypeId);
      console.log(
        `  ${idx + 1}. ${type?.displayName || type?.name}: ${
          result.value || result.stringValue
        }`
      );
    });
  } else {
    console.warn('WARNING: No results were extracted from the PDF!');
  }

  // Debug: Show which analysis types from DB were NOT found in the PDF
  const foundIds = new Set(resultsToSave.map((r) => r.analysisTypeId));
  const notFound = knownTypes.filter((t) => !foundIds.has(t.id));

  if (notFound.length > 0 && notFound.length < 30) {
    console.log('\n--- Analysis types in DB but NOT found in PDF ---');
    notFound.forEach((t) => {
      console.log(`  - ${t.displayName || t.name}`);
    });
  }

  return resultsToSave;
};
