import type { Request, Response } from "express";
import { BadRequestError } from "../errors/AppError.js";
import {
  createRoom,
  findAvailableRooms,
  listRooms,
} from "../repositories/room.repository.js";

export async function createRoomController(
  req: Request,
  res: Response,
): Promise<void> {
  const { name, capacity } = req.body as {
    name?: unknown;
    capacity?: unknown;
  };

  const parsedCapacity = Number(capacity);

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    !Number.isInteger(parsedCapacity) ||
    parsedCapacity <= 0
  ) {
    throw new BadRequestError(
      "INVALID_ROOM_DATA",
      "name es obligatorio y capacity debe ser un entero positivo",
    );
  }

  const room = await createRoom(name.trim(), parsedCapacity);
  res.status(201).json(room);
}

export async function listRoomsController(
  _req: Request,
  res: Response,
): Promise<void> {
  const rooms = await listRooms();
  res.json(rooms);
}

export async function availableRoomsController(
  req: Request,
  res: Response,
): Promise<void> {
  const startTime = new Date(String(req.query.startTime ?? ""));
  const endTime = new Date(String(req.query.endTime ?? ""));

  if (
    Number.isNaN(startTime.getTime()) ||
    Number.isNaN(endTime.getTime()) ||
    startTime >= endTime
  ) {
    throw new BadRequestError(
      "INVALID_RESERVATION_PERIOD",
      "startTime y endTime deben ser fechas válidas y startTime debe ser anterior a endTime",
    );
  }

  const rooms = await findAvailableRooms(startTime, endTime);
  res.json(rooms);
}
