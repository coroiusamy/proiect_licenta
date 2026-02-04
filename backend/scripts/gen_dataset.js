import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Încarcă baza medicală
const kbPath = path.join(__dirname, '../data/medical_kb.json');
const knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

// Mapping severitate → factor multiplicare
const SEVERITY_FACTORS = {
  'UȘOR CRESCUT': { min: 1.05, max: 1.3 }, // 5-30% peste max
  RIDICAT: { min: 1.5, max: 1.9 }, // 50-90% peste max
  SEVER: { min: 2.0, max: 2.9 }, // 2-3x peste max
  CRITIC: { min: 3.0, max: 5.0 }, // 3-5x peste max
  SCĂZUT: { min: 0.7, max: 0.95 }, // 5-30% sub min
  'FOARTE SCĂZUT': { min: 0.3, max: 0.69 }, // 30-70% sub min
  NORMAL: { min: 0.5, max: 0.5 }, // La mijloc
};

// Template-uri de răspuns pentru fiecare severitate
const RESPONSE_TEMPLATES = {
  NORMAL: [
    'Bună! 👋 Rezultatul tău de {value} {unit} este în intervalul normal ({refMin}-{refMax} {unit}). Felicitări! 🎉 Continuă să ai grijă de sănătatea ta prin:\n- Alimentație echilibrată\n- Hidratare adecvată\n- Activitate fizică regulată\n\nPăstrează aceste obiceiuri sănătoase! ✨',
    'Salut! ✅ Valoarea ta de {value} {unit} este perfect normală (intervalul de referință: {refMin}-{refMax} {unit}). Corpul tău funcționează bine! Pentru a menține acest rezultat:\n- Menține o dietă variată\n- Fă mișcare regulat\n- Evită stresul excesiv\n\nContinuă tot așa! 💪',
  ],

  'UȘOR CRESCUT': [
    'Bună! 📊 Rezultatul tău de {value} {unit} este ușor peste limita superioară normală ({refMax} {unit}). Nu e motiv de panică, dar merită atenție. 👀\n\nSfaturi imediate:\n- {specific_advice_1}\n- {specific_advice_2}\n- Monitorizează în următoarele săptămâni\n\nProgramează o consultație pentru evaluare. 🏥',
    'Salut! Valoarea ta de {value} {unit} este puțin crescută față de normal ({refMax} {unit}). Este o modificare minoră care necesită atenție. 💡\n\nCe poți face:\n- {specific_advice_1}\n- {specific_advice_2}\n- Repetă analiza după 2-4 săptămâni\n\nConsultă medicul pentru sfaturi personalizate. 👨‍⚕️',
  ],

  RIDICAT: [
    '⚠️ Atenție! Rezultatul tău de {value} {unit} este CONSIDERABIL peste normal ({refMax} {unit}). Această situație necesită atenție medicală promptă. 🏥\n\nPași urgenti:\n- Contactează medicul în următoarele 1-2 zile\n- {specific_advice_1}\n- {specific_advice_2}\n\nNU ignora acest rezultat! Consultul medical este IMPORTANT. 👨‍⚕️',
    'Bună! 🚨 Valoarea ta de {value} {unit} este SEMNIFICATIV crescută (normal: sub {refMax} {unit}). Este important să acționezi rapid!\n\nUrgent:\n- Programează consult medical în 24-48h\n- {specific_advice_1}\n- {specific_advice_2}\n\nAceastă situație necesită evaluare medicală! ⚕️',
  ],

  SEVER: [
    '🚨 URGENȚĂ! Rezultatul de {value} {unit} este FOARTE RIDICAT (de {times_over}x peste normalul de {refMax} {unit}). Această situație este SERIOASĂ! ⚠️\n\nACȚIUNE URGENTĂ necesară:\n- Consultă medicul CÂT MAI CURÂND POSIBIL (astăzi/mâine)\n- {specific_advice_1}\n- {specific_advice_2}\n\nNU amâna consultul medical! Această valoare necesită intervenție! 🏥',
    '⚠️⚠️ ATENȚIE MAXIMĂ! Valoarea de {value} {unit} este EXTREM DE RIDICATĂ ({times_over}x peste {refMax} {unit}). Risc SEMNIFICATIV pentru sănătate!\n\nURGENT:\n- Mergi la medic ASTĂZI sau MÂINE\n- {specific_advice_1}\n- {specific_advice_2}\n\nAceasta este o situație SERIOASĂ care necesită atenție medicală IMEDIATĂ! 🚑',
  ],

  CRITIC: [
    '🚨🚨 URGENȚĂ MEDICALĂ SEVERĂ! 🚨🚨\n\nResultatul de {value} {unit} este EXTREM DE RIDICAT ({times_over}x peste limita de {refMax} {unit}).\n\n⚠️ RISC IMEDIAT:\n{critical_risks}\n\n🚑 ACȚIUNE NECESARĂ:\n✅ Mergi IMEDIAT la URGENȚE (112)\n✅ NU aștepta programare\n✅ NU încerca tratament acasă\n\nAceasta este o situație CRITICĂ care necesită intervenție medicală URGENTĂ! 🏥',
  ],

  SCĂZUT: [
    'Bună! 📉 Rezultatul tău de {value} {unit} este sub limita inferioară normală ({refMin} {unit}). Merită atenție. 👀\n\nSfaturi:\n- {specific_advice_1}\n- {specific_advice_2}\n- Consultă medicul pentru evaluare\n\nMonitorizează simptomele și programează o vizită medicală. 🏥',
    'Salut! Valoarea ta de {value} {unit} este scăzută față de normal ({refMin} {unit}). Este important să adresezi acest lucru.\n\nCe să faci:\n- {specific_advice_1}\n- {specific_advice_2}\n- Solicită consult medical\n\nMedicul va determina cauza și tratamentul potrivit. 👨‍⚕️',
  ],

  'FOARTE SCĂZUT': [
    '🚨 ATENȚIE! Rezultatul de {value} {unit} este MULT SUB normal ({refMin} {unit}). Această situație necesită evaluare medicală urgentă! ⚠️\n\nACȚIUNE URGENTĂ:\n- Consultă medicul în 24-48h\n- {specific_advice_1}\n- {specific_advice_2}\n\nNU ignora acest rezultat! Consultul este ESENȚIAL! 🏥',
  ],
};

