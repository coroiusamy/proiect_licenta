import { Ollama } from 'ollama';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

const kbPath = path.join(__dirname, '../../data/medical_kb.json');
let knowledgeBase = [];

try {
  const rawData = fs.readFileSync(kbPath, 'utf8');
  knowledgeBase = JSON.parse(rawData);
  console.log(
    `✅ RAG: Baza medicală încărcată (${knowledgeBase.length} intrări)`
  );
} catch (err) {
  console.error('❌ RAG: Nu s-a putut încărca medical_kb.json', err);
}

function retrieveContext(analysisName) {
  const normalize = (str) => str.toLowerCase().trim();
  const target = normalize(analysisName);
  const found = knowledgeBase.find((entry) =>
    entry.keywords.some((k) => target.includes(normalize(k)))
  );
  return found ? found.info : null;
}

// Detectare SEVERITATE bazată pe cât de departe e de normal
function detectSeverity(value, refMin, refMax, status) {
  if (status === 'normal') return 'NORMAL';

  const numValue = parseFloat(value);

  if (status === 'high' && refMax) {
    const timesOverMax = numValue / refMax;

    // CRITIC: >3x peste normal
    if (timesOverMax >= 3) return 'CRITIC';

    // SEVER: >2x peste normal
    if (timesOverMax >= 2) return 'SEVER';

    // RIDICAT: >1.5x peste normal
    if (timesOverMax >= 1.5) return 'RIDICAT';

    // UȘOR CRESCUT: între refMax și 1.5x
    return 'UȘOR CRESCUT';
  }

  if (status === 'low' && refMin) {
    const percentBelowMin = (refMin - numValue) / refMin;

    // CRITIC: <50% din minim
    if (percentBelowMin >= 0.5) return 'CRITIC';

    // SEVER: <70% din minim
    if (percentBelowMin >= 0.3) return 'SEVER';

    // SCĂZUT
    return 'SCĂZUT';
  }

  return status === 'high' ? 'CRESCUT' : 'SCĂZUT';
}

