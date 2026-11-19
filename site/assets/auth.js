// Sign up and sign in previews. Accounts are coming next, so a submit only shows a notice:
// nothing is sent (the form has no destination and its fields have no name, so even a browser
// that ignored this script and the CSP's form-action 'none' would submit nothing), and nothing
// is stored. The password is never read: it is cleared on submit.
for (const form of document.querySelectorAll("form[data-auth]")) {
  const card = form.closest(".auth-card");
  const done = card.querySelector("[data-auth-done]");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    for (const p of form.querySelectorAll('input[type="password"]')) p.value = "";
    if (form.dataset.auth === "signup") {
      const org = form.querySelector("#su-org").value.trim();
      const domain = form.querySelector("#su-domain").value.trim();
      const echo = done.querySelector("[data-echo]");
      if (echo && org && domain) echo.textContent = `${org} and ${domain} stay in this tab only.`;
    }
    form.hidden = true;
    card.querySelector(".auth-note").hidden = true;
    done.hidden = false;
    done.querySelector("h2").focus();
  });
}
