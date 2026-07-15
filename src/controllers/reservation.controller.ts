import type { Request, Response } from "express";
import { BadRequestError } from "../errors/AppError.js";
import {
  cancelReservation,
  createReservation,
} from "../services/reservation.service.js";

function parsePositiveInteger(
  value: unknown,
  field: string,
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestError(
      `INVALID_${field.toUpperCase()}`,
      `${field} debe ser un entero positivo`,
    );
  }

  return parsed;
}

export async function createReservationController(
  req: Request,
  res: Response,
): Promise<void> {
  const {
    userId,
    roomId,
    startTime,
    endTime,
  } = req.body as {
    userId?: unknown;
    roomId?: unknown;
    startTime?: unknown;
    endTime?: unknown;
  };

  if (
    typeof startTime !== "string" ||
    typeof endTime !== "string"
  ) {
    throw new BadRequestError(
      "INVALID_DATE",
      "startTime y endTime deben enviarse como fechas ISO",
    );
  }

  const reservation = await createReservation({
    userId: parsePositiveInteger(userId, "userId"),
    roomId: parsePositiveInteger(roomId, "roomId"),
    startTime: new Date(startTime),
    endTime: new Date(endTime),
  });

  res.status(201).json(reservation);
}

export async function cancelReservationController(
  req: Request,
  res: Response,
): Promise<void> {
  const reservationId = parsePositiveInteger(
    req.params.id,
    "reservationId",
  );

  const reservation = await cancelReservation(reservationId);
  res.json(reservation);
}
