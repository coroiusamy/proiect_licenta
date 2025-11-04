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
    refMin: 0.1, // Valori de referință calculate (Total Min - Direct Max)
    refMax: 1.0, // Valori de referință calculate (Total Max - Direct Min)
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
    displayName: 'Albumină',
    unit: '%',
    refMin: 53.8,
    refMax: 65.2,
    interpretationLow:
      'Hipoalbuminemie. Poate indica malnutriție, boală hepatică, sindrom nefrotic sau inflamație.',
    interpretationNormal: 'Albumina este în limite normale.',
  },
  {
    name: 'Alfa 1 gl%',
    displayName: 'Alfa 1 Globuline',
    unit: '%',
    refMin: 1.1,
    refMax: 3.7,
    interpretationHigh: 'Crescute în inflamații acute și infecții.',
    interpretationNormal: 'Alfa 1 globulinele sunt în limite normale.',
  },
  {
    name: 'Alfa 2 gl%',
    displayName: 'Alfa 2 Globuline',
    unit: '%',
    refMin: 8.5,
    refMax: 14.5,
    interpretationHigh: 'Crescute în sindrom nefrotic, inflamații cronice.',
    interpretationNormal: 'Alfa 2 globulinele sunt în limite normale.',
  },
  {
    name: 'Beta gl%',
    displayName: 'Beta Globuline',
    unit: '%',
    refMin: 8.6,
    refMax: 14.8,
    interpretationHigh: 'Crescute în hiperlipidemie, anemie feriprivă.',
    interpretationNormal: 'Beta globulinele sunt în limite normale.',
  },
  {
    name: 'Gamma gl%',
    displayName: 'Gamma Globuline',
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
  // NOTĂ: În PDF-urile Synevo, fiecare tip apare de 2 ori:
  // 1. Ca procentaj (ex: "Neutrofil 63 %")
  // 2. Ca valoare absolută (ex: "Neutrofil 3.66 mii/μL")
  // Parser-ul va extrage PRIMA valoare întâlnită după numele analizei

  {
    name: 'Neutrofil',
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
    name: 'Limfocit',
    displayName: 'Limfocite (%)',
    unit: '%',
    refMin: 20,
    refMax: 55,
    interpretationLow:
      'Limfopenie. Poate indica imunosupresie sau infecții acute.',
    interpretationNormal: 'Procentul de limfocite este normal.',
    interpretationHigh:
      'Limfocitoză. Caracteristică pentru infecții virale (mononucleoză, rujeolă) sau leucemie limfocitară cronică.',
  },
  {
    name: 'Monocit',
    displayName: 'Monocite (%)',
    unit: '%',
    refMin: 0,
    refMax: 15,
    interpretationHigh:
      'Monocitoză. Poate indica infecții cronice (tuberculoză), inflamație sau boli autoimune.',
    interpretationNormal: 'Procentul de monocite este normal.',
  },
  {
    name: 'Eozinofil',
    displayName: 'Eozinofile (%)',
    unit: '%',
    refMin: 0,
    refMax: 7,
    interpretationHigh:
      'Eozinofilie. Caracteristică pentru alergii, astm, infecții parazitare sau boli de piele.',
    interpretationNormal: 'Procentul de eozinofile este normal.',
  },
  {
    name: 'Bazofil',
    displayName: 'Bazofile (%)',
    unit: '%',
    refMin: 0,
    refMax: 2,
    interpretationHigh:
      'Bazofilie (rar). Poate apărea în leucemie mieloidă cronică sau reacții alergice severe.',
    interpretationNormal: 'Procentul de bazofile este normal.',
  },

  // Note: În PDF-ul Synevo, valorile absolute (mii/μL) apar imediat după procentaje
  // dar au același nume. Parser-ul va extrage PRIMA valoare (%).
  // Dacă vrei și valorile absolute, ar trebui să existe intrări separate în PDF
  // sau să modifici logica parser-ului să detecteze unitatea de măsură.

  // ============================================
  // RETICULOCITE (Eritrocite imature)
  // ============================================
  {
    name: 'Reticulocite',
    displayName: 'Reticulocite',
    unit: '%',
    refMin: 0.2,
    refMax: 2.0,
    interpretationHigh:
      'Reticulocitoză. Indică producție crescută de eritrocite (hemoliză, pierdere acută de sânge sau răspuns la tratament cu fier/B12).',
    interpretationNormal: 'Procentul de reticulocite este normal.',
    interpretationLow:
      'Reticulocitopenie. Indică producție scăzută de eritrocite (aplazia medulară, anemii aregerative).',
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
      'Pozitiv. Sugestiv pentru boală celiacă (intoleranță la gluten). Se recomandă biopsie intestinală pentru confirmare.',
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
    interpretationLow:
      'Urină diluată (hipostenuria). Poate indica polidipsie, diabet insipid sau insuficiență renală.',
    interpretationNormal: 'Densitatea urinară este normală.',
    interpretationHigh:
      'Urină concentrată (hiperstenuria). Poate indica deshidratare, glicozurie sau proteinurie.',
  },
  {
    name: 'pH',
    displayName: 'pH urinar',
    unit: '',
    refMin: 4.8,
    refMax: 7.4,
    interpretationLow:
      'Urină acidă. Poate apărea în acidoză metabolică, diabet zaharat, dietă hiperproteică.',
    interpretationNormal: 'pH-ul urinar este normal.',
    interpretationHigh:
      'Urină alcalină. Poate indica infecție urinară, acidoză respiratorie, dietă vegetariană.',
  },
  {
    name: 'nitriti',
    displayName: 'Nitriți urinari',
    unit: '',
    interpretationNormal: 'Negativ. Fără semne de infecție bacteriană urinară.',
    interpretationHigh:
      'Pozitiv. Indică prezența bacteriilor în urină (infecție urinară). Se recomandă urocultură și antibiogramă.',
  },
  {
    name: 'leucocite (esteraza granulocitara)',
    displayName: 'Leucocite urinare (esterază)',
    unit: '/μL',
    interpretationNormal: 'Negativ. Fără leucocite în urină.',
    interpretationHigh:
      'Pozitiv. Leucociturie - indică inflamație sau infecție a tractului urinar.',
  },
  {
    name: 'proteine',
    displayName: 'Proteine urinare',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 10,
    interpretationHigh:
      'Proteinurie. Poate indica boală renală (glomerulonefrită, sindrom nefrotic), infecție urinară sau efort fizic intens.',
    interpretationNormal: 'Fără proteine în urină (normal).',
  },
  {
    name: 'glucoza',
    displayName: 'Glucoză urinară',
    unit: 'mg/dL',
    interpretationNormal: 'Nedetectabil (normal). Fără glucoză în urină.',
    interpretationHigh:
      'Glicozurie. Indică diabet zaharat necontrolat sau (rar) glicozurie renală.',
  },
  {
    name: 'corpi cetonici',
    displayName: 'Corpi cetonici urinari',
    unit: 'mg/dL',
    interpretationNormal: 'Negativ. Fără corpi cetonici în urină.',
    interpretationHigh:
      'Cetonurie. Poate indica diabet zaharat decompensat (cetoacidoză), înfometare, dietă ketogenă sau vărsături prelungite.',
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
    interpretationNormal: 'Negativ. Fără bilirubină în urină (normal).',
    interpretationHigh:
      'Bilirubinurie. Indică icter obstructiv sau hepatocelular (boală hepatică sau a căilor biliare).',
  },
  {
    name: 'hematii (hemoglobina)',
    displayName: 'Hematii/Hemoglobină urinară',
    unit: '/μL',
    interpretationNormal: 'Negativ. Fără sânge în urină.',
    interpretationHigh:
      'Hematurie. Poate indica infecție urinară, litiază renală, traumatism, tumori sau boli renale.',
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
      'Leucociturie. Indică inflamație sau infecție a tractului urinar (cistită, pielonefrită).',
    interpretationNormal:
      'Leucocitele în sediment urinar sunt în limite normale (1-4/câmp).',
  },
  {
    name: 'Cristale oxalat de calciu',
    displayName: 'Cristale de oxalat de calciu',
    unit: '',
    interpretationNormal: 'Absente (normal).',
    interpretationHigh:
      'Prezente. Pot apărea în urină normală acidă, dar în exces indică risc de litiază renală (pietre la rinichi).',
  },

  // ============================================
  // ALTE TESTE COMUNE (nu sunt în PDF-uri dar sunt utile)
  // ============================================
  {
    name: 'Colesterol Total',
    displayName: 'Colesterol Total',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 200,
    interpretationHigh:
      'Hipercolesterolemie. Risc cardiovascular crescut. Se recomandă modificarea dietei și consult cardiologic.',
    interpretationNormal: 'Colesterolul total este optim (sub 200 mg/dL).',
  },
  {
    name: 'Colesterol HDL',
    displayName: 'Colesterol HDL ("colesterolul bun")',
    unit: 'mg/dL',
    refMin: 40,
    refMax: 999,
    interpretationLow:
      'HDL scăzut. Risc cardiovascular crescut. Se recomandă exercițiu fizic și dietă bogată în grăsimi sănătoase (omega-3).',
    interpretationNormal:
      'HDL în limite protectoare (peste 40 mg/dL, ideal peste 60).',
  },
  {
    name: 'Colesterol LDL',
    displayName: 'Colesterol LDL ("colesterolul rău")',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 100,
    interpretationHigh:
      'LDL crescut. Risc major de ateroscleroză și infarct miocardic. Se recomandă dietă săracă în grăsimi saturate și consult medical.',
    interpretationNormal: 'LDL optim (sub 100 mg/dL).',
  },
  {
    name: 'Trigliceride',
    displayName: 'Trigliceride',
    unit: 'mg/dL',
    refMin: 0,
    refMax: 150,
    interpretationHigh:
      'Hipertrigliceridemie. Risc cardiovascular. Adesea legat de obezitate, consum excesiv de carbohidrați/alcool sau diabet.',
    interpretationNormal:
      'Trigliceridele sunt în limite normale (sub 150 mg/dL).',
  },
  {
    name: 'Glicemie (Glucoză serică)',
    displayName: 'Glicemie (Glucoză a jeun)',
    unit: 'mg/dL',
    refMin: 70,
    refMax: 99,
    interpretationLow:
      'Hipoglicemie. Poate cauza amețeli, transpirații, tremurături. Necesită atenție medicală.',
    interpretationNormal: 'Glicemia la jeun este normală (70-99 mg/dL).',
    interpretationHigh:
      'Hiperglicemie. Pre-diabet (100-125) sau diabet zaharat (≥126). Se recomandă HbA1c și consult endocrinologic.',
  },
  {
    name: 'Hemoglobină Glicozilată (HbA1c)',
    displayName: 'HbA1c (Hemoglobină glicată)',
    unit: '%',
    refMin: 0,
    refMax: 5.7,
    interpretationNormal:
      'Media glicemiei pe ultimele 2-3 luni este normală. Risc scăzut de diabet.',
    interpretationHigh:
      'HbA1c crescut. Pre-diabet (5.7-6.4%) sau diabet (≥6.5%). Necesită monitorizare strictă și tratament.',
  },
  {
    name: 'Uree serică',
    displayName: 'Uree',
    unit: 'mg/dL',
    refMin: 15,
    refMax: 45,
    interpretationLow:
      'Uree scăzută. Poate indica malnutriție proteică severă sau boală hepatică avansată.',
    interpretationHigh:
      'Azotemie (uree crescută). Poate indica disfuncție renală, deshidratare sau dietă hiperproteică.',
    interpretationNormal: 'Ureea este în limite normale.',
  },
  {
    name: 'Creatinină serică',
    displayName: 'Creatinină',
    unit: 'mg/dL',
    refMin: 0.6,
    refMax: 1.3,
    interpretationHigh:
      'Creatinină crescută. Indicator important al funcției renale reduse (insuficiență renală). Se recomandă consult nefrologic și calcul RFG.',
    interpretationNormal: 'Creatinina este în limite normale.',
  },
  {
    name: 'Acid uric',
    displayName: 'Acid uric (uricemie)',
    unit: 'mg/dL',
    refMin: 3.5,
    refMax: 7.2,
    interpretationHigh:
      'Hiperuricemie. Risc de gută (artrita gutoasă) și litiază renală. Legat de dietă bogată în purine (carne roșie, fructe de mare) sau disfuncție renală.',
    interpretationNormal: 'Acidul uric este în limite normale.',
  },
  {
    name: 'VSH (Viteza de Sedimentare a Hematiilor)',
    displayName: 'VSH',
    unit: 'mm/h',
    refMin: 0,
    refMax: 20,
    interpretationNormal: 'VSH normal. Fără semne de inflamație acută.',
    interpretationHigh:
      'VSH crescut. Indicator nespecific de inflamație, infecție, anemie sau boli autoimune (artrita reumatoidă, lupus).',
  },
  {
    name: 'TSH (Hormón tiroidian)',
    displayName: 'TSH (Tireostimulină)',
    unit: 'μUI/mL',
    refMin: 0.4,
    refMax: 4.0,
    interpretationLow:
      'TSH scăzut. Hipertiroidism (glanda tiroidă hipeactivă). Simptome: palpitații, scădere în greutate, nervozitate.',
    interpretationNormal: 'Funcția tiroidiană este normală.',
    interpretationHigh:
      'TSH crescut. Hipotiroidism (glanda tiroidă hipoactivă). Simptome: oboseală, creștere în greutate, intoleranță la rece.',
  },
  {
    name: 'Vitamina D (25-OH)',
    displayName: 'Vitamina D (25-hidroxivitamina D)',
    unit: 'ng/mL',
    refMin: 30,
    refMax: 100,
    interpretationLow:
      'Deficit de vitamina D. Risc de osteoporoză, slăbiciune musculară și imunitate scăzută. Se recomandă suplimentare.',
    interpretationNormal: 'Nivelul de vitamina D este optim (30-100 ng/mL).',
    interpretationHigh:
      'Vitamina D foarte crescută. Poate indica intoxicație (hipercalcemie). Rareori periculoasă dacă sub 150 ng/mL.',
  },
  {
    name: 'Vitamina B12',
    displayName: 'Vitamina B12 (Cobalamină)',
    unit: 'pg/mL',
    refMin: 200,
    refMax: 900,
    interpretationLow:
      'Deficit de B12. Cauze: dietă vegetariană/vegană strictă, malabsorbție, anemie pernicioasă. Simptome: anemie megaloblastică, neuropatie.',
    interpretationNormal: 'Vitamina B12 este în limite normale.',
  },
  {
    name: 'Acid folic (Folați)',
    displayName: 'Acid folic',
    unit: 'ng/mL',
    refMin: 3,
    refMax: 17,
    interpretationLow:
      'Deficit de acid folic. Cauze: dietă săracă în verdeturi, alcoolism, malabsorbție. Risc de anemie megaloblastică și defecte de tub neural la gravide.',
    interpretationNormal: 'Acidul folic este în limite normale.',
  },

  // ============================================
  // TESTE SEROLOGICE - Hepatite virale
  // ============================================
  {
    name: 'Ag HBs (Hepatita B)',
    displayName: 'Antigen HBs (Hepatita B)',
    unit: '',
    interpretationNormal:
      'Negativ. Nu există infecție activă cu virusul hepatitei B.',
    interpretationHigh:
      'Pozitiv/Reactiv. Indică infecție activă cu virusul hepatitei B (VHB). Necesită consult medical urgent și monitorizare.',
  },
  {
    name: 'Ac Anti-HBs (Hepatita B)',
    displayName: 'Anticorpi Anti-HBs',
    unit: 'mUI/mL',
    refMin: 10,
    refMax: 999999,
    interpretationLow:
      'Negativ sau sub 10 mUI/mL. Lipsă de imunitate față de hepatita B. Se recomandă vaccinare sau rapel.',
    interpretationNormal:
      'Pozitiv (peste 10 mUI/mL). Imunitate față de hepatita B (prin vaccinare sau infecție anterioară vindecată).',
  },
  {
    name: 'Ac Anti-HCV (Hepatita C)',
    displayName: 'Anticorpi Anti-HCV (Hepatita C)',
    unit: '',
    interpretationNormal:
      'Negativ. Fără contact anterior cu virusul hepatitei C.',
    interpretationHigh:
      'Pozitiv/Reactiv. Indică infecție prezentă sau trecută cu VHC. Necesită confirmare prin ARN-VHC și consult medical.',
  },
  {
    name: 'Ag HIV 1+2',
    displayName: 'Test HIV (Anticorpi + Antigen)',
    unit: '',
    interpretationNormal: 'Negativ. Fără infecție cu virusul HIV.',
    interpretationHigh:
      'Pozitiv/Reactiv. Test de screening pozitiv pentru HIV. Necesită confirmare prin Western Blot și consult la specialist boli infecțioase.',
  },

  // ============================================
  // MARKERI CARDIACI
  // ============================================
  {
    name: 'Troponina I',
    displayName: 'Troponină I (marker cardiac)',
    unit: 'ng/mL',
    refMin: 0,
    refMax: 0.04,
    interpretationHigh:
      'Troponină crescută. Indică leziune a mușchiului cardiac (infarct miocardic, angină instabilă). URGENȚĂ MEDICALĂ!',
    interpretationNormal:
      'Troponina normală. Fără semne de leziune cardiacă recentă.',
  },
  {
    name: 'CK-MB (Creatinkinaza)',
    displayName: 'CK-MB (Creatinkinaza fracția MB)',
    unit: 'U/L',
    refMin: 0,
    refMax: 25,
    interpretationHigh:
      'CK-MB crescut. Indică posibil infarct miocardic sau alte leziuni cardiace.',
    interpretationNormal: 'CK-MB în limite normale.',
  },
  {
    name: 'LDH (Lactat dehidrogenaza)',
    displayName: 'LDH',
    unit: 'U/L',
    refMin: 135,
    refMax: 225,
    interpretationHigh:
      'LDH crescut. Indicator nespecific de leziune tisulară (inimă, ficat, mușchi, eritrocite). Poate indica infarct, anemie hemolitică sau cancer.',
    interpretationNormal: 'LDH în limite normale.',
  },

  // ============================================
  // HORMONI TIROIDIENI
  // ============================================
  {
    name: 'T3 (Triiodotironina)',
    displayName: 'T3 liber',
    unit: 'pg/mL',
    refMin: 2.0,
    refMax: 4.4,
    interpretationLow: 'T3 scăzut. Hipotiroidism.',
    interpretationNormal: 'T3 în limite normale.',
    interpretationHigh:
      'T3 crescut. Hipertiroidism (boala Graves, adenom toxic).',
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

  // ============================================
  // COAGULARE
  // ============================================
  {
    name: 'INR',
    displayName: 'INR (Raport internațional normalizat)',
    unit: '',
    refMin: 0.8,
    refMax: 1.2,
    interpretationHigh:
      'INR crescut. Sânge "subțire" - risc de sângerare. Poate indica tratament cu anticoagulante (warfarină) sau deficit de vitamina K.',
    interpretationNormal: 'INR normal (0.8-1.2). Coagulare normală.',
  },
  {
    name: 'Timp de protrombina (PT)',
    displayName: 'Timp de protrombină (PT)',
    unit: 'secunde',
    refMin: 11,
    refMax: 13.5,
    interpretationHigh:
      'PT prelungit. Risc de sângerare. Cauze: deficit de factori de coagulare, boală hepatică, anticoagulante.',
    interpretationNormal: 'Timpul de protrombină este normal.',
  },
  {
    name: 'APTT',
    displayName: 'APTT (Timp parțial de tromboplastină)',
    unit: 'secunde',
    refMin: 25,
    refMax: 35,
    interpretationHigh:
      'APTT prelungit. Risc de sângerare. Cauze: hemofilie, deficit de factori de coagulare, tratament cu heparină.',
    interpretationNormal: 'APTT în limite normale.',
  },
  {
    name: 'Fibrinogen',
    displayName: 'Fibrinogen',
    unit: 'mg/dL',
    refMin: 200,
    refMax: 400,
    interpretationLow:
      'Fibrinogen scăzut. Risc de sângerare severă (coagulare intravasculară diseminată - CIVD).',
    interpretationNormal: 'Fibrinogenul este normal.',
    interpretationHigh:
      'Fibrinogen crescut. Poate indica inflamație acută sau risc tromboembolic.',
  },

  // ============================================
  // HORMONI SEXUALI (Femei)
  // ============================================
  {
    name: 'Estradiol (E2)',
    displayName: 'Estradiol',
    unit: 'pg/mL',
    refMin: 15,
    refMax: 350,
    interpretationLow:
      'Estradiol scăzut. Poate indica menopauză, insuficiență ovariană sau hipopituitarism.',
    interpretationNormal:
      'Estradiol în limite normale (variază în funcție de faza ciclului menstrual).',
  },
  {
    name: 'Progesteron',
    displayName: 'Progesteron',
    unit: 'ng/mL',
    refMin: 0.2,
    refMax: 25,
    interpretationLow:
      'Progesteron scăzut. Poate indica lipsa ovulației sau faza foliculară a ciclului.',
    interpretationNormal:
      'Progesteron normal (variază în funcție de faza ciclului).',
  },
  {
    name: 'FSH (Hormon foliculostimulant)',
    displayName: 'FSH',
    unit: 'mUI/mL',
    refMin: 1.5,
    refMax: 12.4,
    interpretationHigh:
      'FSH crescut. Poate indica menopauză, insuficiență ovariană primară sau (la bărbați) azoospermie.',
    interpretationNormal: 'FSH în limite normale.',
  },
  {
    name: 'LH (Hormon luteinizant)',
    displayName: 'LH',
    unit: 'mUI/mL',
    refMin: 1.7,
    refMax: 8.6,
    interpretationHigh:
      'LH crescut. Poate indica ovulație (normal), menopauză sau sindrom ovarian polichistic (PCOS).',
    interpretationNormal: 'LH în limite normale.',
  },

  // ============================================
  // HORMONI SEXUALI (Bărbați)
  // ============================================
  {
    name: 'Testosteron total',
    displayName: 'Testosteron total',
    unit: 'ng/dL',
    refMin: 300,
    refMax: 1000,
    interpretationLow:
      'Hipogonadism (testosteron scăzut). Simptome: scăderea libidoului, disfuncție erectilă, oboseală, pierdere de masă musculară.',
    interpretationNormal: 'Testosteronul este în limite normale.',
  },
  {
    name: 'PSA (Antigen specific prostatic)',
    displayName: 'PSA',
    unit: 'ng/mL',
    refMin: 0,
    refMax: 4.0,
    interpretationHigh:
      'PSA crescut. Poate indica hipertrofie benignă de prostată, prostatită sau (rar) cancer de prostată. Se recomandă consult urologic.',
    interpretationNormal: 'PSA în limite normale (sub 4 ng/mL).',
  },

  // ============================================
  // ALTE MARKERI IMPORTANȚI
  // ============================================
  {
    name: 'Homocisteina',
    displayName: 'Homocisteină',
    unit: 'μmol/L',
    refMin: 5,
    refMax: 15,
    interpretationHigh:
      'Homocisteină crescută. Risc cardiovascular crescut (ateroscleroză, tromboză). Cauze: deficit de B6, B12, acid folic.',
    interpretationNormal: 'Homocisteina este în limite normale.',
  },
  {
    name: 'Amilaza',
    displayName: 'Amilază serică',
    unit: 'U/L',
    refMin: 28,
    refMax: 100,
    interpretationHigh:
      'Amilază crescută. Indică pancreatită acută sau alte afecțiuni pancreatice.',
    interpretationNormal: 'Amilaza este în limite normale.',
  },
  {
    name: 'Lipaza',
    displayName: 'Lipază serică',
    unit: 'U/L',
    refMin: 13,
    refMax: 60,
    interpretationHigh:
      'Lipază crescută. Indicator mai specific pentru pancreatită acută decât amilaza.',
    interpretationNormal: 'Lipaza este în limite normale.',
  },
  {
    name: 'Fosfataza alcalina',
    displayName: 'Fosfatază alcalină (ALP)',
    unit: 'U/L',
    refMin: 40,
    refMax: 150,
    interpretationHigh:
      'Fosfatază alcalină crescută. Poate indica colestază (obstrucție biliară), boli osoase (Paget, metastaze) sau hepatită.',
    interpretationNormal: 'Fosfataza alcalină este în limite normale.',
  },
  {
    name: 'Magneziu',
    displayName: 'Magneziu seric',
    unit: 'mg/dL',
    refMin: 1.7,
    refMax: 2.2,
    interpretationLow:
      'Hipomagnezemiie. Poate cauza crampe musculare, aritmii cardiace și slăbiciune.',
    interpretationNormal: 'Magneziul este în limite normale.',
    interpretationHigh:
      'Hipermagnezemiie (rar). Poate apărea în insuficiență renală sau suplimentare excesivă.',
  },
  {
    name: 'Potasiu (K+)',
    displayName: 'Potasiu seric',
    unit: 'mmol/L',
    refMin: 3.5,
    refMax: 5.1,
    interpretationLow:
      'Hipokaliemie. Risc de aritmii cardiace, slăbiciune musculară. Cauze: diuretice, vărsături, diaree.',
    interpretationNormal: 'Potasiul este în limite normale.',
    interpretationHigh:
      'Hiperkaliemie. Risc de aritmii cardiace SEVERE (stop cardiac). Cauze: insuficiență renală, medicamente (IECA), acidoză. URGENȚĂ!',
  },
  {
    name: 'Sodiu (Na+)',
    displayName: 'Sodiu seric',
    unit: 'mmol/L',
    refMin: 136,
    refMax: 145,
    interpretationLow:
      'Hiponatremie. Poate cauza confuzie, letargie, convulsii. Cauze: exces de lichide, insuficiență cardiacă, diuretice.',
    interpretationNormal: 'Sodiul este în limite normale.',
    interpretationHigh:
      'Hipernatremie. Poate cauza confuzie, sete extremă. Cauze: deshidratare severă, diabet insipid.',
  },
  {
    name: 'Clor (Cl-)',
    displayName: 'Clor seric',
    unit: 'mmol/L',
    refMin: 98,
    refMax: 107,
    interpretationLow:
      'Hipocloremie. Poate apărea în vărsături prelungite sau alcaloză metabolică.',
    interpretationNormal: 'Clorul este în limite normale.',
    interpretationHigh:
      'Hipercloremie. Poate apărea în deshidratare sau acidoză metabolică.',
  },
];

async function main() {
  console.log('🔄 Începem popularea bazei de date cu analize Synevo...\n');

  let addedCount = 0;
  let updatedCount = 0;

  for (const analysis of analysisTypesData) {
    const existing = await prisma.analysisType.findUnique({
      where: { name: analysis.name },
    });

    if (existing) {
      await prisma.analysisType.update({
        where: { name: analysis.name },
        data: analysis,
      });
      updatedCount++;
      console.log(`✏️  Actualizat: '${analysis.displayName || analysis.name}'`);
    } else {
      await prisma.analysisType.create({
        data: analysis,
      });
      addedCount++;
      console.log(`✅ Adăugat: '${analysis.displayName || analysis.name}'`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✨ Populare finalizată cu succes!`);
  console.log(`📊 Total analize: ${analysisTypesData.length}`);
  console.log(`➕ Adăugate: ${addedCount}`);
  console.log(`✏️  Actualizate: ${updatedCount}`);
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
