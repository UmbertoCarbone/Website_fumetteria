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

## 🛣️ API Endpoints

| Metodo | Endpoint             | Descrizione                     |
| :----- | :------------------- | :------------------------------ |
| `GET`  | `/`                  | Health Check (Stato Database)   |
| `POST` | `/api/auth/register` | Registrazione Utente            |
| `POST` | `/api/auth/login`    | Login & JWT Generation          |
| `GET`  | `/api/users`         | Recupero lista utenti           |
| `POST` | `/api/cards/sync`    | Sincronizzazione Catalogo (API) |
| `GET`  | `/api/products`      | Query Catalogo (con Relazioni)  |

---


