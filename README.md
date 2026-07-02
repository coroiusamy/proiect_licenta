# Aplicație de Monitorizare și Analiză a Analizelor Medicale

Acest repository conține codul sursă complet al aplicației de monitorizare și analiză inteligentă a analizelor medicale. Aplicația este formată dintr-un **backend** (Node.js + Express + Prisma + PostgreSQL) și un **frontend** mobil (React Native + Expo).

---

## 1. Structura Proiectului (Livrabile)

Proiectul conține următoarele directoare și fișiere principale:
* **`/backend`**: Serverul API de tip REST, responsabil de procesarea fișierelor PDF/imagini, integrarea cu motorul OCR (Tesseract.js / Google Vision API), generarea sfaturilor medicale prin LLM (Ollama / Llama) și gestiunea bazei de date.
* **`/frontend`**: Aplicația mobilă cross-platform dezvoltată în React Native folosind framework-ul Expo, integrând navigarea bazată pe structura de directoare (Expo Router) și grafice pentru evoluția indicatorilor medicali.
* **`README.md`**: Acest document care descrie livrabilele și pașii de rulare.

### Link Repository Git
* **Repository:** https://github.com/coroiusamy/proiect_licenta

---

## 2. Cerințe Preliminare (Prerequisites)

Pentru a instala și rula aplicația local, aveți nevoie de următoarele instrumente:
1. **Node.js** (versiunea 18.x sau mai nouă) și **npm** (inclus în Node.js).
2. **PostgreSQL** (instalat local sau rulat în cloud, de exemplu pe Neon/Supabase).
3. **Expo Go** instalat pe un dispozitiv fizic (Android sau iOS) pentru testarea frontend-ului, ori emulatoare instalate (Android Studio / Xcode).
4. *(Opțional)* **Ollama** instalat local cu modelul wellness preconfigurat (dacă se dorește rularea locală a asistentului AI offline).

---

## 3. Instalare și Lansare Backend

### Pasul 1: Clonați repository-ul
```bash
git clone https://github.com/coroiusamy/proiect_licenta.git
cd proiect_licenta/backend
```

### Pasul 2: Instalați dependențele
```bash
npm install
```

### Pasul 3: Configurați variabilele de mediu
Creați un fișier `.env` în directorul `/backend` și adăugați următoarele variabile:
```env
# URL-ul de conectare la baza de date PostgreSQL
DATABASE_URL="postgresql://utilizator:parola@localhost:5432/nume_baza_date"

# Cheie secretă pentru semnarea token-urilor JWT
JWT_SECRET="o_cheie_secreta"

# Date de configurare pentru serviciul de email (ex. Nodemailer cu Gmail)
EMAIL_USER="adresa_ta@gmail.com"
EMAIL_PASS="parola_de_aplicatie_generata"

# Opțiuni OCR: "auto" | "google-vision" | "tesseract"
OCR_PROVIDER="tesseract"

# Dacă doriți Google Vision API
GOOGLE_VISION_API_KEY="cheie_api_google_vision"
GOOGLE_CLIENT_ID="cheie_client_oauth_google"
```

### Pasul 4: Inițializarea bazei de date (Prisma)
Rulați migrările pentru a genera tabelele în baza de date PostgreSQL și rulați scriptul de seed pentru popularea tabelelor de tipuri de analize de bază:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### Pasul 5: Lansarea serverului backend
Rulați comanda de start:
```bash
npm start
```
Serverul va porni implicit pe portul `3000` (`http://localhost:3000`).

---

## 4. Instalare și Lansare Frontend

### Pasul 1: Navigați în directorul frontend-ului
Deschideți un nou terminal în rădăcina proiectului și navigați în folderul frontend:
```bash
cd ../frontend
```

### Pasul 2: Instalați dependențele
```bash
npm install
```

### Pasul 3: Configurați variabilele de mediu pentru Frontend
Creați un fișier `.env` în directorul `/frontend`:
```env
# Introduceți IP-ul local al calculatorului dvs. pe care rulează backend-ul
# Notă: Nu folosiți "localhost" dacă rulați aplicația pe un telefon fizic, deoarece telefonul nu va putea accesa backend-ul
EXPO_PUBLIC_API_URL="http://<IP_LOCAL_CALCULATOR>:3000"
EXPO_PUBLIC_GOOGLE_CLIENT_ID="cheie_client_oauth_google"
```

### Pasul 4: Lansarea frontend-ului cu Expo
Lansați serverul de dezvoltare Expo:
```bash
npm start
```

După rularea comenzii, în terminal va apărea un cod QR:
* **Android:** Deschideți aplicația **Expo Go** și scanați codul QR.
* **iOS:** Deschideți aplicația **Camera** implicită a telefonului și scanați codul QR pentru a deschide aplicația în **Expo Go**.
* **Simulator:** Apăsați tasta `a` pentru simulatorul de Android sau `i` pentru cel de iOS (dacă sunt configurate local pe calculator).

---

## 5. Compilarea Aplicației (Build de Producție)

Dacă doriți să compilați aplicația într-un pachet instalabil final (de tip `.apk` sau `.aab` pentru Android și `.ipa` pentru iOS), urmați acești pași:

### Pasul 1: Instalați instrumentul CLI pentru EAS (Expo Application Services)
```bash
npm install -g eas-cli
```

### Pasul 2: Conectați-vă la contul Expo
```bash
eas login
```

### Pasul 3: Configurați proiectul pentru build
```bash
eas build:configure
```

### Pasul 4: Generarea build-ului
* **Pentru Android (format APK pentru testare directă pe dispozitiv):**
  ```bash
  eas build --platform android --profile preview
  ```
* **Pentru Android (format AAB pentru Google Play Store):**
  ```bash
  eas build --platform android
  ```
* **Pentru iOS (pentru TestFlight sau App Store):**
  ```bash
  eas build --platform ios
  ```