export async function generateWellnessAdvice(
  analysisName,
  value,
  unit,
  status,
  refMin = null,
  refMax = null
) {
  const contextData = retrieveContext(analysisName);

  // Detectare SEVERITATE
  const severity = detectSeverity(value, refMin, refMax, status);

  console.log(
    `🚨 [AI] Severitate detectată: ${severity} (valoare: ${value}, refMax: ${refMax})`
  );

  // RĂSPUNS HARDCODAT pentru cazuri CRITICE (fără AI - prea important!)
  if (severity === 'CRITIC') {
    let criticalMessage = '';

    if (status === 'high') {
      criticalMessage = `🚨 URGENȚĂ MEDICALĂ SEVERĂ! 🚨

Rezultatul tău de ${value} ${unit} este EXTREM DE RIDICAT (${Math.round(
        parseFloat(value) / refMax
      )}x peste limita maximă normală de ${refMax} ${unit}).

⚠️ RISC IMEDIAT:
${
  analysisName.toLowerCase().includes('glice') ||
  analysisName.toLowerCase().includes('glucoz')
    ? '- Risc de COMĂ DIABETICĂ (cetoacidoză)\n- Deshidratare severă\n- Deces dacă nu se tratează URGENT'
    : '- Risc vital\n- Necesită intervenție medicală imediată'
}

🚑 ACȚIUNE NECESARĂ:
✅ Mergi IMEDIAT la URGENȚE (112)
✅ NU aștepta programare
✅ NU încerca tratament acasă

Acesta este un sfat informativ. Situația ta necesită evaluare medicală URGENTĂ!`;
    } else {
      criticalMessage = `🚨 URGENȚĂ MEDICALĂ! 🚨

Rezultatul tău de ${value} ${unit} este EXTREM DE SCĂZUT (sub ${refMin} ${unit}).

⚠️ RISC IMEDIAT de complicații severe.

🚑 Mergi IMEDIAT la URGENȚE sau sună 112!

Acesta este un sfat informativ. Situația ta necesită evaluare medicală URGENTĂ!`;
    }

    return criticalMessage;
  }

  // Pentru cazuri non-critice, folosim AI cu prompt îmbunătățit
  let contextText = '';
  if (contextData) {
    const statusInfo =
      status === 'low' ? contextData.cauze_scazut : contextData.cauze_crescut;

    contextText = `
CONTEXT MEDICAL VALIDAT:
${contextData.descriere}

INTERVAL NORMAL: ${contextData.valori_normale}
${
  contextData.valori_critice
    ? `⚠️ VALORI CRITICE: ${contextData.valori_critice}`
    : ''
}

${
  status !== 'normal'
    ? `CAUZE ${status === 'low' ? 'SCĂZUT' : 'CRESCUT'}: ${statusInfo}`
    : ''
}

SFATURI: ${contextData.sfaturi}
`;
  }

  // Prompt adaptat la SEVERITATE
  const severityPrompts = {
    SEVER: `
🚨 ATENȚIE! Valoarea este FOARTE RIDICATĂ!

TREBUIE SĂ SPUI:
✅ "Rezultatul de ${value} ${unit} este SEMNIFICATIV PESTE normal (${refMax} ${unit})"
✅ "Această situație este SERIOASĂ și necesită atenție medicală URGENTĂ"
✅ "Consultă un medic CÂT MAI CURÂND POSIBIL - NU amâna!"
✅ Menționează riscuri specifice și acțiuni URGENTE
`,
    RIDICAT: `
⚠️ Valoarea este CONSIDERABIL crescută!

TREBUIE SĂ SPUI:
✅ "Rezultatul de ${value} ${unit} este PESTE intervalul normal (${refMax} ${unit})"
✅ "Este important să consulți medicul în zilele următoare"
✅ Sfaturi concrete de management
`,
    'UȘOR CRESCUT': `
Valoarea este ușor crescută.

TREBUIE SĂ SPUI:
✅ "Rezultatul de ${value} ${unit} este ușor peste limita normală"
✅ "Monitorizează și consultă medicul pentru evaluare"
`,
  };

  const prompt = `Tu ești asistent medical educațional. Răspunzi în ROMÂNĂ.

SITUAȚIA PACIENTULUI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔬 Analiză: ${analysisName}
📊 Valoare: ${value} ${unit}
⚖️ Status: ${
    status === 'normal'
      ? 'NORMAL ✅'
      : status === 'low'
      ? 'SCĂZUT ⚠️'
      : 'CRESCUT 🚨'
  }
🚨 Severitate: ${severity}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${contextText}

${severityPrompts[severity] || ''}

INSTRUCȚIUNI STRICTE:
1. SALUTĂ prietenos dar SERIOS (ținând cont de severitate)
2. SPUNE CLAR cât de departe e de normal și ce înseamnă
3. Pentru SEVERITATE RIDICATĂ: subliniază URGENȚA consultului medical
4. Oferă 2-3 sfaturi CONCRETE și ACȚIONABILE
5. ÎNCHEIE cu îndrumare clară despre pașii următori

REGULI CRITICE:
❌ NU pune NICIODATĂ diagnostic
❌ NU minimaliza situația dacă e SEVERĂ
❌ NU spune "totul e bine" pentru severitate ridicată
✅ FII REALIST despre gravitate
✅ ÎNCURAJEAZĂ consultul medical când e necesar

RĂSPUNS (3-5 propoziții, adaptat la severitate):`;

  try {
    const response = await ollama.chat({
      model: 'llama3.2',
      messages: [{ role: 'user', content: prompt }],
      options: {
        temperature: 0.3,
        top_p: 0.8,
        repeat_penalty: 1.2,
      },
    });

    let advice = response.message.content.trim();

    // Adaugă disclaimer
    const finalAdvice = `${advice}\n\nAcesta este un sfat informativ. Consultă medicul.`;

    console.log(`✅ [AI] Sfat generat (severitate: ${severity})`);
    return finalAdvice;
  } catch (error) {
    console.error('❌ [AI] Eroare Ollama:', error);

    // FALLBACK bazat pe severitate
    if (severity === 'SEVER') {
      return `Rezultatul de ${value} ${unit} este SEMNIFICATIV peste normal. Consultă medicul URGENT pentru evaluare.\n\nAcesta este un sfat informativ. Consultă medicul.`;
    }

    return null;
  }
}
