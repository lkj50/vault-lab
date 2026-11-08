// Stub de infraestructura.
interface LoginPageOptions {
  responseType: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderLoginPage(options: LoginPageOptions): string {
  const error = options.error
    ? `<div class="error">${escapeHtml(options.error)}</div>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Vault - Iniciar sesión</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #0B0F1A; color: #E5E7EB; }
    main { width: min(420px, calc(100% - 32px)); padding: 32px; border: 1px solid #1f2937; border-radius: 18px; background: #111827; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
    h1 { margin: 0 0 8px; color: #22D3EE; }
    p { margin: 0 0 24px; color: #9CA3AF; }
    label { display: block; margin: 14px 0 6px; font-size: 14px; }
    input { width: 100%; border: 1px solid #374151; border-radius: 9px; padding: 12px; background: #0B0F1A; color: #E5E7EB; }
    button { width: 100%; margin-top: 20px; border: 0; border-radius: 9px; padding: 12px; background: #22D3EE; color: #0B0F1A; font-weight: 700; cursor: pointer; }
    .error { margin-bottom: 16px; border-radius: 8px; padding: 10px; background: #451a1a; color: #fecaca; }
  </style>
</head>
<body>
  <main>
    <h1>Vault</h1>
    <p>Inicia sesión para continuar</p>
    ${error}
    <form method="post" action="/oauth/authorize">
      <label for="email">Correo electrónico</label>
      <input id="email" name="email" type="email" autocomplete="email" required>
      <label for="password">Contraseña</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <input type="hidden" name="response_type" value="${escapeHtml(options.responseType)}">
      <input type="hidden" name="client_id" value="${escapeHtml(options.clientId)}">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(options.redirectUri)}">
      <input type="hidden" name="code_challenge" value="${escapeHtml(options.codeChallenge)}">
      <input type="hidden" name="code_challenge_method" value="${escapeHtml(options.codeChallengeMethod)}">
      <input type="hidden" name="state" value="${escapeHtml(options.state)}">
      <button type="submit">Ingresar</button>
    </form>
  </main>
</body>
</html>`;
}
