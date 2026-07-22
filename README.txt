NO KINGS — PROTOTIPO · ALICUBI

AVVIO RAPIDO
- Estrai completamente lo ZIP.
- Apri GIOCO_STANDALONE.html con un browser moderno.
- Il file contiene interfaccia, grafica, logo, domande e logica in un unico documento.
- Non è necessario installare nulla e non serve una connessione Internet.

VERSIONE MODULARE
Per modificare il progetto usa:
- index.html: struttura dell'interfaccia.
- styles.css: grafica generale e identità minima delle sei categorie.
- app.js: logica del gioco.
- questions.js: database locale utilizzato dal browser.
- assets/ALICUBI_logo_big.png: logo Alicubi.
- materiali/domande_complete.json: database leggibile con metadati.

REGOLE IMPLEMENTATE
- Da 2 a 15 partecipanti.
- Modalità “Solo domande” oppure “Scrivi le risposte”.
- Categoria scelta a ogni turno oppure selezione casuale dal mazzo completo.
- Primo giro uguale per tutti: “Come ti chiami e quanti anni hai?”.
- La domanda iniziale è identificata come “Domanda di presentazione”.
- La stessa domanda non si ripete per lo stesso giocatore finché sono disponibili alternative.
- Due giocatori differenti possono ricevere la stessa domanda.
- In modalità risposte, “Termina il gioco” scarica un TXT e mostra il riepilogo.

DATABASE LOCALE
Fonte congelata: “Domande Prototipo 01 - CAMPUS FUTURE CREATORS 2026”, scheda “01_Domande”.
Priorità applicata: colonna B; se vuota, colonna C. La categoria proviene dalla colonna D.
Totale: 100 domande.
- Fatiche: 17
- Strategie: 29
- Desideri / Comunità: 12
- Parole che aprono / parole che chiudono: 12
- Piccoli Re / Potere: 21
- Voce e ascolto: 9

IDENTITÀ VISIVA
La struttura dell'interfaccia resta unica. Ogni categoria modifica in modo controllato badge,
bordo, fondo, accento e texture CSS sulla base della relativa guideline Alicubi.
I simboli non sono stati ridisegnati: nelle tavole originali non erano disponibili come asset isolati.

SINCRONIZZAZIONE
GIOCO_STANDALONE.html è generato a partire dagli stessi file modulari inclusi nella cartella.
Per modifiche future, aggiornare prima index.html, styles.css, questions.js e app.js, poi rigenerare lo standalone.

TEST
Consulta REPORT_TEST_E_NOTE.md.
