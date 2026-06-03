import { PrismaClient } from '@prisma/client';
import { Ollama } from 'ollama';

const prisma = new PrismaClient();
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
const AI_MODEL = process.env.AI_MODEL || 'doctor-llama';

// Helper to normalize text for comparison
const normalizeForMatching = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // keep only alphanumeric
    .trim();
};

// Map typical aliases to DB analysis type keywords
const getAliases = (normalizedName) => {
  const list = [];
  if (
    normalizedName.includes('alt') ||
    normalizedName.includes('gpt') ||
    normalizedName.includes('tgp') ||
    normalizedName.includes('alanin')
  ) {
    list.push('alanina', 'alt', 'tgp', 'gpt');
  }
  if (
    normalizedName.includes('ast') ||
    normalizedName.includes('got') ||
    normalizedName.includes('tgo') ||
    normalizedName.includes('aspartat')
  ) {
    list.push('aspartat', 'ast', 'tgo', 'got');
  }
  if (normalizedName.includes('glucoza') || normalizedName.includes('glicemie')) {
    list.push('glicemie', 'glucoza');
  }
  if (normalizedName.includes('creatinina')) {
    list.push('creatinina');
  }
  if (normalizedName.includes('uree') || normalizedName.includes('urea')) {
    list.push('uree', 'urea');
  }
  if (normalizedName.includes('colesterol')) {
    if (normalizedName.includes('hdl')) list.push('hdl');
    else if (normalizedName.includes('ldl')) list.push('ldl');
    else list.push('colesterol');
  }
  if (
    normalizedName.includes('vsh') ||
    normalizedName.includes('viteza') ||
    normalizedName.includes('sedimentare')
  ) {
    list.push('vsh', 'sedimentare');
  }
  if (
    normalizedName.includes('crp') ||
    (normalizedName.includes('proteina') && normalizedName.includes('reactiva'))
  ) {
    list.push('crp', 'reactiva');
  }
  if (normalizedName.includes('calciu')) {
    list.push('calciu');
  }
  if (normalizedName.includes('magneziu')) {
    list.push('magneziu');
  }
  if (normalizedName.includes('tsh')) {
    list.push('tsh');
  }
  if (normalizedName.includes('vitamina d') || normalizedName.includes('25oh')) {
    list.push('vitamina d', '25oh');
  }
  return list;
};

// Match scanned/extracted analysis name to database types
const matchAnalysisType = (scannedName, scannedUnit, dbTypes) => {
  const normName = normalizeForMatching(scannedName);
  const normUnit = (scannedUnit || '').toLowerCase().replace(/\s+/g, '');

  if (!normName) return null;

  let candidates = dbTypes.map((type) => {
    const dbName = normalizeForMatching(type.name);
    const dbDisplay = type.displayName ? normalizeForMatching(type.displayName) : '';
    const dbUnit = type.unit.toLowerCase().replace(/\s+/g, '');

    let score = 0;

    // Exact matches get highest priority
    if (dbName === normName || dbDisplay === normName) {
      score += 100;
    } else if (dbName.includes(normName) || normName.includes(dbName)) {
      score += 50;
    } else if (dbDisplay && (dbDisplay.includes(normName) || normName.includes(dbDisplay))) {
      score += 50;
    }

    // Check alias mapping
    if (score === 0) {
      const aliases = getAliases(normName);
      for (const alias of aliases) {
        if (dbName.includes(alias) || dbDisplay.includes(alias)) {
          score += 40;
          break;
        }
      }
    }

    // Check units alignment
    if (score > 0) {
      if (dbUnit === normUnit) {
        score += 20;
      } else if (normUnit && (dbUnit.includes(normUnit) || normUnit.includes(dbUnit))) {
        score += 10;
      }
    }

    return { type, score };
  });

  // Filter out non-matching candidates and sort by score descending
  candidates = candidates.filter((c) => c.score > 0).sort((a, b) => b.score - a.score);

  if (candidates.length > 0 && candidates[0].score >= 40) {
    return candidates[0].type;
  }

  return null;
};

