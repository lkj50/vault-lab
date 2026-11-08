import "dotenv/config";
import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

app.listen(config.port, config.host, () => {
  console.log(`Servidor escuchando en http://${config.host}:${config.port}`);
});
