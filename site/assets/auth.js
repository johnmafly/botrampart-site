// Sign up and sign in, private preview: a submit opens onto an honest ending: no account exists, the
// console opens with sample data, and the Cloud waitlist is the way to an account. Nothing is sent
// (the form has no destination and its fields have no name, so even a browser that ignored this
// script and the CSP's form-action 'none' would submit nothing), and nothing is stored. The password
// is never read: it is cleared on submit. The site domain from sign-up travels to the console only
// in the URL's #fragment, which browsers never send to a server.
export const cleanDomain = (raw) => {
  const host = String(raw).trim().toLowerCase().replace(/^[a-z]+:\/\//, "").split(/[/?#:]/)[0];
  return /^(?=.{1,120}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(host) ? host : "";
};

if (typeof document !== "undefined") {
  for (const form of document.querySelectorAll("form[data-auth]")) {
    const card = form.closest(".auth-card");
    const done = card.querySelector("[data-auth-done]");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      for (const p of form.querySelectorAll('input[type="password"]')) p.value = "";
      if (form.dataset.auth === "signup") {
        const org = form.querySelector("#su-org").value.trim();
        const domain = cleanDomain(form.querySelector("#su-domain").value);
        const echo = done.querySelector("[data-echo]");
        const link = done.querySelector("[data-console-link]");
        if (domain && link) {
          link.href = `/dashboard/#site=${encodeURIComponent(domain)}`;
          link.textContent = `Open the console for ${domain}`;
        }
        if (echo && org && domain) echo.textContent = `The console shows ${domain} for ${org} with sample traffic: none of your site's traffic reaches this preview.`;
      }
      form.hidden = true;
      card.querySelector(".auth-note").hidden = true;
      done.hidden = false;
      done.querySelector("h2").focus();
    });
  }
}
