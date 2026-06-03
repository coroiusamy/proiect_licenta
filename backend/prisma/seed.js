import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const analysisTypesData = [
  // ============================================
  // BIOCHIMIE - Profil Hepatic (Ficat)
  // ============================================
  {
    name: 'Aspartataminotransferaza (GOT/ASAT/AST)',
    displayName: 'AST (TGO)',
    unit: 'U/L',
    refMin: 5,
    refMax: 46,
    interpretationHigh:
      'Nivelul AST este crescut. Poate indica leziuni hepatice, cardiace sau musculare. Se recomandă consult medical.',
    interpretationNormal: 'Nivelul AST este în limite normale.',
  },
  {
    name: 'Alaninaminotransferaza (GPT/ALAT/ALT)',
    displayName: 'ALT (TGP)',
    unit: 'U/L',
    refMin: 7,
    refMax: 50,
    interpretationHigh:
      'Nivelul ALT este crescut. Indicator specific pentru leziuni hepatice (ficat). Se recomandă consult medical.',
    interpretationNormal: 'Nivelul ALT este în limite normale.',
  },
  {
    name: 'Gama - glutamiltransferaza (Glutamiltranspeptidaza)',
    displayName: 'GGT (Gamma-GT)',
    unit: 'U/L',
    refMin: 5,
    refMax: 60,
    interpretationHigh:
      'Nivelul GGT este crescut. Poate indica afecțiuni hepatice, biliare sau consum de alcool.',
    interpretationNormal: 'Nivelul GGT este în limite normale.',
  },
  {
    name: 'Bilirubina totala',
    displayName: 'Bilirubină totală',
    unit: 'mg/dL',
    refMin: 0.3,
    refMax: 1.2,
    interpretationHigh:
      'Bilirubina totală crescută. Poate indica icter, probleme hepatice sau hemoliza. Se recomandă consult medical.',
    interpretationNormal: 'Bilirubina totală este în limite normale.',
  },
  {
    name: 'Bilirubina directa',
    displayName: 'Bilirubină directă',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 0.3,
    interpretationHigh:
      'Bilirubina directă crescută. Poate indica colestază sau obstrucție biliară.',
    interpretationNormal: 'Bilirubina directă este în limite normale.',
  },
  {
    name: 'Bilirubina indirecta',
    displayName: 'Bilirubină indirectă',
    unit: 'mg/dL',
    refMin: 0.1,
    refMax: 1.0,
    interpretationHigh:
      'Bilirubina indirectă crescută. Poate indica hemoliză (distrugerea eritrocitelor) sau sindrom Gilbert.',
    interpretationNormal: 'Bilirubina indirectă este în limite normale.',
  },

  // ============================================
  // BIOCHIMIE - Metabolism Fier
  // ============================================
  {
    name: 'Fier seric (sideremie)',
    displayName: 'Fier seric',
    unit: 'μg/dL',
    refMin: 27,
    refMax: 138,
    interpretationLow:
      'Fier seric scăzut. Poate indica anemie feriprivă, pierdere de sânge sau malabsorbție.',
    interpretationNormal: 'Fierul seric este în limite normale.',
    interpretationHigh:
      'Fier seric crescut. Poate indica hemocromatoză, hemoliza sau suplimentare excesivă.',
  },
  {
    name: 'Feritina',
    displayName: 'Feritină',
    unit: 'ng/mL',
    refMin: 14,
    refMax: 152,
    interpretationLow:
      'Rezerve scăzute de fier. Risc de anemie feriprivă. Se recomandă suplimentare cu fier.',
    interpretationNormal: 'Rezervele de fier (feritină) sunt normale.',
    interpretationHigh:
      'Feritină crescută. Poate indica hemocromatoză, inflamație cronică sau afecțiuni hepatice.',
  },

  // ============================================
  // BIOCHIMIE - Electroliți
  // ============================================
  {
    name: 'Calciu seric',
    displayName: 'Calciu total',
    unit: 'mg/dL',
    refMin: 8.4,
    refMax: 10.2,
    interpretationLow:
      'Hipocalcemie. Poate cauza spasme musculare, tetanie și probleme osoase.',
    interpretationNormal: 'Calciul seric este în limite normale.',
    interpretationHigh:
      'Hipercalcemie. Poate indica hiperparatiroidism, afecțiuni osoase sau intoxicație cu vitamina D.',
  },
  {
    name: 'Calciu ionic',
    displayName: 'Calciu ionic',
    unit: 'mg/dL',
    refMin: 3.82,
    refMax: 4.82,
    interpretationLow:
      'Calciu ionic scăzut (forma activă). Poate cauza simptome neuromusculare.',
    interpretationNormal: 'Calciul ionic este în limite normale.',
    interpretationHigh: 'Calciu ionic crescut.',
  },

  // ============================================
  // BIOCHIMIE - Proteine
  // ============================================
  {
    name: 'Proteine totale serice',
    displayName: 'Proteine totale',
    unit: 'g/dL',
    refMin: 6,
    refMax: 8,
    interpretationLow:
      'Hipoproteinemie. Poate indica malnutriție, malabsorbție sau pierdere renală/intestinală.',
    interpretationNormal: 'Proteinele totale sunt în limite normale.',
    interpretationHigh:
      'Hiperproteinemie. Poate indica deshidratare, inflamație cronică sau mielom multiplu.',
  },

  // ============================================
  // ELECTROFOREZA PROTEINELOR SERICE
  // ============================================
  {
    name: 'Albumina%',
    displayName: 'Albumină (%)',
    unit: '%',
    refMin: 53.8,
    refMax: 65.2,
    interpretationLow:
      'Hipoalbuminemie. Poate indica malnutriție, boală hepatică, sindrom nefrotic sau inflamație.',
    interpretationNormal: 'Albumina este în limite normale.',
  },
  {
    name: 'Alfa 1 gl%',
    displayName: 'Alfa 1 Globuline (%)',
    unit: '%',
    refMin: 1.1,
    refMax: 3.7,
    interpretationHigh: 'Crescute în inflamații acute și infecții.',
    interpretationNormal: 'Alfa 1 globulinele sunt în limite normale.',
  },
  {
    name: 'Alfa 2 gl%',
    displayName: 'Alfa 2 Globuline (%)',
    unit: '%',
    refMin: 8.5,
    refMax: 14.5,
    interpretationHigh: 'Crescute în sindrom nefrotic, inflamații cronice.',
    interpretationNormal: 'Alfa 2 globulinele sunt în limite normale.',
  },
  {
    name: 'Beta gl%',
    displayName: 'Beta Globuline (%)',
    unit: '%',
    refMin: 8.6,
    refMax: 14.8,
    interpretationHigh: 'Crescute în hiperlipidemie, anemie feriprivă.',
    interpretationNormal: 'Beta globulinele sunt în limite normale.',
  },
  {
    name: 'Gamma gl%',
    displayName: 'Gamma Globuline (%)',
    unit: '%',
    refMin: 9.2,
    refMax: 18.2,
    interpretationHigh:
      'Crescute în infecții cronice, boli autoimune, ciroză hepatică.',
    interpretationNormal: 'Gamma globulinele sunt în limite normale.',
  },
  {
    name: '*A/G',
    displayName: 'Raport Albumină/Globuline',
    unit: '',
    refMin: 1.2,
    refMax: 2.23,
    interpretationLow:
      'Raport scăzut. Poate indica boală hepatică sau infecții cronice.',
    interpretationNormal: 'Raportul albumină/globuline este normal.',
  },

  // ============================================
  // INFLAMAȚIE
  // ============================================
  {
    name: 'Proteina C reactiva (CRP)',
    displayName: 'Proteină C Reactivă (CRP)',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 0.5,
    interpretationHigh:
      'CRP crescut. Indicator de inflamație acută, infecție bacteriană sau leziune tisulară.',
    interpretationNormal:
      'CRP este în limite normale - absența inflamației acute.',
  },

  // ============================================
  // HEMATOLOGIE - Hemoleucogramă Completă
  // ============================================
  {
    name: 'Numar leucocite',
    displayName: 'Leucocite (WBC)',
    unit: 'mii/μL',
    refMin: 4.5,
    refMax: 13.0,
    interpretationLow:
      'Leucopenie. Sistem imunitar slăbit, risc crescut de infecții. Cauze: infecții virale, medicamente, boli autoimune.',
    interpretationNormal: 'Numărul de leucocite este normal.',
    interpretationHigh:
      'Leucocitoză. Indică infecție, inflamație sau (rar) leucemie.',
  },
  {
    name: 'Numar eritrocite',
    displayName: 'Eritrocite (RBC)',
    unit: 'mil./μL',
    refMin: 4.2,
    refMax: 5.6,
    interpretationLow:
      'Număr scăzut de eritrocite. Poate indica anemie sau pierdere de sânge.',
    interpretationNormal: 'Numărul de eritrocite este normal.',
    interpretationHigh:
      'Eritrocitoză. Poate indica policitemie, deshidratare sau hipoxie cronică.',
  },
  {
    name: 'Hemoglobina {Hb}',
    displayName: 'Hemoglobină (Hb)',
    unit: 'g/dL',
    refMin: 11.7,
    refMax: 16.6,
    interpretationLow:
      'Anemie. Cauze: deficit de fier, B12, acid folic, pierdere de sânge sau boli cronice.',
    interpretationNormal: 'Hemoglobina este în limite normale.',
    interpretationHigh:
      'Policitemie. Poate fi cauzată de fumat, altitudine înaltă, deshidratare sau boli mieloproliferative.',
  },
  {
    name: 'Hematocrit',
    displayName: 'Hematocrit (Ht)',
    unit: '%',
    refMin: 37,
    refMax: 48,
    interpretationLow: 'Hematocrit scăzut. Indică anemie sau hiper-hidratare.',
    interpretationNormal: 'Hematocritul este în limite normale.',
    interpretationHigh:
      'Hematocrit crescut. Indică policitemie sau deshidratare.',
  },

  // ============================================
  // INDICI ERITROCITARI
  // ============================================
  {
    name: 'Volum eritrocitar mediu {VEM}',
    displayName: 'VEM (MCV)',
    unit: 'fL',
    refMin: 79,
    refMax: 95,
    interpretationLow:
      'Anemie microcitară. Caracteristică pentru anemie feriprivă sau talasemie.',
    interpretationNormal: 'Volumul eritrocitar mediu este normal (normocitar).',
    interpretationHigh:
      'Anemie macrocitară. Caracteristică pentru deficit de B12, acid folic sau alcoolism.',
  },
  {
    name: 'Hemoglobina eritrocitara medie {HEM}',
    displayName: 'HEM (MCH)',
    unit: 'pg/cell',
    refMin: 27,
    refMax: 32,
    interpretationLow:
      'Nivel scăzut de hemoglobină per eritrocit (hipocromie).',
    interpretationNormal: 'Hemoglobina eritrocitară medie este normală.',
    interpretationHigh: 'Nivel crescut de hemoglobină per eritrocit.',
  },
  {
    name: 'Concentratie medie a Hb./eritrocit {CHEM}',
    displayName: 'CHEM (MCHC)',
    unit: 'g/dL',
    refMin: 32,
    refMax: 36,
    interpretationLow:
      'Hipocromie. Eritrocitele conțin mai puțină hemoglobină decât normal.',
    interpretationNormal: 'Concentrația medie de hemoglobină este normală.',
    interpretationHigh: 'Hipercromie (rar întâlnită).',
  },
  {
    name: 'Largimea distributiei eritrocitare',
    displayName: 'RDW (Anizocitoză)',
    unit: '%',
    refMin: 11.6,
    refMax: 14.8,
    interpretationHigh:
      'Anizocitoză (eritrocite de mărimi variabile). Poate indica deficit de fier, B12 sau anemii mixte.',
    interpretationNormal: 'Distribuția mărimii eritrocitelor este normală.',
  },

  // ============================================
  // TROMBOCITE (PLACHETELE)
  // ============================================
  {
    name: 'Numar trombocite',
    displayName: 'Trombocite (PLT)',
    unit: 'mii/μL',
    refMin: 150,
    refMax: 450,
    interpretationLow:
      'Trombocitopenie. Risc crescut de sângerare. Cauze: infecții virale, medicamente, boli autoimune, leucemie.',
    interpretationNormal: 'Numărul de trombocite este normal.',
    interpretationHigh:
      'Trombocitoză. Risc de formare a cheagurilor. Poate fi reactivă (inflamație, infecție) sau primară (boli mieloproliferative).',
  },
  {
    name: 'Volum trombocitar mediu {VTM}',
    displayName: 'VTM (MPV)',
    unit: 'fL',
    refMin: 7.4,
    refMax: 13.0,
    interpretationHigh:
      'Trombocite mari. Indică producție crescută de trombocite noi (trombopoieza activă).',
    interpretationNormal: 'Volumul trombocitar mediu este normal.',
  },
  {
    name: 'Largimea distributiei trombocitare',
    displayName: 'PDW (Anizocitoză trombocitară)',
    unit: 'fL',
    refMin: 8,
    refMax: 16.5,
    interpretationHigh: 'Trombocite de mărimi variabile.',
    interpretationNormal: 'Distribuția mărimii trombocitelor este normală.',
  },

  // ============================================
  // FORMULA LEUCOCITARĂ (Procentaje ȘI valori absolute)
  // ============================================

  {
    name: 'Neutrofil %',
    displayName: 'Neutrofile (%)',
    unit: '%',
    refMin: 40,
    refMax: 75,
    interpretationLow: 'Neutropenie. Risc crescut de infecții bacteriene.',
    interpretationNormal: 'Procentul de neutrofile este normal.',
    interpretationHigh:
      'Neutrofilie. Indică de obicei infecție bacteriană, inflamație sau stres fizic.',
  },
  {
    name: 'Neutrofil mii/uL',
    displayName: 'Neutrofile (Absolut)',
    unit: 'mii/uL',
    refMin: 1.8,
    refMax: 8.0,
    interpretationNormal: 'Număr absolut de neutrofile normal.',
  },

  {
    name: 'Limfocit %',
    displayName: 'Limfocite (%)',
    unit: '%',
    refMin: 20,
    refMax: 55,
    interpretationLow:
      'Limfopenie. Poate indica imunosupresie sau infecții acute.',
    interpretationNormal: 'Procentul de limfocite este normal.',
    interpretationHigh: 'Limfocitoză. Caracteristică pentru infecții virale.',
  },
  {
    name: 'Limfocit mii/uL',
    displayName: 'Limfocite (Absolut)',
    unit: 'mii/uL',
    refMin: 1.5,
    refMax: 6.5,
    interpretationNormal: 'Număr absolut de limfocite normal.',
  },

  {
    name: 'Monocit %',
    displayName: 'Monocite (%)',
    unit: '%',
    refMin: 0,
    refMax: 15,
    interpretationHigh:
      'Monocitoză. Poate indica infecții cronice (tuberculoză), inflamație.',
    interpretationNormal: 'Procentul de monocite este normal.',
  },
  {
    name: 'Monocit mii/uL',
    displayName: 'Monocite (Absolut)',
    unit: 'mii/uL',
    refMin: 0.3,
    refMax: 1.0,
    interpretationNormal: 'Număr absolut de monocite normal.',
  },

  {
    name: 'Eozinofil %',
    displayName: 'Eozinofile (%)',
    unit: '%',
    refMin: 0,
    refMax: 7,
    interpretationHigh:
      'Eozinofilie. Caracteristică pentru alergii, astm, infecții parazitare.',
    interpretationNormal: 'Procentul de eozinofile este normal.',
  },
  {
    name: 'Eozinofil mii/uL',
    displayName: 'Eozinofile (Absolut)',
    unit: 'mii/uL',
    refMin: 0.05,
    refMax: 0.7,
    interpretationNormal: 'Număr absolut de eozinofile normal.',
  },

  {
    name: 'Bazofil %',
    displayName: 'Bazofile (%)',
    unit: '%',
    refMin: 0,
    refMax: 2,
    interpretationHigh:
      'Bazofilie (rar). Poate apărea în leucemie mieloidă cronică.',
    interpretationNormal: 'Procentul de bazofile este normal.',
  },
  {
    name: 'Bazofil mii/uL',
    displayName: 'Bazofile (Absolut)',
    unit: 'mii/uL',
    refMin: 0,
    refMax: 0.2,
    interpretationNormal: 'Număr absolut de bazofile normal.',
  },

  // ============================================
  // RETICULOCITE (Eritrocite imature)
  // ============================================
  {
    name: 'Reticulocite %',
    displayName: 'Reticulocite (%)',
    unit: '%',
    refMin: 0.2,
    refMax: 2.0,
    interpretationHigh:
      'Reticulocitoză. Indică producție crescută de eritrocite.',
    interpretationNormal: 'Procentul de reticulocite este normal.',
    interpretationLow:
      'Reticulocitopenie. Indică producție scăzută de eritrocite.',
  },
  {
    name: 'Reticulocite mii/uL',
    displayName: 'Reticulocite (Absolut)',
    unit: 'mii/uL',
    refMin: 30,
    refMax: 120,
    interpretationNormal: 'Număr absolut de reticulocite normal.',
  },
  {
    name: 'Fractia reticulocitelor imature',
    displayName: 'IRF (Fracția reticulocitelor imature)',
    unit: '%',
    refMin: 2.3,
    refMax: 13.4,
    interpretationHigh:
      'Răspuns medular activ la anemie sau pierdere de sânge.',
    interpretationNormal: 'Fracția reticulocitelor imature este normală.',
  },
  {
    name: 'Echivalent al hemoglobinei reticulocitare (RET-He)',
    displayName: 'RET-He (Hemoglobină reticulocitară)',
    unit: 'pg',
    refMin: 28,
    refMax: 35,
    interpretationLow:
      'Eritropoieză deficitară în fier. Indicator timpuriu al deficitului funcțional de fier.',
    interpretationNormal:
      'Conținutul de hemoglobină al reticulocitelor este normal.',
  },

  // ============================================
  // IMUNOLOGIE - Anticorpi Celiachie
  // ============================================
  {
    name: 'Anticorpi anti-transglutaminaza IgA',
    displayName: 'Anti-transglutaminază IgA',
    unit: 'U',
    refMin: 0,
    refMax: 20,
    interpretationNormal: 'Negativ. Fără semne serologice de boală celiacă.',
    interpretationHigh:
      'Pozitiv. Sugestiv pentru boală celiacă (intoleranță la gluten).',
  },
  {
    name: 'Anticorpi anti-transglutaminaza IgG',
    displayName: 'Anti-transglutaminază IgG',
    unit: 'U',
    refMin: 0,
    refMax: 20,
    interpretationNormal: 'Negativ.',
    interpretationHigh:
      'Pozitiv. Poate indica boală celiacă, mai ales la persoanele cu deficit selectiv de IgA.',
  },

  // ============================================
  // ANALIZE URINARE - Examen biochimic
  // ============================================
  {
    name: 'densitate',
    displayName: 'Densitate urinară',
    unit: '',
    refMin: 1.015,
    refMax: 1.025,
    interpretationLow: 'Urină diluată (hipostenuria).',
    interpretationNormal: 'Densitatea urinară este normală.',
    interpretationHigh: 'Urină concentrată (hiperstenuria).',
  },
  {
    name: 'pH',
    displayName: 'pH urinar',
    unit: '',
    refMin: 4.8,
    refMax: 7.4,
    interpretationLow: 'Urină acidă.',
    interpretationNormal: 'pH-ul urinar este normal.',
    interpretationHigh: 'Urină alcalină.',
  },
  {
    name: 'nitriti',
    displayName: 'Nitriți urinari',
    unit: '',
    refMin: 0,
    refMax: 0,
    interpretationNormal: 'Negativ. Fără semne de infecție bacteriană urinară.',
    interpretationHigh:
      'Pozitiv. Indică prezența bacteriilor în urină (infecție urinară).',
  },
  {
    name: 'leucocite (esteraza granulocitara)',
    displayName: 'Leucocite urinare (esterază)',
    unit: '/μL',
    refMin: 0,
    refMax: 10,
    interpretationNormal: 'Negativ. Fără leucocite în urină.',
    interpretationHigh:
      'Pozitiv. Leucociturie - indică inflamație sau infecție.',
  },
  {
    name: 'proteine',
    displayName: 'Proteine urinare',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 10,
    interpretationHigh: 'Proteinurie. Poate indica boală renală.',
    interpretationNormal: 'Fără proteine în urină (normal).',
  },

  {
    name: 'corpi cetonici',
    displayName: 'Corpi cetonici urinari',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 5,
    interpretationNormal: 'Negativ. Fără corpi cetonici în urină.',
    interpretationHigh:
      'Cetonurie. Poate indica diabet zaharat decompensat (cetoacidoză).',
  },
  {
    name: 'urobilinogen',
    displayName: 'Urobilinogen urinar',
    unit: 'mg/dL',
    refMin: 0.1,
    refMax: 1.0,
    interpretationNormal: 'Normal. Prezența normală în urină.',
    interpretationHigh:
      'Urobilinogen crescut. Poate indica hemoliza sau boală hepatică.',
  },
  {
    name: 'bilirubina urinara',
    displayName: 'Bilirubină urinară',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 0,
    interpretationNormal: 'Negativ. Fără bilirubină în urină (normal).',
    interpretationHigh:
      'Bilirubinurie. Indică icter obstructiv sau hepatocelular.',
  },
  {
    name: 'hematii (hemoglobina)',
    displayName: 'Hematii/Hemoglobină urinară',
    unit: '/μL',
    refMin: 0,
    refMax: 5,
    interpretationNormal: 'Negativ. Fără sânge în urină.',
    interpretationHigh:
      'Hematurie. Poate indica infecție urinară, litiază renală.',
  },

  // ============================================
  // ANALIZE URINARE - Sediment microscopic
  // ============================================
  {
    name: 'Leucocite',
    displayName: 'Leucocite (sediment urinar)',
    unit: '/hpf',
    refMin: 0,
    refMax: 4,
    interpretationHigh:
      'Leucociturie. Indică inflamație sau infecție a tractului urinar.',
    interpretationNormal:
      'Leucocitele în sediment urinar sunt în limite normale.',
  },
  {
    name: 'Cristale oxalat de calciu',
    displayName: 'Cristale de oxalat de calciu',
    unit: '',
    refMin: 0,
    refMax: 0,
    interpretationNormal: 'Absente (normal).',
    interpretationHigh: 'Prezente. Pot indica risc de litiază renală.',
  },

  // ============================================
  // ALTE TESTE COMUNE BIOCHIMICE
  // ============================================
  {
    name: 'Colesterol Total',
    displayName: 'Colesterol Total',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 200,
    interpretationHigh: 'Hipercolesterolemie. Risc cardiovascular crescut.',
    interpretationNormal: 'Colesterolul total este optim.',
  },
  {
    name: 'Colesterol HDL',
    displayName: 'Colesterol HDL ("colesterolul bun")',
    unit: 'mg/dL',
    refMin: 40,
    refMax: 999,
    interpretationLow: 'HDL scăzut. Risc cardiovascular crescut.',
    interpretationNormal: 'HDL în limite protectoare.',
  },
  {
    name: 'Colesterol LDL',
    displayName: 'Colesterol LDL ("colesterolul rău")',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 100,
    interpretationHigh: 'LDL crescut. Risc major de ateroscleroză.',
    interpretationNormal: 'LDL optim.',
  },
  {
    name: 'Trigliceride',
    displayName: 'Trigliceride',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 150,
    interpretationHigh: 'Hipertrigliceridemie. Risc cardiovascular.',
    interpretationNormal: 'Trigliceridele sunt în limite normale.',
  },

  // ✅ ACEASTA e cea corectă pentru GLICEMIA DIN SÂNGE!
  {
    name: 'Glicemie (Glucoză serică)',
    displayName: 'Glicemie (Glucoză a jeun)',
    unit: 'mg/dL',
    refMin: 70,
    refMax: 99,
    interpretationLow: 'Hipoglicemie. Necesită atenție medicală.',
    interpretationNormal: 'Glicemia la jeun este normală.',
    interpretationHigh:
      'Hiperglicemie. Pre-diabet (100-125) sau diabet (≥126).',
  },

  {
    name: 'Hemoglobină Glicozilată (HbA1c)',
    displayName: 'HbA1c (Hemoglobină glicată)',
    unit: '%',
    refMin: 0,
    refMax: 5.7,
    interpretationNormal: 'Media glicemiei pe ultimele 2-3 luni este normală.',
    interpretationHigh:
      'HbA1c crescut. Pre-diabet (5.7-6.4%) sau diabet (≥6.5%).',
  },
  {
    name: 'Uree serică',
    displayName: 'Uree',
    unit: 'mg/dL',
    refMin: 15,
    refMax: 45,
    interpretationLow: 'Uree scăzută. Poate indica malnutriție proteică.',
    interpretationHigh:
      'Azotemie (uree crescută). Poate indica disfuncție renală.',
    interpretationNormal: 'Ureea este în limite normale.',
  },
  {
    name: 'Creatinină serică',
    displayName: 'Creatinină',
    unit: 'mg/dL',
    refMin: 0.6,
    refMax: 1.3,
    interpretationHigh:
      'Creatinină crescută. Indicator al funcției renale reduse.',
    interpretationNormal: 'Creatinina este în limite normale.',
  },
  {
    name: 'Acid uric',
    displayName: 'Acid uric (uricemie)',
    unit: 'mg/dL',
    refMin: 3.5,
    refMax: 7.2,
    interpretationHigh: 'Hiperuricemie. Risc de gută și litiază renală.',
    interpretationNormal: 'Acidul uric este în limite normale.',
  },
  {
    name: 'VSH (Viteza de Sedimentare a Hematiilor)',
    displayName: 'VSH',
    unit: 'mm/h',
    refMin: 0,
    refMax: 20,
    interpretationNormal: 'VSH normal. Fără semne de inflamație acută.',
    interpretationHigh: 'VSH crescut. Indicator nespecific de inflamație.',
  },
  {
    name: 'TSH (Hormón tiroidian)',
    displayName: 'TSH (Tireostimulină)',
    unit: 'μUI/mL',
    refMin: 0.4,
    refMax: 4.0,
    interpretationLow: 'TSH scăzut. Hipertiroidism.',
    interpretationNormal: 'Funcția tiroidiană este normală.',
    interpretationHigh: 'TSH crescut. Hipotiroidism.',
  },
  {
    name: 'Vitamina D (25-OH)',
    displayName: 'Vitamina D (25-hidroxivitamina D)',
    unit: 'ng/mL',
    refMin: 30,
    refMax: 100,
    interpretationLow: 'Deficit de vitamina D. Risc de osteoporoză.',
    interpretationNormal: 'Nivelul de vitamina D este optim.',
    interpretationHigh: 'Vitamina D foarte crescută. Poate indica intoxicație.',
  },
  {
    name: 'Vitamina B12',
    displayName: 'Vitamina B12 (Cobalamină)',
    unit: 'pg/mL',
    refMin: 200,
    refMax: 900,
    interpretationLow:
      'Deficit de B12. Risc de anemie megaloblastică, neuropatie.',
    interpretationNormal: 'Vitamina B12 este în limite normale.',
  },
  {
    name: 'Acid folic (Folați)',
    displayName: 'Acid folic',
    unit: 'ng/mL',
    refMin: 3,
    refMax: 17,
    interpretationLow: 'Deficit de acid folic. Risc de anemie megaloblastică.',
    interpretationNormal: 'Acidul folic este în limite normale.',
  },
  {
    name: 'Ag HBs (Hepatita B)',
    displayName: 'Antigen HBs (Hepatita B)',
    unit: '',
    refMin: 0,
    refMax: 0,
    interpretationNormal: 'Negativ. Nu există infecție activă cu VHB.',
    interpretationHigh: 'Pozitiv/Reactiv. Indică infecție activă cu VHB.',
  },
  {
    name: 'Ac Anti-HBs (Hepatita B)',
    displayName: 'Anticorpi Anti-HBs',
    unit: 'mUI/mL',
    refMin: 10,
    refMax: 999999,
    interpretationLow: 'Negativ (sub 10). Lipsă de imunitate.',
    interpretationNormal: 'Pozitiv (peste 10). Imunitate prezentă.',
  },
  {
    name: 'Ac Anti-HCV (Hepatita C)',
    displayName: 'Anticorpi Anti-HCV (Hepatita C)',
    unit: '',
    refMin: 0,
    refMax: 0,
    interpretationNormal: 'Negativ. Fără contact cu VHC.',
    interpretationHigh: 'Pozitiv/Reactiv. Indică infecție VHC.',
  },
  {
    name: 'Ag HIV 1+2',
    displayName: 'Test HIV (Anticorpi + Antigen)',
    unit: '',
    refMin: 0,
    refMax: 0,
    interpretationNormal: 'Negativ. Fără infecție cu HIV.',
    interpretationHigh:
      'Pozitiv/Reactiv. Test de screening pozitiv pentru HIV.',
  },
  {
    name: 'Troponina I',
    displayName: 'Troponină I (marker cardiac)',
    unit: 'ng/mL',
    refMin: 0,
    refMax: 0.04,
    interpretationHigh: 'Troponină crescută. Indică leziune cardiacă. URGENȚĂ!',
    interpretationNormal: 'Troponina normală.',
  },
  {
    name: 'CK-MB (Creatinkinaza)',
    displayName: 'CK-MB',
    unit: 'U/L',
    refMin: 0,
    refMax: 25,
    interpretationHigh: 'CK-MB crescut. Indică posibil infarct miocardic.',
    interpretationNormal: 'CK-MB în limite normale.',
  },
  {
    name: 'LDH (Lactat dehidrogenaza)',
    displayName: 'LDH',
    unit: 'U/L',
    refMin: 135,
    refMax: 225,
    interpretationHigh:
      'LDH crescut. Indicator nespecific de leziune tisulară.',
    interpretationNormal: 'LDH în limite normale.',
  },
  {
    name: 'T3 (Triiodotironina)',
    displayName: 'T3 liber',
    unit: 'pg/mL',
    refMin: 2.0,
    refMax: 4.4,
    interpretationLow: 'T3 scăzut. Hipotiroidism.',
    interpretationNormal: 'T3 în limite normale.',
    interpretationHigh: 'T3 crescut. Hipertiroidism.',
  },
  {
    name: 'T4 (Tiroxina)',
    displayName: 'T4 liber',
    unit: 'ng/dL',
    refMin: 0.93,
    refMax: 1.7,
    interpretationLow: 'T4 scăzut. Hipotiroidism.',
    interpretationNormal: 'T4 în limite normale.',
    interpretationHigh: 'T4 crescut. Hipertiroidism.',
  },
  {
    name: 'INR',
    displayName: 'INR',
    unit: '',
    refMin: 0.8,
    refMax: 1.2,
    interpretationHigh: 'INR crescut. Sânge "subțire", risc de sângerare.',
    interpretationNormal: 'INR normal. Coagulare normală.',
  },
  {
    name: 'Timp de protrombina (PT)',
    displayName: 'Timp de protrombină (PT)',
    unit: 'secunde',
    refMin: 11,
    refMax: 13.5,
    interpretationHigh: 'PT prelungit. Risc de sângerare.',
    interpretationNormal: 'Timpul de protrombină este normal.',
  },
  {
    name: 'APTT',
    displayName: 'APTT',
    unit: 'secunde',
    refMin: 25,
    refMax: 35,
    interpretationHigh: 'APTT prelungit. Risc de sângerare.',
    interpretationNormal: 'APTT în limite normale.',
  },
  {
    name: 'Fibrinogen',
    displayName: 'Fibrinogen',
    unit: 'mg/dL',
    refMin: 200,
    refMax: 400,
    interpretationLow: 'Fibrinogen scăzut. Risc de sângerare severă.',
    interpretationNormal: 'Fibrinogenul este normal.',
    interpretationHigh: 'Fibrinogen crescut. Poate indica inflamație.',
  },
  {
    name: 'Estradiol (E2)',
    displayName: 'Estradiol',
    unit: 'pg/mL',
    refMin: 15,
    refMax: 350,
    interpretationLow: 'Estradiol scăzut. Poate indica menopauză.',
    interpretationNormal: 'Estradiol în limite normale.',
  },
  {
    name: 'Progesteron',
    displayName: 'Progesteron',
    unit: 'ng/mL',
    refMin: 0.2,
    refMax: 25,
    interpretationLow: 'Progesteron scăzut. Poate indica lipsa ovulației.',
    interpretationNormal: 'Progesteron normal.',
  },
  {
    name: 'FSH (Hormon foliculostimulant)',
    displayName: 'FSH',
    unit: 'mUI/mL',
    refMin: 1.5,
    refMax: 12.4,
    interpretationHigh: 'FSH crescut. Poate indica menopauză.',
    interpretationNormal: 'FSH în limite normale.',
  },
  {
    name: 'LH (Hormon luteinizant)',
    displayName: 'LH',
    unit: 'mUI/mL',
    refMin: 1.7,
    refMax: 8.6,
    interpretationHigh: 'LH crescut. Poate indica ovulație sau menopauză.',
    interpretationNormal: 'LH în limite normale.',
  },
  {
    name: 'Testosteron total',
    displayName: 'Testosteron total',
    unit: 'ng/dL',
    refMin: 300,
    refMax: 1000,
    interpretationLow: 'Hipogonadism (testosteron scăzut).',
    interpretationNormal: 'Testosteronul este în limite normale.',
  },
  {
    name: 'PSA (Antigen specific prostatic)',
    displayName: 'PSA',
    unit: 'ng/mL',
    refMin: 0,
    refMax: 4.0,
    interpretationHigh: 'PSA crescut. Poate indica HBP sau cancer de prostată.',
    interpretationNormal: 'PSA în limite normale.',
  },
  {
    name: 'Homocisteina',
    displayName: 'Homocisteină',
    unit: 'μmol/L',
    refMin: 5,
    refMax: 15,
    interpretationHigh: 'Homocisteină crescută. Risc cardiovascular crescut.',
    interpretationNormal: 'Homocisteina este în limite normale.',
  },
  {
    name: 'Amilaza',
    displayName: 'Amilază serică',
    unit: 'U/L',
    refMin: 28,
    refMax: 100,
    interpretationHigh: 'Amilază crescută. Indică pancreatită acută.',
    interpretationNormal: 'Amilaza este în limite normale.',
  },
  {
    name: 'Lipaza',
    displayName: 'Lipază serică',
    unit: 'U/L',
    refMin: 13,
    refMax: 60,
    interpretationHigh:
      'Lipază crescută. Indicator specific pentru pancreatită acută.',
    interpretationNormal: 'Lipaza este în limite normale.',
  },
  {
    name: 'Fosfataza alcalina',
    displayName: 'Fosfatază alcalină (ALP)',
    unit: 'U/L',
    refMin: 40,
    refMax: 150,
    interpretationHigh:
      'Fosfatază alcalină crescută. Poate indica colestază sau boli osoase.',
    interpretationNormal: 'Fosfataza alcalină este în limite normale.',
  },
  {
    name: 'Magneziu',
    displayName: 'Magneziu seric',
    unit: 'mg/dL',
    refMin: 1.7,
    refMax: 2.2,
    interpretationLow: 'Hipomagnezemiie. Poate cauza crampe musculare.',
    interpretationNormal: 'Magneziul este în limite normale.',
    interpretationHigh: 'Hipermagnezemiie (rar).',
  },
  {
    name: 'Potasiu (K+)',
    displayName: 'Potasiu seric',
    unit: 'mmol/L',
    refMin: 3.5,
    refMax: 5.1,
    interpretationLow: 'Hipokaliemie. Risc de aritmii cardiace.',
    interpretationNormal: 'Potasiul este în limite normale.',
    interpretationHigh: 'Hiperkaliemie. Risc de aritmii cardiace SEVERE.',
  },
  {
    name: 'Sodiu (Na+)',
    displayName: 'Sodiu seric',
    unit: 'mmol/L',
    refMin: 136,
    refMax: 145,
    interpretationLow: 'Hiponatremie. Poate cauza confuzie, convulsii.',
    interpretationNormal: 'Sodiul este în limite normale.',
    interpretationHigh: 'Hipernatremie. Indică deshidratare.',
  },
  {
    name: 'Clor (Cl-)',
    displayName: 'Clor seric',
    unit: 'mmol/L',
    refMin: 98,
    refMax: 107,
    interpretationLow: 'Hipocloremie. Poate apărea în vărsături prelungite.',
    interpretationNormal: 'Clorul este în limite normale.',
    interpretationHigh: 'Hipercloremie. Poate apărea în deshidratare.',
  },
];

async function main() {
  console.log(
    '🔄 Începem popularea bazei de date cu analize ÎMBUNĂTĂȚITE...\n',
  );

  for (const analysis of analysisTypesData) {
    await prisma.analysisType.upsert({
      where: { name: analysis.name },
      update: analysis,
      create: analysis,
    });
    console.log(`✅ Procesat: '${analysis.displayName || analysis.name}'`);
  }

  const totalInDb = await prisma.analysisType.count();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Populare finalizată cu succes!`);
  console.log(`📊 Total analize în baza de date: ${totalInDb}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main()
  .catch((e) => {
    console.error('❌ Eroare în timpul populării:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
