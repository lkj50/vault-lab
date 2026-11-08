// Stub de infraestructura.
import type { Router } from "express";
import express from "express";
import qrcode from "qrcode";
import { config } from "../config.js";

export const devRouter: Router = express.Router();

devRouter.get("/dev/qr", async (_req, res) => {
  const otpauth = `otpauth://totp/UniSabana:estudiante@unisabana.edu.co?secret=${config.totpSecret}&issuer=UniSabana`;
  const qr = await qrcode.toDataURL(otpauth);

  res.status(200).type("html").send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>QR TOTP</title>
<style>body{background:#0B0F1A;color:#E5E7EB;font-family:system-ui;text-align:center;padding:40px}img{max-width:300px;background:white;padding:16px}.secret{color:#22D3EE;font-family:monospace}</style>
</head>
<body>
  <h1>Configuración TOTP</h1>
  <img src="${qr}" alt="QR TOTP">
  <p>Secreto: <span class="secret">${config.totpSecret}</span></p>
</body>
</html>`);
});
