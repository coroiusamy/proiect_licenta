import { Ollama } from 'ollama';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_MODEL = 'doctor-llama';
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

const kbPath = path.join(__dirname, '../../data/medical_kb.json');
let knowledgeBase = [];

// ============================================
// HELPER: Salvare Dataset
// ============================================
const saveToDataset = (userPrompt, assistantResponse) => {
  try {
    const datasetPath = path.join(
      process.cwd(),
      'dataset_wellness_ollama.jsonl',
    );
    const entry = {
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: assistantResponse },
      ],
    };
    fs.appendFileSync(datasetPath, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('Eroare la salvare dataset:', err.message);
  }
};

// ============================================
// Încărcare Knowledge Base
// ============================================
try {
  const rawData = fs.readFileSync(kbPath, 'utf8');
  knowledgeBase = JSON.parse(rawData);
  console.log(`RAG: Baza medicală încărcată (${knowledgeBase.length} intrări)`);
} catch (err) {
  console.error('RAG: Nu s-a putut încărca medical_kb.json', err);
}

// ============================================
// Retrieve Context din Knowledge Base
// ============================================
function retrieveContext(analysisName) {
  const normalize = (str) => str.toLowerCase().trim();
  const target = normalize(analysisName);
  const found = knowledgeBase.find((entry) =>
    entry.keywords.some((k) => target.includes(normalize(k))),
  );
  return found ? found.info : null;
}

// ============================================
// SEVERITATE ÎMBUNĂTĂȚITĂ - Mai nuanțată
// ============================================
function detectSeverity(value, refMin, refMax, status) {
  if (status === 'normal')
    return { level: 'NORMAL', urgency: 'none', tone: 'pozitiv' };

  const numValue = parseFloat(value);

  if (status === 'high' && refMax) {
    const ratio = numValue / refMax;

    if (ratio >= 3) {
      return { level: 'CRITIC', urgency: 'urgenta', tone: 'serios' };
    }
    if (ratio >= 2) {
      return { level: 'RIDICAT', urgency: 'curand', tone: 'atent' };
    }
    if (ratio >= 1.5) {
      return { level: 'MODERAT', urgency: 'programare', tone: 'calm_atent' };
    }
    // ratio < 1.5 - doar ușor peste normal
    return { level: 'USOR_CRESCUT', urgency: 'mentionare', tone: 'calm' };
  }

  if (status === 'low' && refMin) {
    const percentBelow = (refMin - numValue) / refMin;

    if (percentBelow >= 0.5) {
      return { level: 'CRITIC', urgency: 'urgenta', tone: 'serios' };
    }
    if (percentBelow >= 0.3) {
      return { level: 'RIDICAT', urgency: 'curand', tone: 'atent' };
    }
    if (percentBelow >= 0.15) {
      return { level: 'MODERAT', urgency: 'programare', tone: 'calm_atent' };
    }
    return { level: 'USOR_SCAZUT', urgency: 'mentionare', tone: 'calm' };
  }

  // Fallback
  return {
    level: status === 'high' ? 'CRESCUT' : 'SCAZUT',
    urgency: 'programare',
    tone: 'calm_atent',
  };
}

// ============================================
// Generare descriere simplă a analizei
// ============================================
function getSimpleDescription(analysisName, contextData) {
  // Descrieri simple pentru analize comune
  const descriptions = {
    bilirubina: 'arată cum procesează ficatul anumite substanțe',
    glicemie: 'arată nivelul de zahăr din sânge',
    glucoza: 'arată nivelul de zahăr din sânge',
    colesterol: 'măsoară grăsimile din sânge',
    hemoglobina: 'arată capacitatea sângelui de a transporta oxigen',
    creatinina: 'indică cum funcționează rinichii',
    alt: 'este un marker pentru funcția ficatului',
    ast: 'este un marker pentru funcția ficatului',
    trigliceride: 'măsoară un tip de grăsime din sânge',
    leucocite: 'arată activitatea sistemului imunitar',
    trombocite: 'sunt implicate în coagularea sângelui',
    fier: 'este important pentru producerea globulelor roșii',
  };

  const nameLower = analysisName.toLowerCase();
  for (const [key, desc] of Object.entries(descriptions)) {
    if (nameLower.includes(key)) return desc;
  }

  // Folosește descrierea din KB dacă există
  if (contextData?.descriere) {
    // Simplificăm descrierea dacă e prea lungă
    const desc = contextData.descriere;
    if (desc.length > 100) {
      return desc.split('.')[0]; // Prima propoziție
    }
    return desc;
  }

  return 'este un indicator monitorizat în analizele de sânge';
}

