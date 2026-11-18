// ============================================================
//  TRAUMA TEAM - PIANI E PREZZI
//
//  Le righe che iniziano con // sono commenti: il sito le ignora.
//
//  - Ogni "# Nome" apre un piano. Quel nome compare nella pagina
//    e nella notifica ("Nuovo Cliente Bronzo").
//  - prezzo:  testo libero, in grande (es. "4 smeraldi").
//  - nota:    riga piccola sotto il prezzo (facoltativa).
//  - durata:  testo libero.
//  - rischio: massimo grado di rischio coperto (1, 2 o 3). Mostra il
//             badge sulla carta e decide chi copre quale rischio nella
//             sezione "Gradi di rischio".
//  - Le righe che iniziano con "- " sono le caratteristiche.
//  - Le righe di testo normale sono una descrizione a parole.
//  - "tipo: programma" = non è un piano selezionabile: mostra solo
//    descrizione e prezzo (come Secure your Soul).
//  - L'ordine nel file è l'ordine nella pagina.
// ============================================================

# Bronzo
prezzo: 1 smeraldo
nota: Di iscrizione. Ogni servizio richiesto ha poi un costo variabile in base al tipo di intervento.
durata: Monouso (un jolly: lo usi quando vuoi)
rischio: 1
Non è un abbonamento: è un piano monouso, un jolly che usi quando vuoi, richiedendo il servizio al momento del misfatto.
- Costo del servizio variabile in base all'intervento
- Raggio d'azione limitato alle nether hub e alle zone attorno alla zona centrale del mondo
- Stipendio dell'operatore ed eventuali danni all'attrezzatura pagati dal cliente
- Nessun rimborso sull'attrezzatura persa
- Nessuna garanzia di servizio
- Servizio annullabile in situazioni di rischio alto

# Argento
prezzo: 4 smeraldi
durata: 30 giorni in game
rischio: 1
Abbonamento stagionale. Lo stesso piano del Bronzo, ma senza costi aggiuntivi e con la garanzia del servizio.
- Nessun costo aggiuntivo
- Raggio d'azione limitato alle nether hub e alle zone attorno alla zona centrale del mondo
- Garanzia di servizio, con tempistiche variabili
- Rimborso se il servizio viene annullato

# Oro
prezzo: 1 blocco di smeraldo
durata: 30 giorni in game
rischio: 2
Abbonamento stagionale con area operativa estesa e tempistiche buone.
- Area operativa: l'intera zona utilizzata nell'overworld, fino a 800 blocchi dalle nether hub nel Nether e l'isola centrale dell'End
- Garanzia di servizio, con tempistiche buone
- Servizio annullabile solo in situazioni estreme
- Rimborso completo del pagamento se il servizio viene annullato
- Rimborso parziale sull'attrezzatura persa (solo oggetti di valore mediocre)

# Platino
prezzo: 1 diamante o 2 blocchi di smeraldo
durata: 30 giorni in game
rischio: 3
Abbonamento stagionale: il livello più alto, senza limiti e senza attese.
- Area operativa illimitata
- Servizio garantito, con tempistiche fulminee
- Annullamento del servizio quasi impossibile; nella rara eventualità, rimborso più risarcimento
- Rimborso completo sull'attrezzatura persa

# Secure your Soul
tipo: programma
prezzo: Costo unico
nota: Calcolato in base alla quantità e alla qualità degli oggetti o dei terreni assicurati.
Programma assicurativo per chi vuole proteggere ciò che possiede. Il piano è annullabile con risarcimento parziale del prezzo iniziale.
