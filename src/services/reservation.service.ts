import { withTransaction } from "../database/pool.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../errors/AppError.js";
import { findUserById } from "../repositories/user.repository.js";
import { lockRoomById } from "../repositories/room.repository.js";
import {
  cancelReservationById,
  findConflict,
  findReservationById,
  insertReservation,
  listReservationsByUser,
} from "../repositories/reservation.repository.js";
import type {
  CreateReservationInput,
  Reservation,
  ReservationStatus,
} from "../types/reservation.js";

function assertValidPeriod(
  startTime: Date,
  endTime: Date,
): void {
  if (
    Number.isNaN(startTime.getTime()) ||
    Number.isNaN(endTime.getTime())
  ) {
    throw new BadRequestError(
      "INVALID_DATE",
      "startTime y endTime deben ser fechas ISO válidas",
    );
  }

  if (startTime >= endTime) {
    throw new BadRequestError(
      "INVALID_RESERVATION_PERIOD",
      "La hora de inicio debe ser anterior a la hora de término",
    );
  }
}

export async function createReservation(
  input: CreateReservationInput,
): Promise<Reservation> {
  assertValidPeriod(input.startTime, input.endTime);

  return withTransaction(async (client) => {
    const user = await findUserById(client, input.userId);

    if (!user) {
      throw new NotFoundError(
        "USER_NOT_FOUND",
        "El usuario no existe",
      );
    }

    /*
     * Punto crítico L3:
     *
     * Bloqueamos la fila de la sala dentro de la misma transacción
     * antes de comprobar conflictos.
     *
     * Dos requests concurrentes para la misma sala no pueden pasar
     * simultáneamente por la sección crítica.
     */
    const room = await lockRoomById(client, input.roomId);

    if (!room) {
      throw new NotFoundError(
        "ROOM_NOT_FOUND",
        "La sala no existe",
      );
    }

    const conflict = await findConflict(
      client,
      input.roomId,
      input.startTime,
      input.endTime,
    );

    if (conflict) {
      throw new ConflictError(
        "ROOM_NOT_AVAILABLE",
        "La sala ya está reservada en ese horario",
      );
    }

    return insertReservation(client, input);
  });
}

export async function getUserReservations(
  userId: number,
  status?: ReservationStatus,
): Promise<Reservation[]> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new BadRequestError(
      "INVALID_USER_ID",
      "userId debe ser un entero positivo",
    );
  }

  return listReservationsByUser(userId, status);
}

export async function cancelReservation(
  reservationId: number,
): Promise<Reservation> {
  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    throw new BadRequestError(
      "INVALID_RESERVATION_ID",
      "reservationId debe ser un entero positivo",
    );
  }

  return withTransaction(async (client) => {
    const existing = await findReservationById(
      client,
      reservationId,
    );

    if (!existing) {
      throw new NotFoundError(
        "RESERVATION_NOT_FOUND",
        "La reserva no existe",
      );
    }

    /*
     * Cancelar también cambia la disponibilidad de la sala.
     * Por eso usa el mismo lock que la creación de reservas.
     */
    await lockRoomById(client, existing.roomId);

    const cancelled = await cancelReservationById(
      client,
      reservationId,
    );

    if (!cancelled) {
      throw new NotFoundError(
        "RESERVATION_NOT_FOUND",
        "La reserva no existe",
      );
    }

    return cancelled;
  });
}
