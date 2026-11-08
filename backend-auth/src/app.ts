import cors from "cors";
import express from "express";
import { apiRouter } from "./routes/api.js";
import { authRouter } from "./routes/auth.js";
import { devRouter } from "./routes/dev.js";
import { oauthRouter } from "./routes/oauth.js";

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use("/oauth", oauthRouter);
  app.use(authRouter);
  app.use(apiRouter);
  app.use(devRouter);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  return app;
}
