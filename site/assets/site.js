// Shared, tiny, optional. Every page works without it: the menus are <details>, and "Copy agent
// prompt" is a link to the prompt on the home page.

// Light that follows the pointer across tiles and cards.
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

// Header menus (audit #14): one open at a time (the shared name="main-menu" does this in current
// browsers; this covers the rest), Escape closes the open one and returns focus to its button, and
// a click or tap outside closes every one. The compact header's Menu also closes on a link tap.
const menus = [...document.querySelectorAll(".top details[data-menu], .top details[data-phone-menu]")];
for (const d of menus) {
  d.addEventListener("toggle", () => {
    if (d.open) for (const o of menus) if (o !== d && o.open) o.open = false;
  });
  d.addEventListener("click", (e) => { if (e.target.closest("a")) d.open = false; });
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const open = menus.find((d) => d.open);
  if (!open) return;
  open.open = false;
  open.querySelector("summary").focus();
});
document.addEventListener("click", (e) => {
  for (const d of menus) if (d.open && !d.contains(e.target)) d.open = false;
});

// "Copy agent prompt" (audit #12): copies the Autoinstall prompt and says so beside the button. On
// the home page that is the prompt for the stack picked there; elsewhere the default stack's. With
// no clipboard, or when copying fails, the link goes to the prompt on the home page as written.
for (const link of document.querySelectorAll("[data-copy-agent-prompt]")) {
  link.addEventListener("click", async (e) => {
    if (!navigator.clipboard?.writeText) return;
    e.preventDefault();
    const status = link.closest("[data-copy-wrap]")?.querySelector("[data-copy-status]");
    try {
      const own = document.querySelector("[data-ai-prompt]");
      const text = own ? own.textContent : (await import("/assets/ai-install.js")).buildPrompt();
      await navigator.clipboard.writeText(text);
      link.classList.add("is-done");
      if (status) {
        status.textContent = "Prompt copied. Paste it into your coding agent.";
        clearTimeout(link.copyTimer);
        link.copyTimer = setTimeout(() => { status.textContent = ""; link.classList.remove("is-done"); }, 6000);
      }
    } catch {
      location.href = link.href;
    }
  });
}