// Sfaturi specifice per analiză și tip (crescut/scăzut)
const SPECIFIC_ADVICE = {
  glicemie: {
    high: [
      'Reduce zahărurile simple (dulciuri, sucuri)',
      'Mănâncă mai multe legume cu fibre',
      'Fă mișcare 30 min/zi',
      'Hidratează-te bine (apă, nu sucuri)',
      'Verifică glicemia în fiecare dimineață',
    ],
    low: [
      'Mănâncă mese regulate la 3-4 ore',
      'Include carbohidrați complecși (ovăz, pâine integrală)',
      'Evită posturile lungi',
      'Ai mereu la tine un snack rapid (fructe uscate)',
      'Monitorizează simptomele (tremurături, amețeli)',
    ],
  },
  colesterol: {
    high: [
      'Limitează grăsimile saturate (unt, brânzeturi grase)',
      'Mănâncă mai mult pește (omega-3)',
      'Adaugă nuci și semințe în dietă',
      'Fă exerciții cardiovasculare regulate',
      'Renunță la fumatul activ/pasiv',
    ],
    low: [
      'Include surse sănătoase de grăsimi (avocado, ulei de măsline)',
      'Mănâncă ouă și pește gras',
      'Consultă medicul - colesterolul prea scăzut poate indica alte probleme',
    ],
  },
  hemoglobină: {
    high: [
      'Hidratează-te abundent',
      'Evită fumatul',
      'Consultă medicul - poate indica deshidratare sau policitemia',
    ],
    low: [
      'Mănâncă alimente bogate în fier (carne roșie, spanac, linte)',
      'Adaugă vitamina C pentru absorbția fierului',
      'Evită ceaiul/cafeaua la mese (blochează absorbția fierului)',
      'Consultă medicul pentru suplimente de fier',
    ],
  },
  // Default pentru analize necunoscute
  default: {
    high: [
      'Menține o alimentație echilibrată',
      'Hidratează-te corespunzător',
      'Fă mișcare regulat',
      'Monitorizează simptomele',
    ],
    low: [
      'Asigură-te că primești nutrienții necesari',
      'Consultă un nutriționist pentru dietă personalizată',
      'Monitorizează simptomele',
      'Repetă analiza după 2-4 săptămâni',
    ],
  },
};

