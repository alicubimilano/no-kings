(() => {
  "use strict";

  const STORAGE_KEY = "giu-dal-trono-v03-session";
  const SCHEMA_VERSION = 2;

  function safeStorage(storage) {
    if (storage) return storage;
    try {
      return window.sessionStorage;
    } catch (_) {
      return null;
    }
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  class SessionStore {
    constructor(storage = null, key = STORAGE_KEY) {
      this.storage = safeStorage(storage);
      this.key = key;
    }

    save(snapshot) {
      if (!this.storage || !isPlainObject(snapshot)) return false;
      const payload = {
        schemaVersion: SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        ...snapshot
      };
      try {
        this.storage.setItem(this.key, JSON.stringify(payload));
        return true;
      } catch (_) {
        return false;
      }
    }

    load() {
      if (!this.storage) return null;
      try {
        const raw = this.storage.getItem(this.key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!isPlainObject(parsed) || parsed.schemaVersion !== SCHEMA_VERSION) {
          this.clear();
          return null;
        }
        return parsed;
      } catch (_) {
        this.clear();
        return null;
      }
    }

    clear() {
      if (!this.storage) return false;
      try {
        this.storage.removeItem(this.key);
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  if (typeof window !== "undefined") {
    window.GDTSessionStore = SessionStore;
    window.GDT_SESSION_KEY = STORAGE_KEY;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { SessionStore, STORAGE_KEY, SCHEMA_VERSION };
  }
})();
