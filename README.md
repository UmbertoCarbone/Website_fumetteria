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
| `GET` | `/api/users` | Recupero lista utenti registrati |

<br>

### 📦 Gestione Prodotti

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Recupero lista completa di tutti i prodotti (con relazioni) |
| `GET` | `/api/products/:id` | Recupero dettaglio singolo prodotto tramite ID |
| `POST` | `/api/products` | Creazione nuovo prodotto (con auto-upsert di Categoria/Sottocategoria) |
| `PATCH` | `/api/products/:id` | Modifica parziale di un prodotto (es. variazioni stock/prezzo) |
| `DELETE` | `/api/products/:id` | Eliminazione definitiva di un prodotto dal catalogo |

<br>

### 🔄 Sincronizzazione API Esterne (Card Games)
_I dati di quotazione e catalogo vengono sincronizzati integrando i servizi di [TCG Price Lookup](https://tcgpricelookup.com/)._

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/cards/sync/pokemon` | Sincronizzazione TCG Pokémon (Es: `?limit=1&q=wartortle`) |
| `GET` | `/api/cards/sync/yugioh` | Sincronizzazione TCG Yu-Gi-Oh! (Es: `?limit=1&q=golem`) |
| `GET` | `/api/cards/sync/onepiece` | Sincronizzazione TCG One Piece (Es: `?limit=1&q=luffy`) |

<br>

### 🔍 Filtri Categoria

_I filtri testuali applicano automaticamente il `.trim()` e la ricerca parziale case-insensitive (`contains`)._

| Metodo | Endpoint | Parametri Query | Filtro Applicato |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products/category` | `?id=2` | Cerca prodotti per **Solo ID Categoria** |
| `GET` | `/api/products/category` | `?name=Manga` | Cerca prodotti per **Solo Nome Categoria** (Parziale) |
| `GET` | `/api/products/category` | `?id=2&name=Manga` | Cerca prodotti per **ID + Nome Categoria** |

<br>

### 🏷️ Filtri Sottocategoria

_I filtri testuali applicano automaticamente il `.trim()` e la ricerca parziale case-insensitive (`contains`)._

| Metodo | Endpoint | Parametri Query | Filtro Applicato |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products/sub-category` | `?id=4` | Cerca prodotti per **Solo ID Sottocategoria** |
| `GET` | `/api/products/sub-category` | `?name=Pokemon` | Cerca prodotti per **Solo Nome Sottocategoria** (Parziale) |
| `GET` | `/api/products/sub-category` | `?id=4&name=Pokemon` | Cerca prodotti per **ID + Nome Sottocategoria** |

---