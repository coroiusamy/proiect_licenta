import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Normalize text for better matching
const normalizeText = (text) => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
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

    // Split into lines
    const rawLines = searchArea.split('\n');
    const lines = rawLines.map((l) => l.trim());

    // DEBUG
    const shouldDebug =
      analysisName.includes('Bilirubina directa') ||
      analysisName.includes('Fier seric') ||
      analysisName.includes('HEM}') ||
      analysisName.includes('CHEM}') ||
      analysisName.includes('RET-He') ||
      analysisName.includes('reticulocitare') ||
      analysisName.includes('anti-transglutaminaza') ||
      analysisName.includes('transglutaminază') ||
      analysisName.includes('CRP') ||
      analysisName.includes('Proteina C') ||
      analysisName.includes('ALT') ||
      analysisName.includes('AST') ||
      analysisName.includes('GGT');

    if (shouldDebug) {
      console.log(`  [DEBUG] Raw lines after "${analysisName}":`);
      lines.slice(0, 10).forEach((line, idx) => {
        console.log(`    ${idx}: "${line}" (length: ${line.length})`);
      });
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines
      if (line.length === 0) continue;

      // Skip lines that are clearly metadata
      if (line.toLowerCase().includes('metoda')) continue;
      if (line.match(/^(LT|LC)\s*$/)) continue;
      if (line === '*') continue;
      if (line.toLowerCase().includes('ser /')) continue;
      if (line.toLowerCase().includes('sange')) continue;
      if (line.toLowerCase().includes('urina')) continue;
      if (line.match(/\d{2}\/\d{2}\/\d{4}/)) continue;
      if (line.toLowerCase().includes('pagina')) continue;
      if (line.match(/^\d{4}\s+\d{3}\s+\d{3}$/)) continue;

      // Look for numbers in line
      const valueRegex = /(\d+(?:[.,]\d+)?)/g;
      const numbersInLine = [];
      let match;

      while ((match = valueRegex.exec(line)) !== null) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (value >= 1900 && value <= 2100) continue; // Skip years
        numbersInLine.push({
          value: value,
          position: match.index,
          fullMatch: match[0],
        });
      }

      if (numbersInLine.length === 0) continue;

      if (shouldDebug) {
        console.log(`  [DEBUG] Line ${i} with numbers: "${line}"`);
        console.log(
          `  [DEBUG] Numbers found:`,
          numbersInLine.map((n) => n.value)
        );
      }

      // Check if line contains a range
      const hasRange = line.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)/);

      // IMPROVED: If line has range with 3+ numbers, first number is likely patient value
      if (hasRange && numbersInLine.length >= 3) {
        const rangeMatch = line.match(
          /(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)/
        );
        if (rangeMatch) {
          const rangeMin = parseFloat(rangeMatch[1].replace(',', '.'));
          const rangeMax = parseFloat(rangeMatch[2].replace(',', '.'));

          const valueNumber = numbersInLine.find(
            (n) =>
              Math.abs(n.value - rangeMin) > 0.01 &&
              Math.abs(n.value - rangeMax) > 0.01
          );

          if (valueNumber) {
            if (shouldDebug) {
              console.log(
                `  [DEBUG] Found value separate from range: ${valueNumber.value}`
              );
            }
            return valueNumber.value;
          }
        }

        if (shouldDebug) {
          console.log(
            `  [DEBUG] Returning first number: ${numbersInLine[0].value}`
          );
        }
        return numbersInLine[0].value;
      }

      // If line is just reference range (2 numbers with dash), skip
      if (numbersInLine.length === 2 && hasRange) {
        if (shouldDebug) {
          console.log(`  [DEBUG] Just reference range, skipping...`);
        }
        continue;
      }

      // CRITICAL FIX: Lines with operators AND units are reference ranges
      // Pattern: "< 50 U/L" or "< 0.5 mg/dL" = reference
      // Pattern: "< 0.3" (no unit) = patient value
      const hasOperator = line.match(/([<>≤≥])\s*(\d+(?:[.,]\d+)?)/);
      const hasUnit = line.match(/(mg|g|U|µg|μg|mL|dL|fL|pg|%|mii|mil)/i);

      if (numbersInLine.length === 1) {
        if (hasOperator) {
          const operatorValue = parseFloat(hasOperator[2].replace(',', '.'));

          // If it has a unit, it's a REFERENCE value, skip to next line for patient value
          if (hasUnit) {
            if (shouldDebug) {
              console.log(
                `  [DEBUG] Operator + unit = reference range, checking next lines...`
              );
            }

            // Look for patient value in next lines
            for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
              const nextLine = lines[j];
              if (nextLine.length === 0) continue;

              // Skip lines with units (those are also reference values)
              if (
                nextLine.match(
                  /(mg|g|U|µg|μg|mL|dL|fL|pg|%|mii|mil)\/|Negativ|Pozitiv/i
                )
              ) {
                continue;
              }

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
                    `  [DEBUG] Found patient value on next line: ${nextLineNumbers[0]}`
                  );
                }
                return nextLineNumbers[0];
              }
            }

            // No patient value found in next lines, skip this entirely
            if (shouldDebug) {
              console.log(`  [DEBUG] No patient value found, skipping...`);
            }
            continue;
          } else {
            // Operator but NO unit = this IS the patient value
            if (shouldDebug) {
              console.log(
                `  [DEBUG] Operator without unit = patient value: ${operatorValue}`
              );
            }
            return operatorValue;
          }
        }

        // Single number, no operator
        if (shouldDebug) {
          console.log(`  [DEBUG] Single number: ${numbersInLine[0].value}`);
        }
        return numbersInLine[0].value;
      }

      // Multiple numbers without range
      if (numbersInLine.length > 1 && !hasRange) {
        if (shouldDebug) {
          console.log(
            `  [DEBUG] Multiple numbers, returning first: ${numbersInLine[0].value}`
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
  const foundAnalyses = new Set();

  const lines = block.split('\n').filter((line) => line.trim().length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = normalizeText(line);

    // Skip test description headers
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

      let matchIndex = -1;
      let usedShortName = false;

      // Try matching without parentheses for names with parentheses
      if (analysisType.name.includes('(') && analysisType.name.includes(')')) {
        const nameWithoutParens = analysisType.name
          .replace(/\s*\([^)]+\)\s*$/, '')
          .trim();
        const normalizedWithoutParens = normalizeText(nameWithoutParens);
        matchIndex = normalizedLine.indexOf(normalizedWithoutParens);

        if (matchIndex !== -1) {
          usedShortName = true;
        }
      }

      // Normal matching
      if (matchIndex === -1) {
        matchIndex = normalizedLine.indexOf(normalizedTypeName);
      }

      if (matchIndex !== -1) {
        // Verify whole word match
        const nameToCheck =
          usedShortName && analysisType.name.includes('(')
            ? normalizeText(
                analysisType.name.replace(/\s*\([^)]+\)\s*$/, '').trim()
              )
            : normalizedTypeName;

        if (!isWholeWordMatch(normalizedLine, matchIndex, nameToCheck)) {
          continue;
        }

        // Skip partial matches (single word that's not the complete name)
        const trimmedLine = line.trim();
        const normalizedTrimmedLine = normalizeText(trimmedLine);

        if (
          normalizedTrimmedLine !== normalizedTypeName &&
          normalizedTrimmedLine.split(/\s+/).length === 1
        ) {
          continue;
        }

        // Skip lowercase versions (headers)
        if (
          trimmedLine.length > 0 &&
          !trimmedLine.startsWith('*') &&
          !trimmedLine.startsWith('>') &&
          !trimmedLine.startsWith('<') &&
          trimmedLine[0] === trimmedLine[0].toLowerCase() &&
          normalizedTrimmedLine === normalizedTypeName
        ) {
          console.log(`  [SKIP] Lowercase header: "${trimmedLine}"`);
          continue;
        }

        // IMPORTANT: Skip matches in narrative/comment sections
        // These are descriptive text, not actual test results
        const previousLine = i > 0 ? lines[i - 1].trim().toLowerCase() : '';
        const isInNarrativeSection =
          previousLine.includes('comentariu') ||
          previousLine.includes('seria') ||
          previousLine.includes('aspect') ||
          line.toLowerCase().includes('seria') ||
          line.toLowerCase().includes('aspect normal') ||
          line.toLowerCase().includes('prezente hematii') ||
          line.toLowerCase().includes('colorat');

        if (isInNarrativeSection) {
          console.log(
            `  [SKIP] In narrative section: "${line.substring(0, 60)}"`
          );
          continue;
        }

        const uniqueKey = `${analysisType.id}-${i}`;

        if (foundAnalyses.has(uniqueKey)) {
          continue;
        }

        console.log(
          `Parser: Found match for "${
            analysisType.name
          }" in line: "${line.substring(0, 80)}..."`
        );

        const nameForExtraction = usedShortName
          ? analysisType.name.replace(/\s*\([^)]+\)\s*$/, '').trim()
          : analysisType.name;

        const normalizedAnalysisName = normalizeText(nameForExtraction);
        const normalizedLineText = normalizeText(line);
        const normalizedIndex = normalizedLineText.indexOf(
          normalizedAnalysisName
        );

        if (normalizedIndex !== -1) {
          const restOfLine = line.substring(
            normalizedIndex + nameForExtraction.length
          );

          let numericValue = extractValueAfterName(
            restOfLine,
            analysisType.name,
            0
          );

          let stringValue = null;

          // If not found in current line, search next lines
          if (numericValue === null) {
            const nextLinesText = lines
              .slice(i + 1, Math.min(i + 7, lines.length))
              .join('\n');

            numericValue = extractValueAfterName(
              nextLinesText,
              analysisType.name,
              0
            );
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

            // Check for duplicates
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
        }

        break;
      }
    }
  }

  return results;
};

export const parseSynevoPdf = async (textContent, userId) => {
  console.log('--- Starting Synevo Specific Parsing ---');
  console.log(`Text content length: ${textContent.length} characters`);

  const resultsToSave = [];

  // Extract Analysis Date
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

  // Fetch all known analysis types
  console.log('--- Fetching known analysis types from database ---');
  const knownTypes = await prisma.analysisType.findMany();
  console.log(`Found ${knownTypes.length} known analysis types in database`);

  if (knownTypes.length === 0) {
    console.warn('WARNING: No analysis types found in database!');
    return resultsToSave;
  }

  console.log(
    'Sample analysis types:',
    knownTypes.slice(0, 5).map((t) => t.displayName || t.name)
  );

  // Split document into sections
  const sections = textContent.split(
    /(?=Biochimie|Hematologie|Imunologie|Imunochimie|Urina)/
  );

  console.log(`--- Document split into ${sections.length} sections ---`);

  // Process each section
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

  // Log results summary
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

  return resultsToSave;
};
