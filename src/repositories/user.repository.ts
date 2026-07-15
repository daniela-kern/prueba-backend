import type { PoolClient } from "pg";
import { pool } from "../database/pool.js";

export interface UserRow {
  id: number;
  name: string;
  email: string;
}

export async function createUser(
  name: string,
  email: string,
): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `
      INSERT INTO users (name, email)
      VALUES ($1, $2)
      RETURNING id, name, email
    `,
    [name, email],
  );

  return result.rows[0];
}

export async function findUserById(
  client: PoolClient,
  userId: number,
): Promise<UserRow | null> {
  const result = await client.query<UserRow>(
    `
      SELECT id, name, email
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}
