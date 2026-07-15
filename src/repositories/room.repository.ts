import type { PoolClient } from "pg";
import { pool } from "../database/pool.js";

export interface RoomRow {
  id: number;
  name: string;
  capacity: number;
}

export async function createRoom(
  name: string,
  capacity: number,
): Promise<RoomRow> {
  const result = await pool.query<RoomRow>(
    `
      INSERT INTO rooms (name, capacity)
      VALUES ($1, $2)
      RETURNING id, name, capacity
    `,
    [name, capacity],
  );

  return result.rows[0];
}

export async function listRooms(): Promise<RoomRow[]> {
  const result = await pool.query<RoomRow>(
    `
      SELECT id, name, capacity
      FROM rooms
      ORDER BY id
    `,
  );

  return result.rows;
}

export async function lockRoomById(
  client: PoolClient,
  roomId: number,
): Promise<RoomRow | null> {
  const result = await client.query<RoomRow>(
    `
      SELECT id, name, capacity
      FROM rooms
      WHERE id = $1
      FOR UPDATE
    `,
    [roomId],
  );

  return result.rows[0] ?? null;
}

export async function findAvailableRooms(
  startTime: Date,
  endTime: Date,
): Promise<RoomRow[]> {
  const result = await pool.query<RoomRow>(
    `
      SELECT r.id, r.name, r.capacity
      FROM rooms r
      WHERE NOT EXISTS (
        SELECT 1
        FROM reservations res
        WHERE res.room_id = r.id
          AND res.status = 'CONFIRMED'
          AND res.start_time < $2
          AND res.end_time > $1
      )
      ORDER BY r.id
    `,
    [startTime, endTime],
  );

  return result.rows;
}
