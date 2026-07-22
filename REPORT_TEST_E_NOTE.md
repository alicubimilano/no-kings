# NO KINGS — Prototipo

## Database importato

- Fonte: `Domande Prototipo 01 - CAMPUS FUTURE CREATORS 2026`
- Scheda: `01_Domande`
- Colonne lette: B, C e D
- Domande provenienti dalla colonna B: 81
- Domande provenienti dalla colonna C: 19
- Totale domande importate: 100
- Righe senza categoria o con categoria non riconosciuta: 0
- Righe con B e C entrambe compilate: 0
- Duplicati esatti: 0

## Distribuzione per categoria

- Fatiche: 17
- Strategie: 29
- Desideri / Comunità: 12
- Parole che aprono / parole che chiudono: 12
- Piccoli Re / Potere: 21
- Voce e ascolto: 9

## Interventi applicati

- limite partecipanti esteso da 10 a 15;
- nuova domanda iniziale: “Come ti chiami e quanti anni hai?”;
- etichetta iniziale: “Domanda di presentazione”;
- sei categorie NO KINGS inserite nel selettore e nel mazzo casuale;
- database originale completamente sostituito;
- metadati di riga, colonna e stato conservati nel database locale;
- titolo, README ed esportazione TXT aggiornati;
- trattamento visivo minimo differenziato per categoria;
- posizione e comportamento del pulsante di avanzamento non modificati;
- versione modulare e standalone generate dalla stessa base.

## Test eseguiti

Suite browser automatizzata: **9/9 test superati**.

- **PASS** — Configurazione, ordine opzioni e validazione 2–15
- **PASS** — Turnazione manuale e regola delle ripetizioni — Verificata domanda da B e successiva domanda da C
- **PASS** — Sei categorie, stili e leggibilità tablet
- **PASS** — Quindici partecipanti e giro iniziale comune
- **PASS** — Modalità risposte, riepilogo, TXT e riavvio
- **PASS** — Scelta casuale e assenza di ripetizioni
- **PASS** — Esaurimento di una categoria
- **PASS** — Esaurimento dell’intero mazzo per ogni giocatore
- **PASS** — Versione standalone offline e parità funzionale

Sono stati inoltre verificati:

- sintassi JavaScript di `app.js` e `questions.js`;
- presenza di 100 record nel database JSON;
- corrispondenza esatta tra CSS, database e JavaScript modulari e i blocchi incorporati nello standalone;
- assenza di fogli di stile, script, font, API o librerie esterne nello standalone;
- logo incorporato nello standalone come data URI;
- assenza delle vecchie categorie e del vecchio titolo.

### Nota sull'esecuzione offline

Il browser automatizzato dell'ambiente di sviluppo blocca per policy sia gli URL `file://` sia gli indirizzi locali. Il file standalone è stato quindi caricato direttamente nel motore Chromium come documento HTML autosufficiente, senza risorse esterne. La struttura del file e la parità con la versione modulare sono state verificate separatamente. Il prototipo è progettato per essere aperto direttamente dal file `GIOCO_STANDALONE.html` in un browser moderno.

## Simboli

I simboli delle guideline non sono stati ridisegnati né approssimati. Le tavole disponibili sono immagini complete e non forniscono icone isolate e trasparenti. Il prototipo utilizza palette, badge, bordi, texture e segni CSS coerenti con i sei mondi visivi.

## Questioni aperte

- Inserimento dei simboli esatti: richiede asset separati oppure ritagli approvati dalle tavole.
- Il titolo “NO KINGS — Prototipo” resta provvisorio, come previsto dal brief.
