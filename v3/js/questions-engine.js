(() => {
  "use strict";

  class QuestionEngine {
    constructor(questions, categories, randomFn = Math.random) {
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new TypeError("Il mazzo delle domande deve essere un array non vuoto.");
      }
      if (!Array.isArray(categories) || categories.length === 0) {
        throw new TypeError("La configurazione delle categorie deve essere un array non vuoto.");
      }

      this.questions = questions.map((question) => ({ ...question }));
      this.categories = categories.map((category) => ({ ...category }));
      this.categoryKeys = new Set(this.categories.map((category) => category.key));
      this.randomFn = typeof randomFn === "function" ? randomFn : Math.random;
      this.usedIds = new Set();
      this.validateData();
    }

    validateData() {
      const ids = new Set();
      this.questions.forEach((question, index) => {
        if (!question || typeof question.id !== "string" || !question.id.trim()) {
          throw new Error(`Domanda ${index + 1}: ID mancante.`);
        }
        if (ids.has(question.id)) {
          throw new Error(`ID domanda duplicato: ${question.id}.`);
        }
        if (!question.text || typeof question.text !== "string") {
          throw new Error(`Domanda ${question.id}: testo mancante.`);
        }
        if (!this.categoryKeys.has(question.categoryKey)) {
          throw new Error(`Domanda ${question.id}: categoria sconosciuta ${question.categoryKey}.`);
        }
        ids.add(question.id);
      });
    }

    reset() {
      this.usedIds.clear();
    }

    restoreUsedIds(ids) {
      if (!Array.isArray(ids)) {
        throw new TypeError("Gli ID utilizzati devono essere forniti come array.");
      }
      const validIds = new Set(this.questions.map((question) => question.id));
      const restored = new Set();
      ids.forEach((id) => {
        if (typeof id !== "string" || !validIds.has(id)) {
          throw new Error(`Impossibile ripristinare l’ID domanda: ${id}.`);
        }
        restored.add(id);
      });
      this.usedIds = restored;
      return this.snapshot();
    }

    get totalCount() {
      return this.questions.length;
    }

    get usedCount() {
      return this.usedIds.size;
    }

    get remainingCount() {
      return this.totalCount - this.usedCount;
    }

    remainingQuestions(categoryKey = null) {
      return this.questions.filter((question) => {
        const categoryMatches = categoryKey ? question.categoryKey === categoryKey : true;
        return categoryMatches && !this.usedIds.has(question.id);
      });
    }

    remainingByCategory(categoryKey) {
      return this.remainingQuestions(categoryKey).length;
    }

    categoryStatus() {
      return this.categories.map((category) => ({
        ...category,
        remaining: this.remainingByCategory(category.key),
        exhausted: this.remainingByCategory(category.key) === 0
      }));
    }

    choose(items) {
      if (!items.length) return null;
      const raw = Number(this.randomFn());
      const safe = Number.isFinite(raw) ? Math.min(0.999999999, Math.max(0, raw)) : 0;
      return items[Math.floor(safe * items.length)];
    }

    use(question) {
      if (!question) return null;
      if (this.usedIds.has(question.id)) {
        throw new Error(`La domanda ${question.id} è già stata utilizzata.`);
      }
      this.usedIds.add(question.id);
      return { ...question };
    }

    drawRandom() {
      return this.use(this.choose(this.remainingQuestions()));
    }

    drawFromCategory(categoryKey) {
      if (!this.categoryKeys.has(categoryKey)) {
        throw new Error(`Categoria sconosciuta: ${categoryKey}.`);
      }
      return this.use(this.choose(this.remainingQuestions(categoryKey)));
    }

    hasRemaining(categoryKey = null) {
      return categoryKey ? this.remainingByCategory(categoryKey) > 0 : this.remainingCount > 0;
    }

    snapshot() {
      return {
        usedIds: [...this.usedIds],
        usedCount: this.usedCount,
        totalCount: this.totalCount,
        remainingCount: this.remainingCount
      };
    }
  }

  const GameMath = Object.freeze({
    nextPlayerIndex(currentIndex, playerCount) {
      if (!Number.isInteger(playerCount) || playerCount < 1) {
        throw new TypeError("Il numero dei giocatori deve essere positivo.");
      }
      const current = Number.isInteger(currentIndex) ? currentIndex : 0;
      return (current + 1) % playerCount;
    }
  });

  if (typeof window !== "undefined") {
    window.GDTQuestionEngine = QuestionEngine;
    window.GDTGameMath = GameMath;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { QuestionEngine, GameMath };
  }
})();
