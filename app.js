(() => {
  "use strict";

  const OPENING_QUESTION = "Come ti chiami e quanti anni hai?";
  const OPENING_LABEL = "Domanda di presentazione";
  const CATEGORY_CONFIG = window.NO_KINGS_CATEGORIES || {};
  const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG);

  const state = {
    players: [],
    currentPlayerIndex: 0,
    gameType: "questions",
    drawMode: "manual",
    openingSeen: [],
    histories: [],
    responses: [],
    currentQuestion: null,
    turnNumber: 1,
    ended: false
  };

  const el = {
    setupStep: document.querySelector("#setupStep"),
    namesStep: document.querySelector("#namesStep"),
    gameStep: document.querySelector("#gameStep"),
    summaryStep: document.querySelector("#summaryStep"),
    numPlayers: document.querySelector("#numPlayers"),
    gameType: document.querySelector("#gameType"),
    drawMode: document.querySelector("#drawMode"),
    continueButton: document.querySelector("#continueButton"),
    backButton: document.querySelector("#backButton"),
    startButton: document.querySelector("#startButton"),
    setupError: document.querySelector("#setupError"),
    namesError: document.querySelector("#namesError"),
    namesContainer: document.querySelector("#namesContainer"),
    turnPlayer: document.querySelector("#turnPlayer"),
    turnCounter: document.querySelector("#turnCounter"),
    roundLabel: document.querySelector("#roundLabel"),
    categoryArea: document.querySelector("#categoryArea"),
    categorySelect: document.querySelector("#categorySelect"),
    categoryHelp: document.querySelector("#categoryHelp"),
    questionCard: document.querySelector("#questionCard"),
    categoryBadge: document.querySelector("#categoryBadge"),
    questionText: document.querySelector("#questionText"),
    answerArea: document.querySelector("#answerArea"),
    answerBox: document.querySelector("#answerBox"),
    answerError: document.querySelector("#answerError"),
    mainActionButton: document.querySelector("#mainActionButton"),
    endGameButton: document.querySelector("#endGameButton"),
    summaryBox: document.querySelector("#summaryBox"),
    restartButton: document.querySelector("#restartButton")
  };

  function categoryLabel(categoryKey) {
    return CATEGORY_CONFIG[categoryKey]?.label || categoryKey;
  }

  function populateCategorySelect() {
    el.categorySelect.innerHTML = "";
    CATEGORY_KEYS.forEach(categoryKey => {
      const option = document.createElement("option");
      option.value = categoryKey;
      option.textContent = categoryLabel(categoryKey);
      el.categorySelect.append(option);
    });
  }

  function applyQuestionStyle(categoryKey) {
    el.questionCard.dataset.category = CATEGORY_CONFIG[categoryKey] ? categoryKey : "neutral";
  }

  function showOnly(section) {
    [el.setupStep, el.namesStep, el.gameStep, el.summaryStep].forEach(item => {
      item.classList.toggle("hidden", item !== section);
    });
  }

  function validPlayerCount() {
    const count = Number.parseInt(el.numPlayers.value, 10);
    return Number.isInteger(count) && count >= 2 && count <= 15 ? count : null;
  }

  function buildNameFields(count) {
    el.namesContainer.innerHTML = "";
    for (let index = 0; index < count; index += 1) {
      const wrapper = document.createElement("div");
      const label = document.createElement("label");
      const input = document.createElement("input");

      label.htmlFor = `player-${index}`;
      label.textContent = `Giocatore ${index + 1}`;
      input.id = `player-${index}`;
      input.type = "text";
      input.maxLength = 40;
      input.placeholder = `Nome del giocatore ${index + 1}`;
      input.autocomplete = "off";

      wrapper.append(label, input);
      el.namesContainer.append(wrapper);
    }
  }

  function goToNames() {
    const count = validPlayerCount();
    if (!count) {
      el.setupError.textContent = "Scegli un numero di giocatori compreso tra 2 e 15.";
      return;
    }

    el.setupError.textContent = "";
    buildNameFields(count);
    showOnly(el.namesStep);
    el.namesContainer.querySelector("input")?.focus();
  }

  function readPlayers() {
    return [...el.namesContainer.querySelectorAll("input")].map((input, index) => {
      const value = input.value.trim();
      return value || `Giocatore ${index + 1}`;
    });
  }

  function databaseIsReady() {
    return CATEGORY_KEYS.length === 6 && CATEGORY_KEYS.every(key => Array.isArray(window.QUESTION_DATABASE?.[key]));
  }

  function startGame() {
    if (!databaseIsReady()) {
      el.namesError.textContent = "Il database locale delle domande non è disponibile o non è completo.";
      return;
    }

    state.players = readPlayers();

    if (state.players.length < 2 || state.players.length > 15) {
      el.namesError.textContent = "Servono da due a quindici giocatori.";
      return;
    }

    state.currentPlayerIndex = 0;
    state.gameType = el.gameType.value;
    state.drawMode = el.drawMode.value;
    state.openingSeen = state.players.map(() => false);
    state.histories = state.players.map(() => new Set());
    state.responses = [];
    state.currentQuestion = null;
    state.turnNumber = 1;
    state.ended = false;

    el.namesError.textContent = "";
    el.answerArea.classList.toggle("hidden", state.gameType !== "answers");
    el.endGameButton.classList.toggle("hidden", state.gameType !== "answers");
    el.categoryArea.classList.toggle("hidden", state.drawMode !== "manual");
    showOnly(el.gameStep);
    prepareTurn();
  }

  function allOpeningQuestionsCompleted() {
    return state.openingSeen.every(Boolean);
  }

  function prepareTurn() {
    const player = state.players[state.currentPlayerIndex];
    el.turnPlayer.textContent = `Tocca a ${player}`;
    el.turnCounter.textContent = `Turno ${state.turnNumber}`;
    el.answerBox.value = "";
    el.answerError.textContent = "";
    state.currentQuestion = null;

    if (!state.openingSeen[state.currentPlayerIndex]) {
      state.openingSeen[state.currentPlayerIndex] = true;
      state.currentQuestion = {
        id: `PRESENTAZIONE-${state.currentPlayerIndex + 1}`,
        text: OPENING_QUESTION,
        category: OPENING_LABEL,
        categoryKey: "presentazione",
        sourceRow: null,
        sourceColumn: null,
        status: "presentazione",
        opening: true
      };
      showCurrentQuestion();
      el.roundLabel.textContent = "Giro di presentazione";
      el.categorySelect.disabled = true;
      el.categoryHelp.textContent = "Nel primo giro la domanda è uguale per tutti.";
      setAdvanceButton();
      return;
    }

    el.roundLabel.textContent = "Domanda dal mazzo";
    el.categorySelect.disabled = false;
    el.categoryHelp.textContent = "";

    if (state.drawMode === "random") {
      drawRandomQuestion();
      setAdvanceButton();
    } else {
      applyQuestionStyle(null);
      el.categoryBadge.textContent = "Scegli una categoria";
      el.questionText.textContent = "Quando sei pronto, pesca una domanda.";
      el.mainActionButton.textContent = "Pesca una domanda";
    }
  }

  function availableQuestionsFor(playerIndex, category = null) {
    const history = state.histories[playerIndex];
    const categories = category ? [category] : CATEGORY_KEYS;
    const available = [];

    categories.forEach(categoryKey => {
      const questions = window.QUESTION_DATABASE[categoryKey] || [];
      questions.forEach(question => {
        if (!history.has(question.text)) {
          available.push({ ...question, opening: false });
        }
      });
    });

    return available;
  }

  function chooseRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function drawRandomQuestion() {
    const available = availableQuestionsFor(state.currentPlayerIndex);
    if (available.length === 0) {
      showDeckEmpty();
      return false;
    }

    state.currentQuestion = chooseRandom(available);
    state.histories[state.currentPlayerIndex].add(state.currentQuestion.text);
    showCurrentQuestion();
    return true;
  }

  function drawManualQuestion() {
    const category = el.categorySelect.value;
    const available = availableQuestionsFor(state.currentPlayerIndex, category);

    if (available.length === 0) {
      applyQuestionStyle(category);
      el.categoryBadge.textContent = categoryLabel(category);
      el.questionText.textContent = "Questo giocatore ha già ricevuto tutte le domande di questa categoria. Scegline un’altra.";
      return false;
    }

    state.currentQuestion = chooseRandom(available);
    state.histories[state.currentPlayerIndex].add(state.currentQuestion.text);
    showCurrentQuestion();
    setAdvanceButton();
    return true;
  }

  function showDeckEmpty() {
    state.currentQuestion = null;
    applyQuestionStyle(null);
    el.categoryBadge.textContent = "Mazzo completato";
    el.questionText.textContent = "Questo giocatore ha già ricevuto tutte le domande disponibili.";
    el.mainActionButton.textContent = "Passa al prossimo giocatore";
  }

  function showCurrentQuestion() {
    const categoryKey = state.currentQuestion.opening ? null : state.currentQuestion.categoryKey;
    const label = state.currentQuestion.opening
      ? OPENING_LABEL
      : categoryLabel(categoryKey);

    applyQuestionStyle(categoryKey);
    el.categoryBadge.textContent = label;
    el.questionText.textContent = state.currentQuestion.text;
  }

  function setAdvanceButton() {
    el.mainActionButton.textContent = state.gameType === "answers"
      ? "Salva la risposta e passa il turno"
      : "Passa al prossimo giocatore";
  }

  function saveCurrentResponse(requireAnswer) {
    if (state.gameType !== "answers" || !state.currentQuestion) {
      return true;
    }

    const answer = el.answerBox.value.trim();
    if (!answer && requireAnswer) {
      el.answerError.textContent = "Scrivi una risposta prima di passare il turno.";
      el.answerBox.focus();
      return false;
    }

    if (answer) {
      state.responses.push({
        player: state.players[state.currentPlayerIndex],
        category: state.currentQuestion.opening
          ? OPENING_LABEL
          : categoryLabel(state.currentQuestion.categoryKey),
        categoryKey: state.currentQuestion.opening ? "presentazione" : state.currentQuestion.categoryKey,
        question: state.currentQuestion.text,
        answer
      });
    }

    return true;
  }

  function advanceTurn() {
    if (!saveCurrentResponse(true)) {
      return;
    }

    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    state.turnNumber += 1;
    prepareTurn();
  }

  function handleMainAction() {
    if (state.ended) return;

    if (!state.currentQuestion && state.drawMode === "manual" && allOpeningQuestionsCompleted()) {
      drawManualQuestion();
      return;
    }

    if (!state.currentQuestion) {
      advanceTurn();
      return;
    }

    advanceTurn();
  }

  function formatTextExport() {
    const now = new Date();
    const lines = [
      "NO KINGS — PROTOTIPO · ALICUBI",
      `Data: ${now.toLocaleString("it-IT")}`,
      `Giocatori: ${state.players.join(", ")}`,
      "",
      "RISPOSTE",
      "=========",
      ""
    ];

    state.responses.forEach((entry, index) => {
      lines.push(
        `${index + 1}. ${entry.player}`,
        `Categoria: ${entry.category}`,
        `Domanda: ${entry.question}`,
        `Risposta: ${entry.answer}`,
        ""
      );
    });

    return lines.join("\n");
  }

  function downloadResponses() {
    const blob = new Blob(["\uFEFF" + formatTextExport()], {
      type: "text/plain;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    anchor.href = url;
    anchor.download = `no_kings_risposte_${date}.txt`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function buildSummary() {
    el.summaryBox.innerHTML = "";

    if (state.responses.length === 0) {
      el.summaryBox.textContent = "Non sono state registrate risposte.";
      return;
    }

    state.responses.forEach(entry => {
      const card = document.createElement("article");
      card.className = "summary-entry";
      card.dataset.category = CATEGORY_CONFIG[entry.categoryKey] ? entry.categoryKey : "neutral";

      const title = document.createElement("h3");
      title.textContent = entry.player;

      const meta = document.createElement("p");
      meta.innerHTML = `<strong>${escapeHtml(entry.category)}</strong> · ${escapeHtml(entry.question)}`;

      const answer = document.createElement("p");
      answer.textContent = entry.answer;

      card.append(title, meta, answer);
      el.summaryBox.append(card);
    });
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function endGame() {
    if (state.ended) return;

    saveCurrentResponse(false);
    state.ended = true;
    downloadResponses();
    buildSummary();
    showOnly(el.summaryStep);
  }

  function restart() {
    window.location.reload();
  }

  populateCategorySelect();
  el.continueButton.addEventListener("click", goToNames);
  el.backButton.addEventListener("click", () => showOnly(el.setupStep));
  el.startButton.addEventListener("click", startGame);
  el.mainActionButton.addEventListener("click", handleMainAction);
  el.endGameButton.addEventListener("click", endGame);
  el.restartButton.addEventListener("click", restart);
})();