// Extract dates from text content using regex
const extractDate = (textContent) => {
  const datePatterns = [
    /Data recoltarii:[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
    /Data\s+recoltarii[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
    /recoltarii[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
    /Data[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
    /Data - ora recoltare:\s*(\d{2})\.(\d{2})\.(\d{4})/i,
    /Data recoltare:\s*(\d{2})\.(\d{2})\.(\d{4})/i,
    /recoltare:\s*(\d{2})\.(\d{2})\.(\d{4})/i,
    /(\d{2}\/\d{2}\/\d{4})/,
    /(\d{2})\.(\d{2})\.(\d{4})/,
  ];

  for (const pattern of datePatterns) {
    const match = textContent.match(pattern);
    if (match) {
      const dateStr = match[1] || match[0];
      const separator = dateStr.includes('/') ? '/' : '.';
      const parts = dateStr.split(separator);
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);

        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2030) {
          return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
      }
    }
  }
  return new Date(); // fallback to current date
};

export const parseLlmPdf = async (textContent, userId) => {
  console.log('🤖 [LLM Parser] Starting LLM Fallback Parsing...');
  console.log(`📄 OCR text length: ${textContent.length} characters`);

  const resultsToSave = [];

  // 1. Extract date using regex first
  const analysisDate = extractDate(textContent);
  console.log(`📅 [LLM Parser] Extracted date: ${analysisDate.toISOString()}`);

  // 2. Fetch known types from DB
  const knownTypes = await prisma.analysisType.findMany();
  console.log(`📋 [LLM Parser] Loaded ${knownTypes.length} analysis types from DB`);

  if (knownTypes.length === 0) {
    console.warn('⚠️ [LLM Parser] No analysis types in database.');
    return resultsToSave;
  }

  // 3. Define prompt for LLM parsing
  const prompt = `Analyze the following raw OCR text extracted from a medical analysis report.
Identify and extract all medical tests / laboratory analyses.
For each test, extract:
1. "name": The exact Romanian name of the test as it appears (e.g. "Glicemie", "Alaninaminotransferaza (ALT)", "Hemoglobina").
2. "value": The patient's result value. Must be a number (float). If the result is non-numeric (e.g., "Pozitiv", "Negativ"), set "value" to null and "stringValue" to that text.
3. "stringValue": Non-numeric result value (e.g. "Pozitiv", "Negativ") if applicable, otherwise null.
4. "refMin": The lower reference limit, as a number (float). Null if not specified or not applicable.
5. "refMax": The upper reference limit, as a number (float). Null if not specified or not applicable.
6. "unit": The unit of measurement (e.g., "mg/dL", "U/L", "mii/µL", "%").

Return the results ONLY as a JSON array of objects with these keys: name, value, stringValue, refMin, refMax, unit.
Do not include any extra explanation or text outside the JSON.

Raw OCR Text:
${textContent}`;

  try {
    const response = await ollama.chat({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      format: 'json',
      options: {
        temperature: 0.1,
      },
    });

    const content = response.message.content.trim();
    console.log('🤖 [LLM Parser] Received response from Ollama.');

    // Parse JSON
    let extractedList = [];
    try {
      extractedList = JSON.parse(content);
    } catch (parseError) {
      console.warn('⚠️ [LLM Parser] Direct JSON parsing failed. Attempting to clean the output...');
      // Fallback clean and parse
      let cleanContent = content;
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }
      const startIdx = cleanContent.indexOf('[');
      const endIdx = cleanContent.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanContent = cleanContent.substring(startIdx, endIdx + 1);
      }
      extractedList = JSON.parse(cleanContent);
    }

    console.log(`📋 [LLM Parser] Extracted ${extractedList.length} candidate items from LLM`);

    const foundAnalyses = new Set();

    for (const item of extractedList) {
      if (!item.name) continue;

      // Match item to database type
      const matchedType = matchAnalysisType(item.name, item.unit, knownTypes);
      if (!matchedType) {
        console.log(`❌ [LLM Parser] Could not match: "${item.name}" (unit: ${item.unit || 'none'})`);
        continue;
      }

      // Check duplicates
      if (foundAnalyses.has(matchedType.id)) {
        console.log(`⚠️ [LLM Parser] Skip duplicate for: "${matchedType.name}"`);
        continue;
      }

      // Parse values
      let numValue = null;
      if (item.value !== undefined && item.value !== null) {
        numValue = parseFloat(item.value);
        if (isNaN(numValue)) numValue = null;
      }

      let strValue = item.stringValue || null;
      if (numValue === null && !strValue && typeof item.value === 'string') {
        strValue = item.value;
      }

      if (numValue === null && strValue === null) {
        console.log(`⚠️ [LLM Parser] Skip item without valid value: "${item.name}"`);
        continue;
      }

      console.log(`✅ [LLM Parser] Matched: "${item.name}" -> DB: "${matchedType.name}" (Val: ${numValue || strValue})`);

      resultsToSave.push({
        userId: userId,
        analysisTypeId: matchedType.id,
        date: analysisDate,
        value: numValue,
        stringValue: strValue,
        notes: null, // will be handled or annotated by the controller
      });

      foundAnalyses.add(matchedType.id);
    }

    console.log(`🎉 [LLM Parser] Completed fallback. Extracted ${resultsToSave.length} valid results.`);
  } catch (error) {
    console.error('❌ [LLM Parser] Error calling LLM or parsing output:', error);
  }

  return resultsToSave;
};