// ============================================
// FUNCȚIA PRINCIPALĂ - REFĂCUTĂ
// ============================================
export async function generateWellnessAdvice(
  analysisName,
  value,
  unit,
  status,
  refMin = null,
  refMax = null,
) {
  const contextData = retrieveContext(analysisName);
  const severity = detectSeverity(value, refMin, refMax, status);
  const simpleDesc = getSimpleDescription(analysisName, contextData);

  // Cazuri critice - răspuns hardcodat dar empatic
  if (severity.level === 'CRITIC') {
    const criticalMessage =
      status === 'high'
        ? `Te rog să acorzi atenție acestui rezultat. Valoarea ta de ${value} ${unit} pentru ${analysisName} este semnificativ peste intervalul normal (${refMax} ${unit}). Deși nu pot pune un diagnostic, acest nivel necesită evaluare medicală promptă pentru a înțelege cauza și a primi îndrumare adecvată. Te încurajez să contactezi medicul tău sau să mergi la o consultație cât mai curând posibil - nu pentru a te speria, ci pentru a primi atenția potrivită situației. Între timp, hidratează-te bine și odihnește-te.`
        : `Te rog să acorzi atenție acestui rezultat. Valoarea ta de ${value} ${unit} pentru ${analysisName} este sub intervalul normal (${refMin} ${unit}). Este important să discuți cu un medic pentru a înțelege ce ar putea cauza acest rezultat și cum poți fi ajutat/ă. Te încurajez să programezi o consultație cât mai curând.`;

    const disclaimer =
      '\n\nAcest mesaj are scop informativ și nu înlocuiește consultul medical.';
    saveToDataset(`CRITIC: ${analysisName} = ${value}`, criticalMessage);
    return criticalMessage + disclaimer;
  }

  // ============================================
  // PROMPT ÎMBUNĂTĂȚIT - Focus pe empatie, fără diagnostic
  // ============================================

  // Determinare ton și formulări bazate pe severitate
  const toneGuidance = {
    NORMAL: {
      greeting: 'Bună!',
      valueDesc: 'în intervalul normal',
      action: 'Continuă cu obiceiurile sănătoase!',
    },
    USOR_CRESCUT: {
      greeting: 'Bună!',
      valueDesc: 'puțin peste intervalul tipic',
      action: 'Menționează acest rezultat medicului la următoarea vizită.',
    },
    USOR_SCAZUT: {
      greeting: 'Bună!',
      valueDesc: 'puțin sub intervalul tipic',
      action: 'Menționează acest rezultat medicului la următoarea vizită.',
    },
    MODERAT: {
      greeting: 'Bună!',
      valueDesc: 'moderat în afara intervalului normal',
      action:
        'Ar fi bine să programezi o vizită la medic în următoarele săptămâni.',
    },
    RIDICAT: {
      greeting: 'Bună,',
      valueDesc: 'destul de departe de intervalul normal',
      action: 'Te încurajez să discuți cu medicul în curând pentru îndrumare.',
    },
  };

  const tone = toneGuidance[severity.level] || toneGuidance['MODERAT'];

  const prompt = `Generează un sfat de wellness în ROMÂNĂ pentru:

CONTEXT:
- Analiză: ${analysisName} (${simpleDesc})
- Valoare: ${value} ${unit}
- Interval normal: ${refMin || '?'} - ${refMax || '?'} ${unit}
- Status: ${
    status === 'normal'
      ? 'normal'
      : status === 'high'
        ? 'peste normal'
        : 'sub normal'
  }
- Nivel: ${severity.level} (ton: ${severity.tone})

CERINȚE STRICTE:
1. Începe cu "${tone.greeting}"
2. Explică simplu CE măsoară această analiză (o propoziție)
3. Menționează că valoarea e "${tone.valueDesc}" - FĂRĂ dramatizare
4. Oferă context liniștitor (variații normale, cauze benigne posibile)
5. Încheie cu: "${tone.action}"

INTERZIS ABSOLUT:
❌ "indică boală/problemă X" - NU pune diagnostic
❌ Liste de boli (hepatită, ciroză, etc.)
❌ Termeni medicali complicați
❌ Ton alarmist sau urgent (pentru acest nivel)
❌ Bullet points sau formatare
❌ Mai mult de 4 propoziții

OBLIGATORIU:
✅ Ton cald, ca un prieten informat
✅ Un singur paragraf, 3-4 propoziții
✅ Română corectă gramatical
✅ Context liniștitor înainte de recomandare

Răspunde ACUM (3-4 propoziții, un paragraf):`;

  // ============================================
  // Apel AI
  // ============================================
  try {
    const response = await ollama.chat({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      options: {
        temperature: 0.3,
        top_p: 0.9,
        repeat_penalty: 1.2,
        num_predict: 250,
      },
    });

    let advice = response.message.content.trim();

    // Post-procesare: elimină formatare nedorită
    advice = advice
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/^[-•]\s*/gm, '')
      .replace(/^\d+\.\s*/gm, '')
      .trim();

    // Verificare și curățare: elimină referințe la boli specifice
    const forbiddenTerms = [
      'hepatită',
      'ciroză',
      'tumoră',
      'cancer',
      'diabet',
      'insuficiență',
      'boală',
      'afecțiune gravă',
      'patologie',
    ];

    let needsRegeneration = false;
    for (const term of forbiddenTerms) {
      if (advice.toLowerCase().includes(term)) {
        needsRegeneration = true;
        break;
      }
    }

    if (needsRegeneration) {
      advice = generateFallbackAdvice(
        analysisName,
        value,
        unit,
        status,
        refMin,
        refMax,
        severity,
        simpleDesc,
      );
    }

    const disclaimer =
      '\n\nAcest mesaj are scop informativ și nu înlocuiește consultul medical.';

    saveToDataset(prompt, advice);

    return advice + disclaimer;
  } catch (error) {
    console.error('Eroare Ollama:', error);
    const fallback = generateFallbackAdvice(
      analysisName,
      value,
      unit,
      status,
      refMin,
      refMax,
      severity,
      simpleDesc,
    );
    return (
      fallback +
      '\n\nAcest mesaj are scop informativ și nu înlocuiește consultul medical.'
    );
  }
}

