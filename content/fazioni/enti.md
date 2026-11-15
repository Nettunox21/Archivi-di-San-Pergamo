// ENTI COLLEGATI ALLE NAZIONI (istituti e aziende)
//
// Una voce per ente. Ogni voce inizia con "## Nome" seguito da righe "chiave: valore".
// Le righe che iniziano con // sono commenti e vengono ignorate.
//
//   tipo:        istituto  oppure  azienda
//   nazioni:     una o più nazioni, separate da virgola (stesso nome che hanno in app/data/factions.ts)
//   condivide:   tutto      = può attingere a tutto il magazzino della nazione
//                niente     = non condivide risorse
//                carote, razzetti = condivide solo queste risorse (solo i NOMI, senza quantità)
//   descrizione: una riga, facoltativa
//   link:        pagina dell'ente, facoltativa (es. /aziende/brevetti)
//
// ATTENZIONE: i nomi delle risorse devono essere identici a quelli del catalogo economia.
// Se rinomini una risorsa dall'admin, aggiorna anche qui il vecchio nome.
//
// Esempio di azienda (togli le // per attivarla):
//
// ## Trauma Team
// tipo: azienda
// nazioni: San Pergamo
// condivide: niente
// link: /aziende/trauma-team

## SENPAI
tipo: istituto
nazioni: San Pergamo, Profitgrado
condivide: tutto
descrizione: San Ernesto - Pergamo (e) Profitgrado Atomic Institute
link: /aziende/brevetti

## FIORD
tipo: istituto
nazioni: Falconia
condivide: tutto
descrizione: Falconia Institute of Research & Development
link: /aziende/brevetti
