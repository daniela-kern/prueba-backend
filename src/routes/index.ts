import { Router } from "express";
import {
  createUserController,
  getUserReservationsController,
} from "../controllers/user.controller.js";
import {
  availableRoomsController,
  createRoomController,
  listRoomsController,
} from "../controllers/room.controller.js";
import {
  cancelReservationController,
  createReservationController,
} from "../controllers/reservation.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const router = Router();

router.post(
  "/users",
  asyncHandler(createUserController),
);

router.get(
  "/users/:userId/reservations",
  asyncHandler(getUserReservationsController),
);

router.post(
  "/rooms",
  asyncHandler(createRoomController),
);

router.get(
  "/rooms/available",
  asyncHandler(availableRoomsController),
);

router.get(
  "/rooms",
  asyncHandler(listRoomsController),
);

router.post(
  "/reservations",
  asyncHandler(createReservationController),
);

router.delete(
  "/reservations/:id",
  asyncHandler(cancelReservationController),
);
