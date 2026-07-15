import type { Request, Response } from "express";
import { BadRequestError } from "../errors/AppError.js";
import { createUser } from "../repositories/user.repository.js";
import { getUserReservations } from "../services/reservation.service.js";
import type { ReservationStatus } from "../types/reservation.js";

export async function createUserController(
  req: Request,
  res: Response,
): Promise<void> {
  const { name, email } = req.body as {
    name?: unknown;
    email?: unknown;
  };

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    typeof email !== "string" ||
    !email.includes("@")
  ) {
    throw new BadRequestError(
      "INVALID_USER_DATA",
      "name y email son obligatorios",
    );
  }

  const user = await createUser(name.trim(), email.trim().toLowerCase());
  res.status(201).json(user);
}

export async function getUserReservationsController(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = Number(req.params.userId);
  const rawStatus = req.query.status;

  let status: ReservationStatus | undefined;

  if (rawStatus !== undefined) {
    if (rawStatus !== "CONFIRMED" && rawStatus !== "CANCELLED") {
      throw new BadRequestError(
        "INVALID_STATUS",
        "status debe ser CONFIRMED o CANCELLED",
      );
    }

    status = rawStatus;
  }

  const reservations = await getUserReservations(userId, status);
  res.json(reservations);
}