// ============================================
// FALLBACK EMPATIC - Fără AI
// ============================================
function generateFallbackAdvice(
  analysisName,
  value,
  unit,
  status,
  refMin,
  refMax,
  severity,
  simpleDesc,
) {
  const statusText = status === 'high' ? 'peste' : 'sub';
  const refValue = status === 'high' ? refMax : refMin;

  switch (severity.level) {
    case 'NORMAL':
      return `Bună! ${analysisName} ${simpleDesc}, iar valoarea ta de ${value} ${unit} este în intervalul normal. Asta înseamnă că totul arată bine din acest punct de vedere. Continuă cu obiceiurile tale sănătoase!`;

    case 'USOR_CRESCUT':
    case 'USOR_SCAZUT':
      return `Bună! ${analysisName} ${simpleDesc}. Valoarea ta de ${value} ${unit} este puțin ${statusText} intervalul tipic (${refValue} ${unit}), dar diferența e mică și poate avea multe explicații - de la variații normale zilnice, la alimentație sau stres. Menționează acest rezultat medicului la următoarea vizită de rutină pentru a vedea dacă merită monitorizat.`;

    case 'MODERAT':
      return `Bună! ${analysisName} ${simpleDesc}. Valoarea ta de ${value} ${unit} este moderat ${statusText} intervalul normal, ceea ce merită puțină atenție, dar nu e motiv de panică - multe cauze pot explica acest lucru, inclusiv factori temporari. Ar fi bine să programezi o vizită la medic în următoarele săptămâni pentru a discuta și a vedea dacă e nevoie de investigații suplimentare.`;

    case 'RIDICAT':
      return `Bună. ${analysisName} ${simpleDesc}, iar valoarea ta de ${value} ${unit} este destul de departe de intervalul normal. Fără a sări la concluzii, acest rezultat merită atenție și o discuție cu medicul în curând pentru a înțelege cauza și a primi îndrumare potrivită. Nu te speria, dar nici nu amâna prea mult consultul.`;

    default:
      return `Bună! Am văzut rezultatul tău pentru ${analysisName} (${value} ${unit}). Pentru a înțelege mai bine ce înseamnă pentru tine personal, cel mai bine ar fi să discuți cu medicul care poate pune rezultatul în contextul istoricului tău medical.`;
  }
}
