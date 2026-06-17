# Deploy su Vercel

## Come fare il deploy

1. **Crea un account su [vercel.com](https://vercel.com)** (gratuito)
2. **Installa Vercel CLI** (opzionale, puoi anche usare il sito):
   ```bash
   npm i -g vercel
   vercel
   ```
   Oppure vai su vercel.com → "Add New Project" → importa da GitHub o carica la cartella.

3. **Variabili d'ambiente (opzionale):**
   Nel pannello Vercel → Settings → Environment Variables, aggiungi:
   ```
   NEXT_PUBLIC_BASE_URL = https://tuodominio.vercel.app
   ```
   Se non la imposti, il redirect del logout funziona comunque (rileva automaticamente l'host dalla richiesta).

4. **Deploy automatico:** ogni push al branch `main` su GitHub triggera un nuovo deploy.

---

## Note importanti sul filesystem

Vercel ha un filesystem **read-only** a runtime (eccetto `/tmp`).

### Come funziona ora:
| Operazione | Dove | Note |
|---|---|---|
| Lettura archivio wiki (`content/`) | Filesystem del progetto | ✅ Funziona, è read-only |
| Lettura utenti iniziali (`data/users.json`) | Filesystem del progetto | ✅ Funziona |
| Lettura mappa iniziale (`data/map.json`) | Filesystem del progetto | ✅ Funziona |
| Scrittura feedback, mappa, utenti | `/tmp/` | ⚠️ Ephemeral |

### Limite di `/tmp`:
I dati scritti in `/tmp` (feedback, modifiche alla mappa, modifiche agli utenti via pannello admin) **non persistono tra cold start** (riavvii del serverless function). Su Vercel hobby/pro, le funzioni si ibernano dopo inattività.

### Per persistenza reale (consigliato in futuro):
- **Vercel KV** (Redis): `npm i @vercel/kv` — ideale per questo caso d'uso
- **Vercel Postgres** o **Supabase**: per dati più strutturati
- **Vercel Blob**: per file JSON grandi

Con la configurazione attuale, il sito funziona perfettamente su Vercel. I dati di feedback e modifiche admin sopravvivono finché l'istanza è calda, e vengono reinizializzati dai file seed al prossimo cold start.
