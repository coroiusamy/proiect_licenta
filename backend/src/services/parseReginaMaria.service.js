import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Normalize text
const normalizeText = (text) => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
};

// Match analysis type în DB
const matchAnalysisType = (scannedName, dbTypes) => {
  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = normalize(scannedName);

  return dbTypes.find((type) => {
    const dbName = normalize(type.name);
    const dbDisplay = type.displayName ? normalize(type.displayName) : '';

    // Exact match
    if (dbName === target || dbDisplay === target) return true;

    // Contains match
    if (dbName.includes(target) || target.includes(dbName)) return true;
    if (dbDisplay && (dbDisplay.includes(target) || target.includes(dbDisplay)))
      return true;

    // Alias-uri Regina Maria
    if (
      target.includes('alt') ||
      target.includes('alanina') ||
      target.includes('gpt') ||
      target.includes('tgp')
    ) {
      return (
        dbName.includes('alanina') ||
        dbDisplay.includes('alt') ||
        dbDisplay.includes('tgp')
      );
    }
    if (
      target.includes('ast') ||
      target.includes('aspartat') ||
      target.includes('got') ||
      target.includes('tgo')
    ) {
      return (
        dbName.includes('aspartat') ||
        dbDisplay.includes('ast') ||
        dbDisplay.includes('tgo')
      );
    }
    if (target.includes('glucoza') || target.includes('glicemie')) {
      return dbName.includes('glicemie') || dbName.includes('glucoza');
    }
    if (
      target.includes('creatinina') &&
      !target.includes('rata') &&
      !target.includes('egfr')
    ) {
      return (
        dbName.includes('creatinina') &&
        !dbName.includes('rata') &&
        !dbName.includes('egfr')
      );
    }
    if (target.includes('colesterol')) {
      if (target.includes('hdl')) return dbName.includes('hdl');
      if (target.includes('ldl')) return dbName.includes('ldl');
      if (target.includes('total'))
        return dbName.includes('colesterol') && dbName.includes('total');
      return dbName.includes('colesterol');
    }
    if (
      target.includes('vsh') ||
      target.includes('viteza') ||
      target.includes('sedimentare')
    ) {
      return dbName.includes('vsh') || dbName.includes('sedimentare');
    }
    if (target.includes('uree') || target.includes('urea')) {
      return dbName.includes('uree') || dbName.includes('urea');
    }
    if (target.includes('calciu')) {
      return dbName.includes('calciu');
    }
    if (target.includes('magneziu')) {
      return dbName.includes('magneziu');
    }
    if (target.includes('proteina') && target.includes('reactiva')) {
      return (
        dbName.includes('proteina') &&
        (dbName.includes('reactiva') || dbName.includes('crp'))
      );
    }

    return false;
  });
};

