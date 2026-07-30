(() => {
  "use strict";

  const data = window.GDT_DATA || {};
  const content = data.content || {};
  const questions = data.questions?.questions || [];
  const categories = data.categories?.categories || [];
  const authors = data.authors || { formula: "", names: [], signature: "" };
  const galleryImages = data.gallery?.images || [];
  const categoryMap = Object.fromEntries(categories.map((category) => [category.key, category]));

  function buildDatasetSignature(items) {
    let hash = 2166136261;
    const source = items
      .map((question) => `${question.id}\u001f${question.text}\u001f${question.categoryKey}`)
      .join("\u001e");
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${items.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  const datasetSignature = buildDatasetSignature(questions);
  const sessionStore = new window.GDTSessionStore();

  const state = {
    numPlayers: 4,
    drawMode: "random",
    players: [],
    nameDrafts: [],
    currentPlayerIndex: 0,
    currentQuestion: null,
    engine: null,
    gameStarted: false,
    gameFinished: false,
    finishReason: null,
    currentScreen: "introScreen",
    pendingManualSelection: false,
    endDialogOpen: false,
    lastScreenBeforeMaking: "openingScreen",
    galleryIndex: 0,
    lastEndTrigger: null,
    lastMakingTrigger: null,
    lastLightboxTrigger: null,
    restoring: false
  };

  const screens = ["introScreen", "openingScreen", "setupScreen", "namesScreen", "readyScreen", "gameScreen", "finalScreen", "makingScreen"];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function questionById(id) {
    return questions.find((question) => question.id === id) || null;
  }

  function currentSnapshot() {
    return {
      datasetSignature,
      currentScreen: state.currentScreen,
      numPlayers: state.numPlayers,
      drawMode: state.drawMode,
      players: [...state.players],
      nameDrafts: [...state.nameDrafts],
      currentPlayerIndex: state.currentPlayerIndex,
      currentQuestionId: state.currentQuestion?.id || null,
      usedIds: state.engine ? [...state.engine.usedIds] : [],
      gameStarted: state.gameStarted,
      gameFinished: state.gameFinished,
      finishReason: state.finishReason,
      pendingManualSelection: state.pendingManualSelection,
      endDialogOpen: state.endDialogOpen,
      lastScreenBeforeMaking: state.lastScreenBeforeMaking,
      galleryIndex: state.galleryIndex
    };
  }

  function persistSession() {
    if (state.restoring) return;
    sessionStore.save(currentSnapshot());
  }

  function showScreen(id, { persist = true } = {}) {
    screens.forEach((screenId) => {
      const node = document.getElementById(screenId);
      if (!node) return;
      const active = screenId === id;
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-hidden", active ? "false" : "true");
      if (active) node.removeAttribute("inert");
      else node.setAttribute("inert", "");
    });
    state.currentScreen = id;
    window.scrollTo({ top: 0, behavior: "auto" });
    if (persist) persistSession();
  }

  function updateModalState(node, open) {
    if (!node) return;
    node.classList.toggle("hidden", !open);
    node.setAttribute("aria-hidden", open ? "false" : "true");
    const anyModalOpen = ["#categoryDialog", "#endConfirmDialog", "#galleryLightbox"]
      .some((selector) => $(selector)?.getAttribute("aria-hidden") === "false");
    document.body.classList.toggle("modal-open", anyModalOpen);
  }

  function openModalNode(node) { updateModalState(node, true); }
  function closeModalNode(node) { updateModalState(node, false); }

  function announce(message) {
    const region = $("#gameAnnouncement");
    if (!region) return;
    region.textContent = "";
    window.setTimeout(() => { region.textContent = message; }, 20);
  }

  function focusableElements(container) {
    if (!container) return [];
    return $$('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')
      .filter((node) => container.contains(node) && node.offsetParent !== null);
  }

  function trapFocus(event, container) {
    if (event.key !== "Tab" || !container) return;
    const nodes = focusableElements(container);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function renderContent() {
    const opening = content.opening || {};
    $("#openingWhy").textContent = opening.why || "";
    $("#openingCustodian").textContent = opening.custodian || "";
    $("#openingSuccess").textContent = opening.success || "";
    $("#alicubiOpeningLink").href = content.alicubiUrl || "https://alicubi-milano.it";
    $("#alicubiMakingLink").href = content.alicubiUrl || "https://alicubi-milano.it";
    $("#finalTitle").textContent = content.finalTitle || "GRAZIE";
    $("#finalText").textContent = content.finalText || "";

    const participation = String(opening.participation || "").split(/\n\s*\n/).filter(Boolean);
    const target = $("#openingParticipation");
    target.innerHTML = "";
    participation.forEach((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      target.append(paragraph);
    });

    const makingCopy = $("#makingCopy");
    makingCopy.innerHTML = "";
    String(content.makingOf || "").split(/\n\s*\n/).filter(Boolean).forEach((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      makingCopy.append(paragraph);
    });

    $("#authorsFormula").textContent = authors.formula || "";
    const authorsList = $("#authorsList");
    authorsList.innerHTML = "";
    (authors.names || []).forEach((name) => {
      const item = document.createElement("li");
      item.textContent = name;
      authorsList.append(item);
    });
    $("#projectSignature").textContent = authors.signature || "";
  }

  function renderGalleryThumbs() {
    const container = $("#galleryThumbs");
    container.innerHTML = "";
    galleryImages.forEach((image, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-thumb";
      button.dataset.index = String(index);
      button.setAttribute("aria-label", `Mostra fotografia ${index + 1}`);
      const thumb = document.createElement("img");
      thumb.src = image.thumb;
      thumb.alt = "";
      thumb.loading = "lazy";
      button.append(thumb);
      button.addEventListener("click", () => setGalleryIndex(index, { scrollThumb: false }));
      container.append(button);
    });
    renderGallery({ scrollThumb: false, persist: false });
  }

  function renderGallery({ scrollThumb = true, persist = true } = {}) {
    if (!galleryImages.length) return;
    state.galleryIndex = window.GDTGalleryMath.wrapIndex(state.galleryIndex, galleryImages.length);
    const image = galleryImages[state.galleryIndex];
    const count = `${state.galleryIndex + 1} / ${galleryImages.length}`;
    $("#galleryImage").src = image.full;
    $("#galleryImage").alt = `Fotografia del laboratorio Future Creators, ${state.galleryIndex + 1} di ${galleryImages.length}`;
    $("#openGalleryLightbox").setAttribute("aria-label", `Ingrandisci la fotografia ${state.galleryIndex + 1} di ${galleryImages.length}`);
    $("#galleryCount").textContent = count;
    $("#lightboxImage").src = image.full;
    $("#lightboxImage").alt = `Fotografia del laboratorio Future Creators ingrandita, ${state.galleryIndex + 1} di ${galleryImages.length}`;
    $("#lightboxCount").textContent = count;
    $$("#galleryThumbs .gallery-thumb").forEach((button, index) => {
      const active = index === state.galleryIndex;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "true" : "false");
      if (active && scrollThumb) button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
    if (persist) persistSession();
  }

  function setGalleryIndex(index, options = {}) {
    state.galleryIndex = window.GDTGalleryMath.wrapIndex(index, galleryImages.length);
    renderGallery(options);
  }

  function moveGallery(delta) {
    setGalleryIndex(window.GDTGalleryMath.moveIndex(state.galleryIndex, delta, galleryImages.length));
  }

  function normalizeCount(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) return null;
    return Math.min(30, Math.max(2, parsed));
  }

  function syncSetupControls() {
    $("#numPlayers").value = String(state.numPlayers);
    const mode = $(`input[name='drawMode'][value='${state.drawMode}']`);
    if (mode) mode.checked = true;
    updateModeCards();
  }

  function validatePlayerCount() {
    const raw = Number.parseInt($("#numPlayers").value, 10);
    if (!Number.isInteger(raw) || raw < 2 || raw > 30) {
      $("#setupError").textContent = "Inserisci un numero di giocatori compreso tra 2 e 30.";
      $("#numPlayers").setAttribute("aria-invalid", "true");
      $("#numPlayers").focus();
      return false;
    }
    state.numPlayers = raw;
    state.drawMode = document.querySelector("input[name='drawMode']:checked")?.value || "random";
    $("#setupError").textContent = "";
    $("#numPlayers").removeAttribute("aria-invalid");
    persistSession();
    return true;
  }

  function changePlayerCount(delta) {
    const current = normalizeCount($("#numPlayers").value) ?? state.numPlayers;
    const next = Math.min(30, Math.max(2, current + delta));
    $("#numPlayers").value = String(next);
    state.numPlayers = next;
    persistSession();
  }

  function updateModeCards() {
    $$(".mode-card").forEach((card) => {
      card.classList.toggle("selected", Boolean(card.querySelector("input")?.checked));
    });
  }

  function captureNameDrafts() {
    state.nameDrafts = $$("#namesGrid input").map((input) => input.value);
  }

  function renderNameFields() {
    const grid = $("#namesGrid");
    const previous = state.nameDrafts.length ? state.nameDrafts : $$("#namesGrid input").map((input) => input.value);
    grid.innerHTML = "";
    for (let index = 0; index < state.numPlayers; index += 1) {
      const wrap = document.createElement("div");
      wrap.className = "name-field";
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.id = `player-${index}`;
      input.type = "text";
      input.maxLength = 40;
      input.autocomplete = "off";
      input.placeholder = "Nome";
      input.value = previous[index] || state.players[index] || "";
      label.htmlFor = input.id;
      label.textContent = `Giocatore ${index + 1}`;
      input.addEventListener("input", () => {
        captureNameDrafts();
        persistSession();
      });
      wrap.append(label, input);
      grid.append(wrap);
    }
    captureNameDrafts();
  }

  function validateNames() {
    const inputs = $$("#namesGrid input");
    const names = inputs.map((input) => input.value.trim());
    inputs.forEach((input) => input.removeAttribute("aria-invalid"));
    const firstEmpty = names.findIndex((name) => !name);
    if (firstEmpty !== -1) {
      $("#namesError").textContent = "Inserisci un nome per ogni giocatore.";
      inputs[firstEmpty].setAttribute("aria-invalid", "true");
      inputs[firstEmpty].focus();
      return false;
    }
    state.players = names;
    state.nameDrafts = [...names];
    $("#namesError").textContent = "";
    persistSession();
    return true;
  }

  function renderReady() {
    $("#readyPlayers").textContent = String(state.players.length);
    $("#readyMode").textContent = state.drawMode === "manual" ? "La scegli tu ogni volta" : "La sceglie il gioco";
  }

  function initializeGame() {
    state.engine = new window.GDTQuestionEngine(questions, categories);
    state.currentPlayerIndex = 0;
    state.currentQuestion = null;
    state.gameStarted = true;
    state.gameFinished = false;
    state.finishReason = null;
    state.pendingManualSelection = false;
    state.endDialogOpen = false;
    renderCurrentPlayer();
    showScreen("gameScreen", { persist: false });

    if (state.drawMode === "manual") {
      state.pendingManualSelection = true;
      showWaitingQuestion("Scegli la categoria della prima domanda.");
      persistSession();
      openCategoryDialog();
    } else {
      presentQuestion(state.engine.drawRandom());
    }
  }

  function setLengthClass(node, text, thresholds) {
    if (!node) return;
    const length = String(text || "").trim().length;
    const [medium, long, extraLong] = thresholds;
    const value = length > extraLong ? "extra-long" : length > long ? "long" : length > medium ? "medium" : "short";
    node.dataset.length = value;
  }

  function renderCurrentPlayer() {
    const name = state.players[state.currentPlayerIndex] || "";
    $("#playerName").textContent = name;
    setLengthClass($("#playerName"), name, [16, 28, 42]);
  }

  function showWaitingQuestion(message) {
    $("#gameScreen").dataset.category = "neutral";
    $("#categoryName").textContent = "SCELTA DEL CUSTODE";
    $("#categorySymbol").removeAttribute("src");
    $("#categorySymbol").classList.add("hidden");
    $("#questionText").textContent = message;
    setLengthClass($("#questionText"), message, [80, 125, 165]);
    $("#questionId").textContent = "—";
    $("#nextQuestion").disabled = true;
    announce(message);
  }

  function presentQuestion(question, { persist = true } = {}) {
    if (!question) {
      finishSession("exhausted");
      return;
    }
    state.currentQuestion = question;
    state.pendingManualSelection = false;
    const category = categoryMap[question.categoryKey];
    $("#gameScreen").dataset.category = question.categoryKey;
    $("#categoryName").textContent = category?.label?.toUpperCase() || question.category.toUpperCase();
    $("#categorySymbol").src = category?.primarySymbolPath || "";
    $("#categorySymbol").classList.toggle("hidden", !category?.primarySymbolPath);
    $("#questionText").textContent = question.text;
    setLengthClass($("#questionText"), question.text, [80, 125, 165]);
    $("#questionId").textContent = question.displayId || question.id;
    $("#nextQuestion").disabled = false;
    $("#nextQuestion").textContent = state.engine.remainingCount === 0 ? "Concludi il mazzo →" : "Prossima domanda →";
    announce(`Ora prende parola ${state.players[state.currentPlayerIndex]}. ${question.text}. Categoria ${category?.label || question.category}. Domanda ID ${question.displayId || question.id}.`);
    if (persist) persistSession();
  }

  function advancePlayer() {
    state.currentPlayerIndex = window.GDTGameMath.nextPlayerIndex(state.currentPlayerIndex, state.players.length);
    renderCurrentPlayer();
  }

  function requestNextQuestion() {
    if (!state.engine?.hasRemaining()) {
      finishSession("exhausted");
      return;
    }
    advancePlayer();
    state.currentQuestion = null;

    if (state.drawMode === "manual") {
      state.pendingManualSelection = true;
      showWaitingQuestion("Scegli la categoria della prossima domanda.");
      persistSession();
      openCategoryDialog();
    } else {
      presentQuestion(state.engine.drawRandom());
    }
  }

  function renderCategoryGrid() {
    const grid = $("#categoryGrid");
    grid.innerHTML = "";
    const status = state.engine.categoryStatus();

    status.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-choice";
      button.disabled = category.exhausted;
      button.dataset.category = category.key;

      const image = document.createElement("img");
      image.src = category.primarySymbolPath;
      image.alt = "";
      image.setAttribute("aria-hidden", "true");

      const label = document.createElement("strong");
      label.textContent = category.label;

      const count = document.createElement("small");
      count.textContent = category.exhausted ? "Categoria esaurita" : `${category.remaining} domande disponibili`;

      button.append(image, label, count);
      button.addEventListener("click", () => chooseManualCategory(category.key));
      grid.append(button);
    });

    $("#randomThisTurn").disabled = !state.engine.hasRemaining();
  }

  function openCategoryDialog() {
    renderCategoryGrid();
    openModalNode($("#categoryDialog"));
    requestAnimationFrame(() => {
      $("#categoryGrid button:not(:disabled)")?.focus() || $("#randomThisTurn").focus();
    });
  }

  function closeCategoryDialog() {
    closeModalNode($("#categoryDialog"));
  }

  function chooseManualCategory(categoryKey) {
    const question = state.engine.drawFromCategory(categoryKey);
    closeCategoryDialog();
    presentQuestion(question);
  }

  function chooseRandomForTurn() {
    const question = state.engine.drawRandom();
    closeCategoryDialog();
    presentQuestion(question);
  }

  function openEndConfirm(trigger) {
    state.lastEndTrigger = trigger || document.activeElement;
    state.endDialogOpen = true;
    openModalNode($("#endConfirmDialog"));
    $("#continueGame").focus();
    persistSession();
  }

  function closeEndConfirm({ persist = true } = {}) {
    state.endDialogOpen = false;
    closeModalNode($("#endConfirmDialog"));
    if (persist) persistSession();
    state.lastEndTrigger?.focus?.();
  }

  function renderFinal(reason = state.finishReason) {
    $("#finalReason").textContent = reason === "exhausted"
      ? "TUTTE LE DOMANDE SONO STATE UTILIZZATE"
      : "PARTITA CONCLUSA";
    $("#finalTitle").textContent = content.finalTitle || "GRAZIE";
    $("#finalText").textContent = content.finalText || "";
  }

  function finishSession(reason) {
    closeCategoryDialog();
    closeEndConfirm({ persist: false });
    state.gameStarted = false;
    state.gameFinished = true;
    state.finishReason = reason === "exhausted" ? "exhausted" : "voluntary";
    state.pendingManualSelection = false;
    state.endDialogOpen = false;
    state.lastScreenBeforeMaking = "finalScreen";
    renderFinal(state.finishReason);
    showScreen("finalScreen");
  }

  function resetState() {
    sessionStore.clear();
    state.engine = null;
    state.currentQuestion = null;
    state.currentPlayerIndex = 0;
    state.gameStarted = false;
    state.gameFinished = false;
    state.finishReason = null;
    state.players = [];
    state.nameDrafts = [];
    state.numPlayers = 4;
    state.drawMode = "random";
    state.pendingManualSelection = false;
    state.endDialogOpen = false;
    state.lastScreenBeforeMaking = "openingScreen";
    state.galleryIndex = 0;
    closeCategoryDialog();
    closeEndConfirm({ persist: false });
    closeGalleryLightbox({ restoreFocus: false });
    syncSetupControls();
    $("#namesGrid").innerHTML = "";
  }

  function startNewGame() {
    resetState();
    showScreen("setupScreen", { persist: false });
    persistSession();
  }

  function returnToOpening() {
    resetState();
    showScreen("introScreen", { persist: false });
  }

  function openMaking(trigger, { focusAuthors = false } = {}) {
    state.lastMakingTrigger = trigger || document.activeElement;
    if (state.currentScreen !== "makingScreen") state.lastScreenBeforeMaking = state.currentScreen;
    renderGallery({ scrollThumb: false, persist: false });
    showScreen("makingScreen");
    requestAnimationFrame(() => {
      if (focusAuthors) {
        $("#authorsSection").scrollIntoView({ behavior: "smooth", block: "start" });
        $("#authorsSection").focus({ preventScroll: true });
      } else {
        $("#closeMaking").focus();
      }
    });
  }

  function closeMaking() {
    const target = screens.includes(state.lastScreenBeforeMaking) && state.lastScreenBeforeMaking !== "makingScreen"
      ? state.lastScreenBeforeMaking
      : "openingScreen";
    showScreen(target);
    if (target === "gameScreen") {
      if (state.pendingManualSelection) openCategoryDialog();
      else if (state.endDialogOpen) openEndConfirm($("#endGame"));
    }
    state.lastMakingTrigger?.focus?.();
  }

  function openGalleryLightbox(trigger) {
    state.lastLightboxTrigger = trigger || document.activeElement;
    renderGallery({ scrollThumb: false, persist: false });
    openModalNode($("#galleryLightbox"));
    $("#closeGalleryLightbox").focus();
  }

  function closeGalleryLightbox({ restoreFocus = true } = {}) {
    closeModalNode($("#galleryLightbox"));
    if (restoreFocus) state.lastLightboxTrigger?.focus?.();
  }

  function addSwipeNavigation(node, callback) {
    if (!node) return;
    let startX = null;
    let startY = null;
    node.addEventListener("touchstart", (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
    }, { passive: true });
    node.addEventListener("touchend", (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch || startX === null || startY === null) return;
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      startX = null;
      startY = null;
      if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      callback(deltaX < 0 ? 1 : -1);
    }, { passive: true });
  }

  function restoreGameState(snapshot) {
    if (state.players.length < 2 || state.currentPlayerIndex >= state.players.length) throw new Error("Stato giocatori non valido.");
    state.engine = new window.GDTQuestionEngine(questions, categories);
    state.engine.restoreUsedIds(Array.isArray(snapshot.usedIds) ? snapshot.usedIds : []);
    state.currentQuestion = snapshot.currentQuestionId ? questionById(snapshot.currentQuestionId) : null;
    renderCurrentPlayer();
    if (state.pendingManualSelection) {
      showWaitingQuestion("Scegli la categoria della prossima domanda.");
    } else if (state.currentQuestion) {
      presentQuestion(state.currentQuestion, { persist: false });
    } else if (state.engine.hasRemaining() && state.gameStarted) {
      if (state.drawMode === "manual") {
        state.pendingManualSelection = true;
        showWaitingQuestion("Scegli la categoria della prossima domanda.");
      } else {
        presentQuestion(state.engine.drawRandom(), { persist: false });
      }
    }
  }

  function restoreSession() {
    const snapshot = sessionStore.load();
    if (!snapshot || snapshot.datasetSignature !== datasetSignature) {
      if (snapshot) sessionStore.clear();
      return false;
    }

    state.restoring = true;
    try {
      state.numPlayers = normalizeCount(snapshot.numPlayers) || 4;
      state.drawMode = snapshot.drawMode === "manual" ? "manual" : "random";
      state.players = Array.isArray(snapshot.players) ? snapshot.players.slice(0, 30).map(String) : [];
      state.nameDrafts = Array.isArray(snapshot.nameDrafts) ? snapshot.nameDrafts.slice(0, 30).map(String) : [...state.players];
      state.currentPlayerIndex = Number.isInteger(snapshot.currentPlayerIndex) ? snapshot.currentPlayerIndex : 0;
      state.gameStarted = Boolean(snapshot.gameStarted);
      state.gameFinished = Boolean(snapshot.gameFinished);
      state.finishReason = snapshot.finishReason === "exhausted" ? "exhausted" : snapshot.finishReason === "voluntary" ? "voluntary" : null;
      state.pendingManualSelection = Boolean(snapshot.pendingManualSelection);
      state.endDialogOpen = Boolean(snapshot.endDialogOpen);
      state.lastScreenBeforeMaking = screens.includes(snapshot.lastScreenBeforeMaking) ? snapshot.lastScreenBeforeMaking : "openingScreen";
      state.galleryIndex = window.GDTGalleryMath.wrapIndex(Number(snapshot.galleryIndex || 0), galleryImages.length);
      syncSetupControls();
      renderGallery({ scrollThumb: false, persist: false });

      const requested = screens.includes(snapshot.currentScreen) ? snapshot.currentScreen : "openingScreen";

      if (state.gameStarted) {
        restoreGameState(snapshot);
        if (requested === "makingScreen") {
          showScreen("makingScreen", { persist: false });
        } else {
          showScreen("gameScreen", { persist: false });
          if (state.pendingManualSelection) openCategoryDialog();
          if (state.endDialogOpen) openEndConfirm($("#endGame"));
        }
        return true;
      }

      if (state.gameFinished) {
        state.engine = new window.GDTQuestionEngine(questions, categories);
        state.engine.restoreUsedIds(Array.isArray(snapshot.usedIds) ? snapshot.usedIds : []);
        state.currentQuestion = snapshot.currentQuestionId ? questionById(snapshot.currentQuestionId) : null;
        renderFinal(state.finishReason);
        if (requested === "makingScreen") showScreen("makingScreen", { persist: false });
        else showScreen("finalScreen", { persist: false });
        return true;
      }

      if (requested === "namesScreen") renderNameFields();
      if (requested === "readyScreen") renderReady();
      showScreen(requested === "makingScreen" ? "makingScreen" : requested, { persist: false });
      return true;
    } catch (_) {
      sessionStore.clear();
      return false;
    } finally {
      state.restoring = false;
    }
  }

  renderContent();
  renderGalleryThumbs();
  updateModeCards();

  $("#enterGame").addEventListener("click", () => showScreen("openingScreen"));
  $("#prepareGame").addEventListener("click", () => showScreen("setupScreen"));
  $("#backToOpening").addEventListener("click", () => showScreen("openingScreen"));
  $("#decreasePlayers").addEventListener("click", () => changePlayerCount(-1));
  $("#increasePlayers").addEventListener("click", () => changePlayerCount(1));
  $("#numPlayers").addEventListener("input", () => {
    const value = normalizeCount($("#numPlayers").value);
    if (value !== null) state.numPlayers = value;
    persistSession();
  });
  $("#numPlayers").addEventListener("change", () => {
    const value = normalizeCount($("#numPlayers").value);
    if (value !== null) {
      $("#numPlayers").value = String(value);
      state.numPlayers = value;
    }
    persistSession();
  });
  $$("input[name='drawMode']").forEach((radio) => radio.addEventListener("change", () => {
    state.drawMode = radio.value;
    updateModeCards();
    persistSession();
  }));
  $("#goToNames").addEventListener("click", () => {
    if (!validatePlayerCount()) return;
    renderNameFields();
    showScreen("namesScreen");
    $("#namesGrid input")?.focus();
  });
  $("#backToSetup").addEventListener("click", () => {
    captureNameDrafts();
    showScreen("setupScreen");
  });
  $("#goToReady").addEventListener("click", () => {
    if (!validateNames()) return;
    renderReady();
    showScreen("readyScreen");
  });
  $("#startGame").addEventListener("click", initializeGame);
  $("#nextQuestion").addEventListener("click", requestNextQuestion);
  $("#randomThisTurn").addEventListener("click", chooseRandomForTurn);

  $("#openMaking").addEventListener("click", (event) => openMaking(event.currentTarget));
  $("#openMakingGame").addEventListener("click", (event) => {
    closeCategoryDialog();
    closeEndConfirm({ persist: false });
    openMaking(event.currentTarget);
  });
  $("#openMakingFinal").addEventListener("click", (event) => openMaking(event.currentTarget));
  $("#openAuthorsFinal").addEventListener("click", (event) => openMaking(event.currentTarget, { focusAuthors: true }));
  $("#closeMaking").addEventListener("click", closeMaking);

  $("#galleryPrev").addEventListener("click", () => moveGallery(-1));
  $("#galleryNext").addEventListener("click", () => moveGallery(1));
  $("#openGalleryLightbox").addEventListener("click", (event) => openGalleryLightbox(event.currentTarget));
  $("#closeGalleryLightbox").addEventListener("click", () => closeGalleryLightbox());
  $("#lightboxPrev").addEventListener("click", () => moveGallery(-1));
  $("#lightboxNext").addEventListener("click", () => moveGallery(1));
  $("#galleryLightbox").addEventListener("click", (event) => {
    if (event.target === $("#galleryLightbox")) closeGalleryLightbox();
  });

  $("#endGame").addEventListener("click", (event) => openEndConfirm(event.currentTarget));
  $("#continueGame").addEventListener("click", () => closeEndConfirm());
  $("#confirmEndGame").addEventListener("click", () => finishSession("voluntary"));
  $("#endConfirmDialog").addEventListener("click", (event) => {
    if (event.target === $("#endConfirmDialog")) closeEndConfirm();
  });

  $("#newGame").addEventListener("click", startNewGame);
  $("#returnToOpening").addEventListener("click", returnToOpening);

  $("#galleryViewer").addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveGallery(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveGallery(1);
    }
  });
  addSwipeNavigation($("#galleryViewer"), moveGallery);
  addSwipeNavigation($("#galleryLightbox"), moveGallery);

  document.addEventListener("keydown", (event) => {
    const lightboxOpen = $("#galleryLightbox").getAttribute("aria-hidden") === "false";
    const endDialogOpen = $("#endConfirmDialog").getAttribute("aria-hidden") === "false";
    const categoryDialogOpen = $("#categoryDialog").getAttribute("aria-hidden") === "false";
    if (lightboxOpen) trapFocus(event, $("#galleryLightbox"));
    else if (endDialogOpen) trapFocus(event, $("#endConfirmDialog"));
    else if (categoryDialogOpen) trapFocus(event, $("#categoryDialog"));
    if (lightboxOpen && event.key === "ArrowLeft") {
      event.preventDefault();
      moveGallery(-1);
      return;
    }
    if (lightboxOpen && event.key === "ArrowRight") {
      event.preventDefault();
      moveGallery(1);
      return;
    }
    if (event.key !== "Escape") return;
    if (lightboxOpen) {
      closeGalleryLightbox();
    } else if (endDialogOpen) {
      closeEndConfirm();
    }
  });

  if (!restoreSession()) {
    syncSetupControls();
    showScreen("introScreen", { persist: false });
  }
})();
