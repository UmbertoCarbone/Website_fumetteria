# 📚 E-Commerce Fumetteria

Progetto full-stack professionale per la gestione e la vendita di fumetti, caratterizzato da un'architettura robusta, tipata e con validazione dei dati in tempo reale.

---

## 🛠️ Stack Tecnologico

### 💻 Frontend
- **Framework & Build Tool:** React.js + Vite
- **Styling:** Tailwind CSS
- **Architettura:** Struttura Atomica per componenti riutilizzabili e indipendenti

### ⚙️ Backend
- **Runtime & Lingua:** Node.js (ES Modules - `"type": "module"`) + **TypeScript**
- **Framework:** Express.js
- **Compilatore & Watcher:** **TSX** (TypeScript Execute) per uno sviluppo fulmineo
- **Validazione Dati:** **Zod** (Schema Validation preventiva)
- **Sicurezza:** Criptazione password con Bcrypt e gestione accessi tramite JSON Web Tokens (JWT)

### 🗄️ Database & ORM
- **Database:** PostgreSQL gestito in ambiente isolato tramite **Docker**
- **ORM:** Prisma v7 con supporto nativo TypeScript

---


## Terminale
npx prisma studio
npm run dev
