// Docs pages: apply the reader's explicit theme choice before first paint (loaded in <head>,
// not deferred). Without a stored choice the docs are dark, like the rest of the site.
try {
  const t = localStorage.getItem("br-theme");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch { /* storage blocked: the docs stay dark */ }
