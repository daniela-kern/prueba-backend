import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { pool } from "../src/database/pool.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const schemaPath = resolve(currentDir, "../src/database/schema.sql");

async function main(): Promise<void> {
  const schema = await readFile(schemaPath, "utf8");
  await pool.query(schema);
  console.log("Database initialized successfully.");
}

main()
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
