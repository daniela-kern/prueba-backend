import { describe, expect, it } from "vitest";
import { intervalsOverlap } from "../src/types/reservation.js";

describe("intervalsOverlap", () => {
  const date = (hourMinute: string): Date =>
    new Date(`2026-07-20T${hourMinute}:00Z`);

  it("detecta una superposición parcial", () => {
    expect(
      intervalsOverlap(
        date("10:00"),
        date("11:00"),
        date("10:30"),
        date("11:30"),
      ),
    ).toBe(true);
  });

  it("detecta una reserva contenida dentro de otra", () => {
    expect(
      intervalsOverlap(
        date("10:00"),
        date("12:00"),
        date("10:30"),
        date("11:00"),
      ),
    ).toBe(true);
  });

  it("permite reservas consecutivas", () => {
    expect(
      intervalsOverlap(
        date("10:00"),
        date("11:00"),
        date("11:00"),
        date("12:00"),
      ),
    ).toBe(false);
  });
});