// Riscuri critice per analiză
const CRITICAL_RISKS = {
  glicemie:
    '- Risc de COMĂ DIABETICĂ (cetoacidoză)\n- Deshidratare severă\n- Deces dacă nu se tratează URGENT',
  colesterol:
    '- Risc MAJOR de infarct miocardic\n- Accident vascular cerebral\n- Blocaj arterial acut',
  creatinină:
    '- Insuficiență renală acută\n- Risc de dializă urgentă\n- Complicații cardiace',
  potasiu:
    '- Aritmii cardiace PERICULOASE\n- Stop cardiac\n- Paralizie musculară',
  default:
    '- Risc vital\n- Necesită intervenție medicală imediată\n- Complicații severe posibile',
};

function getSpecificAdvice(analysisName, isHigh) {
  const name = analysisName.toLowerCase();
  const type = isHigh ? 'high' : 'low';

  // Caută în sfaturi specifice
  for (const [key, advice] of Object.entries(SPECIFIC_ADVICE)) {
    if (name.includes(key)) {
      return advice[type];
    }
  }

  return SPECIFIC_ADVICE.default[type];
}

function getCriticalRisks(analysisName) {
  const name = analysisName.toLowerCase();

  for (const [key, risks] of Object.entries(CRITICAL_RISKS)) {
    if (name.includes(key)) {
      return risks;
    }
  }

  return CRITICAL_RISKS.default;
}

function generateValue(entry, severity) {
  const { refMin, refMax } = entry.valori_normale_parsed || {};

  if (!refMin || !refMax) return null;

  const factors = SEVERITY_FACTORS[severity];
  const range = refMax - refMin;

  if (severity === 'NORMAL') {
    // Valoare în mijlocul intervalului ± 20%
    const mid = (refMin + refMax) / 2;
    const variation = range * 0.2;
    return mid + (Math.random() - 0.5) * variation;
  }

  if (severity.includes('SCĂZUT')) {
    // Sub refMin
    return refMin * (factors.min + Math.random() * (factors.max - factors.min));
  }

  // Peste refMax
  return refMax * (factors.min + Math.random() * (factors.max - factors.min));
}

function formatResponse(template, data) {
  return template
    .replace(/{value}/g, data.value)
    .replace(/{unit}/g, data.unit)
    .replace(/{refMin}/g, data.refMin)
    .replace(/{refMax}/g, data.refMax)
    .replace(/{times_over}/g, data.timesOver)
    .replace(/{specific_advice_1}/g, data.advice[0] || '')
    .replace(/{specific_advice_2}/g, data.advice[1] || '')
    .replace(/{critical_risks}/g, data.criticalRisks || '');
}