// Parser Regina Maria - MULTI-LINE
export const parseReginaMariaPdf = async (textContent, userId) => {
  console.log('🔴 [Regina Maria] Start parsing (multi-line)...');
  console.log(`📄 Text lungime: ${textContent.length} caractere`);

  const resultsToSave = [];

  // 1. Extrage data
  let analysisDate = null;
  const datePatterns = [
    /Data - ora recoltare:\s*(\d{2})\.(\d{2})\.(\d{4})/i,
    /Data recoltare:\s*(\d{2})\.(\d{2})\.(\d{4})/i,
    /recoltare:\s*(\d{2})\.(\d{2})\.(\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const dateMatch = textContent.match(pattern);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const year = parseInt(dateMatch[3]);

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
            '0',
          )}`,
        );
        console.log('📅 Data găsită:', analysisDate.toISOString());
        break;
      }
    }
  }

  if (!analysisDate) {
    analysisDate = new Date();
    console.warn('⚠️ Data nu a fost găsită, folosim data curentă');
  }

  // 2. Fetch tipuri
  const knownTypes = await prisma.analysisType.findMany();
  console.log(`📋 Tipuri în DB: ${knownTypes.length}`);

  // 3. PARSARE REGINA MARIA (Multi-line)
  // Format PDF: 4 linii consecutive:
  // Linia 1: Valoare (număr)
  // Linia 2: Nume analiză (MAJUSCULE)
  // Linia 3: Unitate (mg/dL, U/L, etc.)
  // Linia 4: Interval ([X - Y] sau <X)

  const lines = textContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  console.log(`📋 Linii procesabile: ${lines.length}`);
  console.log(
    `\n📄 Primele 50 linii extrase:\n`,
    lines.slice(0, 50).join('\n'),
  );

  for (let i = 0; i < lines.length - 3; i++) {
    const line1 = lines[i];
    const line2 = lines[i + 1];
    const line3 = lines[i + 2];
    const line4 = lines[i + 3];

    // Skip metadata
    if (line1.toLowerCase().includes('metoda')) continue;
    if (line1.toLowerCase().includes('buletin')) continue;
    if (line1.toLowerCase().includes('regina maria')) continue;
    if (line1.toLowerCase().includes('laborator')) continue;
    if (line1.toLowerCase().includes('certificat')) continue;
    if (line1.toLowerCase().includes('hematologie')) continue;
    if (line1.toLowerCase().includes('biochimie')) continue;
    if (line1.toLowerCase().includes('imunologie')) continue;
    if (line1.match(/^(Denumire|Rezultate|Interval)/i)) continue;
    if (line1.match(/^\d{2}\.\d{2}\.\d{4}/)) continue;
    if (line1.includes('Pg.')) continue;

    // Verifică pattern multi-line
    const valueMatch = line1.match(/^(\d+\.?\d*)$/);
    if (!valueMatch) continue;

    const value = parseFloat(valueMatch[1]);

    // Skip ani
    if (value >= 1900 && value <= 2100) continue;

    // Verifică nume (linia 2)
    if (line2.length < 3) continue;
    if (line2.match(/^\d/)) continue;

    // Verifică unitate (linia 3)
    if (!line3.match(/^[a-zA-Z\/\^0-9]+$/)) continue;

    // Verifică interval (linia 4)
    if (!line4.match(/[\[<>≤≥\(]/)) continue;

    const analysisName = line2.replace(/[²¹\*]/g, '').trim();
    const unit = line3;
    const intervalText = line4;

    console.log(`\n🔍 Găsit (linii ${i}-${i + 3}):`);
    console.log(`   "${analysisName}"`);
    console.log(`   Valoare: ${value} ${unit}`);
    console.log(`   Interval: ${intervalText}`);

    // Match în DB
    const matchedType = matchAnalysisType(analysisName, knownTypes);

    if (!matchedType) {
      console.log(`   ❌ Nu se găsește în DB`);
      i += 3; // Skip următoarele 3 linii
      continue;
    }

    console.log(`   ✅ Match DB: ${matchedType.name}`);

    // Verifică duplicate
    const isDuplicate = resultsToSave.some(
      (r) =>
        r.analysisTypeId === matchedType.id && Math.abs(r.value - value) < 0.01,
    );

    if (isDuplicate) {
      console.log(`   ⚠️ Duplicat, skip`);
      i += 3;
      continue;
    }

    resultsToSave.push({
      userId: userId,
      analysisTypeId: matchedType.id,
      date: analysisDate,
      value: value,
      stringValue: null,
      notes: null,
    });

    console.log(`   ✅ Adăugat la rezultate`);

    // Skip următoarele 3 linii (deja procesate)
    i += 3;
  }

  console.log(`\n✅ Regina Maria: ${resultsToSave.length} analize extrase`);

  if (resultsToSave.length > 0) {
    console.log('\n📋 Rezumat:');
    resultsToSave.forEach((r, idx) => {
      const type = knownTypes.find((t) => t.id === r.analysisTypeId);
      console.log(`  ${idx + 1}. ${type?.name}: ${r.value}`);
    });
  }

  return resultsToSave;
};
