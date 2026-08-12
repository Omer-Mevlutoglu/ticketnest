import { Types } from "mongoose";
import { describe, expect, it, vi } from "vitest";
import BookingModel from "../src/models/bookingModel";
import SeatMapModel from "../src/models/seatMapModel";
import { ExpiryWorker } from "../src/jobs/expiryWorker";
import * as bookingService from "../src/services/bookingService";
import {
  createAttendee,
  createBooking,
  createEventWithSeatMap,
} from "./factories";

/**
 * WP1.5 — the worker must be safe to operate: no overlapping runs, no
 * double-counting, and a shutdown that lets in-flight work finish.
 */

const silent = { log: () => {}, error: () => {} };
const past = () => new Date(Date.now() - 60_000);

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("WP1.5 — expiry worker", () => {
  describe("overlap protection", () => {
    it("refuses a second run while the first is in flight", async () => {
      const gate = deferred<bookingService.ExpireOverdueResult>();
      const run = vi.fn(() => gate.promise);
      const worker = new ExpiryWorker({ run, logger: silent });

      const first = worker.runOnce();
      const second = await worker.runOnce();

      expect(second).toEqual({ status: "skipped", reason: "already-running" });
      expect(run).toHaveBeenCalledTimes(1);

      gate.resolve({ expiredCount: 1, releasedSeats: 2, failedCount: 0 });
      await expect(first).resolves.toEqual({
        status: "ran",
        expiredCount: 1,
        releasedSeats: 2,
        failedCount: 0,
      });
    });

    it("does not double-count when invoked concurrently against real data", async () => {
      const { user } = await createAttendee();
      const { event } = await createEventWithSeatMap();
      const eventId = event._id as Types.ObjectId;
      const userId = user._id as Types.ObjectId;

      await SeatMapModel.updateOne(
        { eventId },
        {
          $set: {
            "seats.$[s].status": "reserved",
            "seats.$[s].reservedBy": userId,
            "seats.$[s].reservedUntil": past(),
          },
        },
        { arrayFilters: [{ "s.x": 0, "s.y": 0 }] }
      );
      await createBooking({
        userId,
        eventId,
        items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
        expiresAt: past(),
      });

      const worker = new ExpiryWorker({ logger: silent });
      const outcomes = await Promise.all([
        worker.runOnce(),
        worker.runOnce(),
        worker.runOnce(),
      ]);

      const ran = outcomes.filter((o) => o.status === "ran");
      const skipped = outcomes.filter((o) => o.status === "skipped");

      expect(ran).toHaveLength(1);
      expect(skipped).toHaveLength(2);
      expect(ran[0]).toMatchObject({ expiredCount: 1, releasedSeats: 1 });

      const map = await SeatMapModel.findOne({ eventId }).lean();
      expect(map!.seats.find((s) => s.x === 0 && s.y === 0)!.status).toBe(
        "available"
      );
    });

    it("accepts a new run after the previous one settles", async () => {
      const run = vi
        .fn<() => Promise<bookingService.ExpireOverdueResult>>()
        .mockResolvedValue({
          expiredCount: 0,
          releasedSeats: 0,
          failedCount: 0,
        });
      const worker = new ExpiryWorker({ run, logger: silent });

      await worker.runOnce();
      await worker.runOnce();

      expect(run).toHaveBeenCalledTimes(2);
      expect(worker.isRunning).toBe(false);
    });

    it("clears the in-flight lock when a run throws", async () => {
      const run = vi
        .fn<() => Promise<bookingService.ExpireOverdueResult>>()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValue({
          expiredCount: 0,
          releasedSeats: 0,
          failedCount: 0,
        });
      const worker = new ExpiryWorker({ run, logger: silent });

      await expect(worker.runOnce()).rejects.toThrow("boom");
      expect(worker.isRunning).toBe(false);
      await expect(worker.runOnce()).resolves.toMatchObject({ status: "ran" });
    });
  });

  describe("failure isolation", () => {
    it("leaves a booking unpaid when releasing its seats fails, and still expires the others", async () => {
      const { user } = await createAttendee();
      const { event } = await createEventWithSeatMap({}, { rows: 2, cols: 2 });
      const eventId = event._id as Types.ObjectId;
      const userId = user._id as Types.ObjectId;

      const doomed = await createBooking({
        userId,
        eventId,
        items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
        expiresAt: past(),
      });
      const healthy = await createBooking({
        userId,
        eventId,
        items: [{ seatCoords: { x: 1, y: 0 }, price: 100 }],
        expiresAt: past(),
      });

      // Fail the release for the first booking only.
      const real = SeatMapModel.updateOne.bind(SeatMapModel);
      const spy = vi
        .spyOn(SeatMapModel, "updateOne")
        .mockImplementationOnce(() => {
          throw new Error("seat map unavailable");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(real as any);

      const result = await bookingService.expireOverdueBookings();
      spy.mockRestore();

      expect(result.failedCount).toBe(1);
      expect(result.expiredCount).toBe(1);

      // The booking whose seats could not be released is left for the next run,
      // rather than being closed with its seats still locked.
      await expect(
        BookingModel.findById(doomed._id).lean().then((b) => b!.status)
      ).resolves.toBe("unpaid");
      await expect(
        BookingModel.findById(healthy._id).lean().then((b) => b!.status)
      ).resolves.toBe("expired");
    });
  });

  describe("lifecycle", () => {
    it("stops scheduling new work and waits for the run in flight", async () => {
      const gate = deferred<bookingService.ExpireOverdueResult>();
      let calls = 0;
      const run = vi.fn(() => {
        calls++;
        return calls === 1
          ? gate.promise
          : Promise.resolve({
              expiredCount: 0,
              releasedSeats: 0,
              failedCount: 0,
            });
      });

      const worker = new ExpiryWorker({ intervalMs: 5, run, logger: silent });
      worker.start();
      expect(worker.isRunning).toBe(true);

      let stopped = false;
      const stopping = worker.stop().then(() => {
        stopped = true;
      });

      // stop() must not resolve while the sweep is still running.
      await new Promise((r) => setTimeout(r, 30));
      expect(stopped).toBe(false);

      gate.resolve({ expiredCount: 0, releasedSeats: 0, failedCount: 0 });
      await stopping;

      expect(stopped).toBe(true);
      expect(worker.isRunning).toBe(false);

      // No further sweeps are scheduled after stopping.
      const callsAtStop = run.mock.calls.length;
      await new Promise((r) => setTimeout(r, 30));
      expect(run.mock.calls.length).toBe(callsAtStop);
    });

    it("refuses to run once stopped", async () => {
      const run = vi
        .fn<() => Promise<bookingService.ExpireOverdueResult>>()
        .mockResolvedValue({
          expiredCount: 0,
          releasedSeats: 0,
          failedCount: 0,
        });
      const worker = new ExpiryWorker({ run, logger: silent });

      await worker.stop();

      await expect(worker.runOnce()).resolves.toEqual({
        status: "skipped",
        reason: "stopped",
      });
      expect(run).not.toHaveBeenCalled();
    });

    it("is safe to stop twice", async () => {
      const worker = new ExpiryWorker({ logger: silent });
      await worker.stop();
      await expect(worker.stop()).resolves.toBeUndefined();
    });
  });
});