function generateDatasetEntry(entry, severity) {
  const value = generateValue(entry, severity);
  if (!value) return null;

  const { refMin, refMax, unit } = entry.valori_normale_parsed || {};
  const valueFormatted = value.toFixed(2);
  const timesOver = (value / refMax).toFixed(1);

  const isHigh = !severity.includes('SCĂZUT') && severity !== 'NORMAL';
  const advice = getSpecificAdvice(entry.name, isHigh);

  // Selectează un template random pentru severitate
  const templates = RESPONSE_TEMPLATES[severity];
  const template = templates[Math.floor(Math.random() * templates.length)];

  const data = {
    value: valueFormatted,
    unit: unit || '',
    refMin: refMin,
    refMax: refMax,
    timesOver: timesOver,
    advice: advice,
    criticalRisks: getCriticalRisks(entry.name),
  };

  const response = formatResponse(template, data);

  const instruction = `Generează un sfat medical pentru ${
    entry.name
  } cu valoarea ${valueFormatted} ${unit || ''} (${severity}).`;

  const contextInfo =
    severity !== 'NORMAL'
      ? isHigh
        ? entry.cauze_crescut
        : entry.cauze_scazut
      : '';

  const input = `SITUAȚIA PACIENTULUI:
🔬 Analiză: ${entry.name}
📊 Valoare: ${valueFormatted} ${unit || ''}
⚖️ Status: ${
    isHigh
      ? 'CRESCUT 🚨'
      : severity.includes('SCĂZUT')
      ? 'SCĂZUT ⚠️'
      : 'NORMAL ✅'
  }
🚨 Severitate: ${severity}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXT MEDICAL:
${entry.descriere}

INTERVAL NORMAL: ${refMin}-${refMax} ${unit || ''}
${entry.valori_critice ? `⚠️ VALORI CRITICE: ${entry.valori_critice}` : ''}

${contextInfo ? `CAUZE: ${contextInfo}` : ''}

SFATURI: ${entry.sfaturi}`;

  // Format pentru Ollama fine-tuning
  return {
    messages: [
      {
        role: 'user',
        content: input,
      },
      {
        role: 'assistant',
        content: response,
      },
    ],
  };
}

function parseReferenceValues(valoriNormale) {
  // "5-10 mg/dL" → { refMin: 5, refMax: 10, unit: "mg/dL" }
  const match = valoriNormale.match(/([\d.]+)\s*-\s*([\d.]+)\s*(.+)/);
  if (!match) return null;

  return {
    refMin: parseFloat(match[1]),
    refMax: parseFloat(match[2]),
    unit: match[3].trim(),
  };
}

// MAIN: Generare dataset
function generateDataset() {
  console.log('🚀 [Generator] Start generare dataset sintetic...\n');

  const dataset = [];
  const severities = Object.keys(SEVERITY_FACTORS);

  // Pentru fiecare analiză din medical_kb
  knowledgeBase.forEach((entry) => {
    // Parse valori de referință
    entry.valori_normale_parsed = parseReferenceValues(entry.valori_normale);

    if (!entry.valori_normale_parsed) {
      console.log(`⚠️ Skip ${entry.name} - valori neparsabile`);
      return;
    }

    console.log(`📊 Generez pentru: ${entry.name}`);

    // Generează 2-3 exemple per severitate
    severities.forEach((severity) => {
      const count = severity === 'NORMAL' ? 2 : severity === 'CRITIC' ? 1 : 2;

      for (let i = 0; i < count; i++) {
        const dataEntry = generateDatasetEntry(entry, severity);
        if (dataEntry) {
          dataset.push(dataEntry);
        }
      }
    });
  });

  console.log(`\n✅ [Generator] Generat ${dataset.length} exemple!`);

  // Salvare în JSONL
  const outputPath = path.join(
    process.cwd(),
    'dataset_wellness_synthetic.jsonl'
  );
  dataset.forEach((entry) => {
    fs.appendFileSync(outputPath, JSON.stringify(entry) + '\n');
  });

  console.log(`💾 [Generator] Salvat în: ${outputPath}`);

  // Stats
  const stats = {};
  severities.forEach((sev) => {
    stats[sev] = dataset.filter((d) => d.instruction.includes(sev)).length;
  });

  console.log('\n📊 [Stats] Distribuție pe severități:');
  Object.entries(stats).forEach(([sev, count]) => {
    console.log(`   ${sev}: ${count} exemple`);
  });
}

// RUN
generateDataset();
