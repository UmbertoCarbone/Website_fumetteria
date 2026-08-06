<div align="center">

# 📚 E-Commerce Fumetteria

_Gestione professionale di fumetti, carte collezionabili e gadget_

[![Project Status: Active](https://img.shields.io/badge/Status-Active-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)]()
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=white)]()
[![NodeJS](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)]()

---

</div>

## 📖 Descrizione

Progetto **Full-Stack** orientato alle prestazioni. Sviluppato per la gestione integrata di un catalogo prodotti, sincronizzazione automatizzata con API esterne e un'esperienza utente moderna basata su architettura atomica.

---

## 🛠️ Stack Tecnologico

| Componente | Tecnologie & Strumenti |
| :--- | :--- |
| **Frontend** | **React + Vite**, TypeScript, Tailwind CSS |
| **Backend** | **Node.js (ESM)**, TypeScript, Express, Zod, JWT |
| **Database** | **PostgreSQL**, Prisma ORM |

---

## 🛣️ API Endpoints

### 🔑 Autenticazione

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Registrazione Nuovo Utente |
| `POST` | `/api/auth/login` | Login utente & Generazione Token JWT |
| `GET` | `/api/users` | 🔒 Recupero lista utenti registrati (solo ADMIN/SUPERADMIN) |

<br>

### 📦 Gestione Prodotti

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Recupero lista completa di tutti i prodotti (con relazioni) |
| `GET` | `/api/products/:id` | Recupero dettaglio singolo prodotto tramite ID |
| `POST` | `/api/products` | 🔒 Creazione nuovo prodotto (con auto-upsert di Categoria/Sottocategoria) |
| `PATCH` | `/api/products/:id` | 🔒 Modifica parziale di un prodotto (es. variazioni stock/prezzo) |
| `DELETE` | `/api/products/:id` | 🔒 Eliminazione definitiva di un prodotto dal catalogo |

<br>

### 🧸 Gestione Funko Pop

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/funko` | Recupero lista completa dei Funko Pop |
| `GET` | `/api/funko/:id` | Recupero dettaglio singolo Funko Pop tramite ID |
| `POST` | `/api/funko` | 🔒 Creazione nuovo Funko Pop |
| `PATCH` | `/api/funko/:id` | 🔒 Modifica parziale di un Funko Pop |
| `DELETE` | `/api/funko/:id` | 🔒 Eliminazione definitiva di un Funko Pop |

<br>

### 🔄 Sincronizzazione API Esterne (Card Games)
_I dati di quotazione e catalogo vengono sincronizzati integrando i servizi di [TCG Price Lookup](https://tcgpricelookup.com/). Rotte riservate allo staff (ADMIN/SUPERADMIN)._

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `POST` | `/api/cards/sync/pokemon` | 🔒 Sincronizzazione TCG Pokémon (Es: `?limit=1&q=wartortle`) |
| `POST` | `/api/cards/sync/pokemon-jp` | 🔒 Sincronizzazione TCG Pokémon (set giapponesi) |
| `POST` | `/api/cards/sync/yugioh` | 🔒 Sincronizzazione TCG Yu-Gi-Oh! (Es: `?limit=1&q=golem`) |
| `POST` | `/api/cards/sync/one-piece` | 🔒 Sincronizzazione TCG One Piece (Es: `?limit=1&q=luffy`) |

<br>

### 🎲 Sincronizzazione API Esterne (Giochi da Tavolo)
_I dati vengono recuperati tramite l'XML API di [BoardGameGeek](https://boardgamegeek.com/). Rotta riservata allo staff (ADMIN/SUPERADMIN)._

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `POST` | `/api/boardgame/sync` | 🔒 Ricerca e sincronizzazione gioco da tavolo (body: `{ "q": "catan" }`) |

<br>

### 🧱 Sincronizzazione API Esterne (Lego)
_I dati di catalogo (nome, immagine, tema, pezzi, minifig) vengono recuperati da [Rebrickable](https://rebrickable.com/api/v3/docs/). Nessun dato di prezzo: il prezzo viene impostato manualmente dallo staff, come per i giochi da tavolo. Rotta riservata allo staff (ADMIN/SUPERADMIN)._

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `POST` | `/api/lego/sync` | 🔒 Ricerca e sincronizzazione set Lego (body: `{ "q": "millennium falcon" }`) |

---