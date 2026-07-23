import { authEnabled, currentSession, sendMagicLink, signInWithPassword, signOut, signUpWithPassword } from "../services/auth-service.js";

export function openAccountDialog(dialog) {
  const session = currentSession();
  dialog.querySelector(".dialog-content").innerHTML = session ? `
    <h2>Min konto</h2><p>Du er logget ind${session.user?.email ? ` som <strong>${escapeHtml(session.user.email)}</strong>` : ""}.</p>
    <p>RavRadar virker også uden login. Lokale ture og observationer bliver på denne enhed.</p>
    <button id="signOutButton" class="primary-button" type="button">Log ud</button>` : `
    <h2>Login er valgfrit</h2><p>Appen virker fuldt ud uden en konto. Login kan bruges til senere synkronisering.</p>
    ${authEnabled() ? `<form id="authForm" class="stack-form">
      <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
      <label>Adgangskode<input name="password" type="password" autocomplete="current-password" minlength="6"></label>
      <div class="button-row"><button class="primary-button" name="action" value="login">Log ind</button><button name="action" value="signup">Opret konto</button></div>
      <button name="action" value="magic">Send magic link</button><p id="authStatus" class="form-status"></p>
    </form>` : `<div class="notice">Supabase-login er klar i koden, men aktiveres først, når URL og publishable key er indsat i <code>config.js</code>.</div>`}`;
  dialog.showModal();
  dialog.querySelector("#signOutButton")?.addEventListener("click", async () => { await signOut(); dialog.close(); });
  dialog.querySelector("#authForm")?.addEventListener("submit", async event => {
    event.preventDefault(); const status = dialog.querySelector("#authStatus"); const data = new FormData(event.currentTarget); const action = event.submitter?.value;
    status.textContent = "Arbejder…";
    try {
      if (action === "magic") { await sendMagicLink(data.get("email")); status.textContent = "Magic link er sendt. Kontroller din indbakke."; }
      else if (action === "signup") { await signUpWithPassword(data.get("email"), data.get("password")); status.textContent = "Kontoen er oprettet. Kontroller eventuelt din e-mail."; }
      else { await signInWithPassword(data.get("email"), data.get("password")); dialog.close(); }
    } catch (error) { status.textContent = error.message; }
  });
}
function escapeHtml(value="") { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]); }
