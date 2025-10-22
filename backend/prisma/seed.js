import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const analysisTypesData = [
  // --- Profil Hepatic (Ficat) ---
  {
    name: 'TGO (AST)',
    unit: 'U/L',
    refMin: 5,
    refMax: 40,
    interpretationHigh:
      'Nivelul TGO este crescut. Poate indica o leziune la nivelul ficatului, inimii sau mușchilor. Se recomandă consult medical.',
    interpretationNormal: 'Nivelul TGO este în limite normale.',
  },
  {
    name: 'TGP (ALT)',
    unit: 'U/L',
    refMin: 7,
    refMax: 56,
    interpretationHigh:
      'Nivelul TGP este crescut. Este un indicator mai specific pentru leziuni hepatice (ficat). Se recomandă consult medical.',
    interpretationNormal: 'Nivelul TGP este în limite normale.',
  },
  {
    name: 'GGT',
    unit: 'U/L',
    refMin: 5,
    refMax: 40, // Variază mult în funcție de laborator/sex
    interpretationHigh:
      'Nivelul GGT este crescut. Poate indica afecțiuni ale ficatului sau ale căilor biliare, adesea asociat cu consumul de alcool.',
    interpretationNormal: 'Nivelul GGT este în limite normale.',
  },

  // --- Profil Lipidic (Grăsimi) ---
  {
    name: 'Colesterol Total',
    unit: 'mg/dL',
    refMax: 200,
    interpretationHigh:
      'Nivelul colesterolului total este crescut. Risc cardiovascular ridicat. Se recomandă modificarea stilului de viață și consult cardiologic.',
    interpretationNormal: 'Nivelul colesterolului este optim.',
  },
  {
    name: 'Colesterol HDL',
    unit: 'mg/dL',
    refMin: 40, // Considerat "bun" dacă e PESTE 40 (ideal > 60)
    interpretationLow:
      'Nivelul HDL ("colesterolul bun") este scăzut. Risc cardiovascular crescut. Se recomandă exercițiu fizic și o dietă bogată în grăsimi sănătoase.',
    interpretationNormal: 'Nivelul HDL este în limite protectoare.',
  },
  {
    name: 'Colesterol LDL',
    unit: 'mg/dL',
    refMax: 100, // Ideal sub 100
    interpretationHigh:
      'Nivelul LDL ("colesterolul rău") este crescut. Risc major de ateroscleroză. Se recomandă consult medical și dietă strictă.',
    interpretationNormal: 'Nivelul LDL este optim.',
  },
  {
    name: 'Trigliceride',
    unit: 'mg/dL',
    refMax: 150,
    interpretationHigh:
      'Nivelul trigliceridelor este crescut. Risc cardiovascular. Adesea legat de consumul de carbohidrați și zahăr.',
    interpretationNormal: 'Nivelul trigliceridelor este în limite normale.',
  },

  // --- Metabolism ---
  {
    name: 'Glicemie (Glucoză serică)',
    unit: 'mg/dL',
    refMin: 70,
    refMax: 99,
    interpretationLow:
      'Nivel scăzut (hipoglicemie). Poate cauza amețeli, slăbiciune. Necesită atenție medicală.',
    interpretationNormal: 'Glicemia este în limite normale.',
    interpretationHigh:
      'Nivel crescut (hiperglicemie). Poate indica pre-diabet (100-125) sau diabet (>126). Se recomandă consult endocrinologic.',
  },
  {
    name: 'Hemoglobină Glicozilată (HbA1c)',
    unit: '%',
    refMax: 5.7,
    interpretationNormal: 'Media glicemiei pe ultimele 3 luni este normală.',
    interpretationHigh:
      'Nivelul este crescut. Indică pre-diabet (5.7-6.4) sau diabet (>6.5). Necesită monitorizare și tratament.',
  },

  // --- Profil Renal (Rinichi) ---
  {
    name: 'Uree serică',
    unit: 'mg/dL',
    refMin: 15,
    refMax: 45,
    interpretationHigh:
      'Nivel crescut (azotemie). Poate indica o problemă de funcționare a rinichilor sau deshidratare.',
    interpretationNormal: 'Nivelul ureei este în limite normale.',
  },
  {
    name: 'Creatinină serică',
    unit: 'mg/dL',
    refMin: 0.6,
    refMax: 1.3,
    interpretationHigh:
      'Nivel crescut. Este un indicator important al funcției renale. Se recomandă consult nefrologic.',
    interpretationNormal: 'Nivelul creatininei este în limite normale.',
  },

  // --- Hemoleucogramă ---
  {
    name: 'Hemoglobină (HGB)',
    unit: 'g/dL',
    refMin: 12.5,
    refMax: 17.0,
    interpretationLow:
      'Nivel scăzut. Indică anemie. Cauze posibile: deficit de fier, B12 sau alte afecțiuni.',
    interpretationNormal: 'Nivelul hemoglobinei este normal.',
    interpretationHigh:
      'Nivel crescut (policitemie). Poate fi cauzat de fumat, deshidratare sau alte afecțiuni.',
  },
  {
    name: 'Leucocite (WBC)',
    unit: 'mii/μL',
    refMin: 4.5,
    refMax: 11.0,
    interpretationLow:
      'Nivel scăzut (leucopenie). Sistem imunitar slăbit. Risc de infecții.',
    interpretationNormal: 'Numărul de leucocite este normal.',
    interpretationHigh:
      'Nivel crescut (leucocitoză). Indică de obicei o infecție sau inflamație în corp.',
  },
  {
    name: 'Trombocite (PLT)',
    unit: 'mii/μL',
    refMin: 150,
    refMax: 450,
    interpretationLow:
      'Nivel scăzut (trombocitopenie). Risc crescut de sângerare.',
    interpretationNormal: 'Numărul de trombocite este normal.',
    interpretationHigh:
      'Nivel crescut (trombocitoză). Risc crescut de formare a cheagurilor de sânge.',
  },

  // --- Inflamație ---
  {
    name: 'VSH (Viteza de Sedimentare a Hematiilor)',
    unit: 'mm/h',
    refMax: 20,
    interpretationNormal: 'Nivel normal.',
    interpretationHigh:
      'VSH crescut. Indicator nespecific de inflamație, infecție sau alte afecțiuni.',
  },
  {
    name: 'Proteina C Reactivă (CRP)',
    unit: 'mg/L',
    refMax: 5.0,
    interpretationNormal: 'Nivel normal.',
    interpretationHigh:
      'Nivel crescut. Indicator important de inflamație acută sau infecție în corp.',
  },

  // --- Teste Serologice (Exemplu Pozitiv/Negativ) ---
  {
    name: 'Ag HBs (Hepatita B)',
    unit: 'N/A', // Nu are unitate
    interpretationNormal: 'Negativ. Nu există infecție cu virusul hepatitei B.',
    interpretationHigh:
      'Pozitiv (Reactiv). Indică o infecție activă cu virusul hepatitei B. Necesită consult medical urgent.',
    // Nu are refMin/refMax
  },
  {
    name: 'Ac Anti-HCV (Hepatita C)',
    unit: 'N/A',
    interpretationNormal: 'Negativ. Fără contact cu virusul hepatitei C.',
    interpretationHigh:
      'Pozitiv (Reactiv). Indică o posibilă infecție (prezentă sau trecută) cu virusul hepatitei C.',
  },
];

async function main() {
  console.log('Începem popularea bazei de date (seeding)...');

  for (const analysis of analysisTypesData) {
    await prisma.analysisType.upsert({
      where: { name: analysis.name }, // Caută după nume
      update: analysis, // Dacă îl găsește, îl actualizează cu datele noi
      create: analysis, // Dacă nu îl găsește, îl creează
    });
    console.log(`> Analiza '${analysis.name}' a fost adăugată/actualizată.`);
  }

  console.log('Populare (seeding) finalizată cu succes! ✅');
}

main()
  .catch((e) => {
    console.error('Eroare în timpul populării:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
