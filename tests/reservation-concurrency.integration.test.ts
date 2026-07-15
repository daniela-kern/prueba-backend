import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const runIntegration = Boolean(testDatabaseUrl);

describe.runIf(runIntegration)(
  "concurrent reservations",
  () => {
    let pool: Pool;
    let user1Id: number;
    let user2Id: number;
    let roomId: number;

    beforeAll(async () => {
      process.env.DATABASE_URL = testDatabaseUrl;

      const { pool: applicationPool } = await import(
        "../src/database/pool.js"
      );

      pool = applicationPool;

      const suffix = randomUUID();

      const user1 = await pool.query<{ id: number }>(
        `
          INSERT INTO users (name, email)
          VALUES ($1, $2)
          RETURNING id
        `,
        ["User 1", `user1-${suffix}@example.com`],
      );

      const user2 = await pool.query<{ id: number }>(
        `
          INSERT INTO users (name, email)
          VALUES ($1, $2)
          RETURNING id
        `,
        ["User 2", `user2-${suffix}@example.com`],
      );

      const room = await pool.query<{ id: number }>(
        `
          INSERT INTO rooms (name, capacity)
          VALUES ($1, $2)
          RETURNING id
        `,
        [`Concurrent Room ${suffix}`, 10],
      );

      user1Id = Number(user1.rows[0].id);
      user2Id = Number(user2.rows[0].id);
      roomId = Number(room.rows[0].id);
    });

    afterAll(async () => {
      await pool.query(
        "DELETE FROM reservations WHERE room_id = $1",
        [roomId],
      );
      await pool.query(
        "DELETE FROM rooms WHERE id = $1",
        [roomId],
      );
      await pool.query(
        "DELETE FROM users WHERE id = ANY($1::integer[])",
        [[user1Id, user2Id]],
      );
      await pool.end();
    });

    it("confirma una sola reserva cuando llegan dos solicitudes simultáneas", async () => {
      const { createReservation } = await import(
        "../src/services/reservation.service.js"
      );

      const startTime = new Date(
        "2026-07-20T10:00:00Z",
      );
      const endTime = new Date(
        "2026-07-20T11:00:00Z",
      );

      const results = await Promise.allSettled([
        createReservation({
          userId: user1Id,
          roomId,
          startTime,
          endTime,
        }),
        createReservation({
          userId: user2Id,
          roomId,
          startTime,
          endTime,
        }),
      ]);

      const fulfilled = results.filter(
        (result) => result.status === "fulfilled",
      );

      const rejected = results.filter(
        (result) => result.status === "rejected",
      );

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const stored = await pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM reservations
          WHERE room_id = $1
            AND status = 'CONFIRMED'
            AND start_time = $2
            AND end_time = $3
        `,
        [roomId, startTime, endTime],
      );

      expect(Number(stored.rows[0].count)).toBe(1);
    });
  },
);
