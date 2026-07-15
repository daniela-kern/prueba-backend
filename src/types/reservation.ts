export type ReservationStatus = "CONFIRMED" | "CANCELLED";

export interface CreateReservationInput {
  userId: number;
  roomId: number;
  startTime: Date;
  endTime: Date;
}

export interface Reservation {
  id: number;
  userId: number;
  roomId: number;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  createdAt: Date;
}

export function intervalsOverlap(
  existingStart: Date,
  existingEnd: Date,
  newStart: Date,
  newEnd: Date,
): boolean {
  return existingStart < newEnd && existingEnd > newStart;
}
