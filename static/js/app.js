/* ============================================================
   Veritas — app.js
   Shared, screen-agnostic behavior.
   ============================================================ */
(function () {
  // Some mobile browsers miscalculate 100dvh behind the address bar;
  // this keeps full-bleed camera screens accurate on load/resize.
  function setViewportUnit() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  }
  setViewportUnit();
  window.addEventListener('resize', setViewportUnit);
})();
