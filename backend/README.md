# Backend — Fumetteria

Guida rapida per avviare il backend e verificare, passo per passo, che le modifiche dell'audit (autenticazione, validazione, gestione stock) funzionino correttamente.

## Requisiti

- Node.js e npm installati
- PostgreSQL in esecuzione, con `DATABASE_URL` valorizzato in `backend/.env`
- File `.env` compilato (vedi `.env.example` per la lista completa delle variabili: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `FRONTEND_URL`, `CARD_API_KEY`)

## 1. Avvio del server

```powershell
cd backend
npm install     # solo la prima volta o dopo aver tirato modifiche a package.json
npm run dev
```

Output atteso:

```
🚀 Server running on port 5121
✅ Connection successful
```

Se manca la seconda riga, il database non è raggiungibile: controlla `DATABASE_URL` nel `.env` e che Postgres sia acceso.

## 2. Rotte pubbliche (nessun login richiesto)

In un altro terminale:

```powershell
curl http://localhost:5121/
curl http://localhost:5121/api/products
```

Entrambe devono rispondere **200** con JSON (la seconda con l'elenco prodotti, anche vuoto se il DB è pulito).

## 3. Rotte protette senza token → devono essere bloccate

```powershell
curl http://localhost:5121/api/users
```

Atteso: **401**, `{"error":true,"message":"Token di autenticazione mancante"}`.

Se prima di questo audit ottenevi una risposta 200 con l'elenco utenti senza login, questo è il problema più importante che è stato corretto: nessuna rotta di scrittura o di amministrazione era protetta.

## 4. Registrazione e login

```powershell
curl -X POST http://localhost:5121/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@tuodominio.it\",\"username\":\"testadmin\",\"password\":\"password123\"}'

curl -X POST http://localhost:5121/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@tuodominio.it\",\"password\":\"password123\"}'
```

Copia il valore di `"token"` dalla risposta del login.

Con questo token (ruolo `USER` di default), ripeti il punto 3 aggiungendo l'header:

```powershell
curl http://localhost:5121/api/users -H "Authorization: Bearer <token>"
```

Atteso ora: **403** `"Permessi insufficienti"` — autenticato, ma senza i permessi di staff.

## 5. Promuovere un utente ad ADMIN (per testare le funzioni di gestione)

```powershell
npx prisma studio
```

Si apre nel browser. Vai sulla tabella `User`, trova l'utente appena creato, cambia `role` da `USER` ad `ADMIN`, salva.

Poi rifai il login (punto 4) per ottenere un token nuovo con il ruolo aggiornato (il ruolo è dentro il token: un token vecchio resta con il ruolo di prima finché non scade).

## 6. Operazioni da amministratore

```powershell
$token = "incolla_qui_il_nuovo_token"

# Elenco utenti — ora deve funzionare
curl http://localhost:5121/api/users -H "Authorization: Bearer $token"

# Creazione prodotto con stock 0 -> isAvailable deve essere false
curl -X POST http://localhost:5121/api/products `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{\"name\":\"Prodotto di prova\",\"categoryName\":\"Prova\",\"price\":10,\"stock\":0}'
```

Controlla nel JSON di risposta che `"isAvailable": false`. Prova poi a creare lo stesso prodotto con `"stock": 5`: deve risultare `"isAvailable": true`.

Prendi l'`id` del prodotto appena creato e verifica anche l'aggiornamento:

```powershell
# Sposta lo stock a 0 -> isAvailable deve tornare false automaticamente
curl -X PATCH http://localhost:5121/api/products/<id> `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{\"stock\":0}'
```

### Altri casi che dovrebbero comportarsi correttamente

| Richiesta | Comportamento atteso |
|---|---|
| `GET /api/products/abc` (id non numerico) | 400 |
| `GET /api/products/999999` (id inesistente) | 404, non 500 |
| `DELETE /api/products/999999` (id inesistente) | 404, non 500 |
| `POST /api/products` con `cardDetails: { "id": 999, ... }` | 400 "Unrecognized key" — campi non previsti vengono rifiutati |
| `POST` con body JSON malformato (es. `{bad json`) | 400 JSON pulito, non una pagina HTML di errore |
| Doppia registrazione con la stessa email in rapida successione | la seconda risponde 409, non 500 |

## 7. Pulizia dei dati di prova

```powershell
curl -X DELETE http://localhost:5121/api/products/<id> -H "Authorization: Bearer $token"
```

Elimina anche l'utente di test `testadmin` da Prisma Studio, se non vuoi tenerlo nel DB.

## 8. Frontend

```powershell
cd ../frontend
npm run dev
```

Apri il sito e controlla che la home carichi ancora i prodotti (chiama `GET /api/products`, rimasta pubblica) e che il login funzioni. Le altre pagine/funzioni admin, se le colleghi in futuro, dovranno passare l'header `Authorization: Bearer <token>` come mostrato sopra.

## Rotte protette (richiedono ruolo ADMIN o SUPERADMIN)

- `GET /api/users`
- `POST /PATCH /DELETE /api/products`
- `POST /PATCH /DELETE /api/funko`
- `POST /api/cards/sync/*`
- `POST /api/manga/sync`
- `POST /api/boardgame/sync`

Tutte le altre rotte `GET` di lettura catalogo restano pubbliche.
