import type { PoolClient } from "pg";
import { pool } from "../database/pool.js";
import type {
  CreateReservationInput,
  Reservation,
  ReservationStatus,
} from "../types/reservation.js";

interface ReservationRow {
  id: number;
  user_id: number;
  room_id: number;
  start_time: Date;
  end_time: Date;
  status: ReservationStatus;
  created_at: Date;
}

function mapReservation(row: ReservationRow): Reservation {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    roomId: Number(row.room_id),
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function findConflict(
  client: PoolClient,
  roomId: number,
  startTime: Date,
  endTime: Date,
): Promise<Reservation | null> {
  const result = await client.query<ReservationRow>(
    `
      SELECT
        id,
        user_id,
        room_id,
        start_time,
        end_time,
        status,
        created_at
      FROM reservations
      WHERE room_id = $1
        AND status = 'CONFIRMED'
        AND start_time < $3
        AND end_time > $2
      LIMIT 1
    `,
    [roomId, startTime, endTime],
  );

  return result.rows[0] ? mapReservation(result.rows[0]) : null;
}

export async function insertReservation(
  client: PoolClient,
  input: CreateReservationInput,
): Promise<Reservation> {
  const result = await client.query<ReservationRow>(
    `
      INSERT INTO reservations (
        user_id,
        room_id,
        start_time,
        end_time,
        status
      )
      VALUES ($1, $2, $3, $4, 'CONFIRMED')
      RETURNING
        id,
        user_id,
        room_id,
        start_time,
        end_time,
        status,
        created_at
    `,
    [
      input.userId,
      input.roomId,
      input.startTime,
      input.endTime,
    ],
  );

  return mapReservation(result.rows[0]);
}

export async function listReservationsByUser(
  userId: number,
  status?: ReservationStatus,
): Promise<Reservation[]> {
  const values: unknown[] = [userId];
  const statusClause = status ? "AND status = $2" : "";

  if (status) {
    values.push(status);
  }

  const result = await pool.query<ReservationRow>(
    `
      SELECT
        id,
        user_id,
        room_id,
        start_time,
        end_time,
        status,
        created_at
      FROM reservations
      WHERE user_id = $1
      ${statusClause}
      ORDER BY start_time ASC
    `,
    values,
  );

  return result.rows.map(mapReservation);
}

export async function findReservationById(
  client: PoolClient,
  reservationId: number,
): Promise<Reservation | null> {
  const result = await client.query<ReservationRow>(
    `
      SELECT
        id,
        user_id,
        room_id,
        start_time,
        end_time,
        status,
        created_at
      FROM reservations
      WHERE id = $1
    `,
    [reservationId],
  );

  return result.rows[0] ? mapReservation(result.rows[0]) : null;
}

export async function cancelReservationById(
  client: PoolClient,
  reservationId: number,
): Promise<Reservation | null> {
  const result = await client.query<ReservationRow>(
    `
      UPDATE reservations
      SET status = 'CANCELLED'
      WHERE id = $1
      RETURNING
        id,
        user_id,
        room_id,
        start_time,
        end_time,
        status,
        created_at
    `,
    [reservationId],
  );

  return result.rows[0] ? mapReservation(result.rows[0]) : null;
}
