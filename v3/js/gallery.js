(() => {
  "use strict";

  function wrapIndex(index, length) {
    if (!Number.isInteger(length) || length <= 0) return 0;
    const numeric = Number.isFinite(Number(index)) ? Number(index) : 0;
    return ((numeric % length) + length) % length;
  }

  function moveIndex(current, delta, length) {
    return wrapIndex(Number(current || 0) + Number(delta || 0), length);
  }

  const api = { wrapIndex, moveIndex };
  if (typeof window !== "undefined") window.GDTGalleryMath = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
