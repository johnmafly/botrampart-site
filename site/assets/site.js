// Shared, tiny, optional. Light that follows the pointer across tiles and cards.
// Without JS the tiles keep a fixed glow; with reduced motion nothing here moves.
if (matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) {
  for (const el of document.querySelectorAll(".tile, .ed, .rung, .fit > div")) {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }
}
