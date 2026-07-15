import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./database/pool.js";

const server = app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Shutting down...`);

  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
