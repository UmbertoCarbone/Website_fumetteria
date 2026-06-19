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

| Frontend          | Backend           | Database       |
| :---------------- | :---------------- | :------------- |
| **React + Vite**  | **Node.js (ESM)** | **PostgreSQL** |
| **Tailwind CSS**  | **TypeScript**    | **Prisma ORM** |
| **Atomic Design** | **Zod / JWT**     | **Docker**     |

---

---

Ecco la struttura aggiornata con i titoli corretti e un layout delle tabelle omogeneo e pulito:

Markdown
## 🛣️ API Endpoints

### 🔑 Autenticazione

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Registrazione Utente |
| `POST` | `/api/auth/login` | Login & JWT Generation |

<br>

### 📦 Gestione Prodotti & Sincronizzazione

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/users` | Recupero lista utenti |
| `GET` | `/api/products` | Recupero lista completa di tutti i prodotti |
| `POST` | `/api/products` | Creazione nuovo prodotto (con auto-upsert di Cat/SubCat) |
| `GET` | `/api/products/:id` | Recupero dettaglio singolo prodotto tramite ID |
| `PATCH` | `/api/products/:id` | Modifica parziale di un prodotto (es. variazioni stock) |
| `DELETE` | `/api/products/:id` | Eliminazione definitiva di un prodotto |
| `GET` | `/api/cards/sync/pokemon` | Sincronizzazione TCG Pokémon (Es: `?limit=1&q=wartortle`) |

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
