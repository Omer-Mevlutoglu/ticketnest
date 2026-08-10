import type { Express } from "express";
import { Types } from "mongoose";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import BookingModel from "../src/models/bookingModel";
import { eventModel } from "../src/models/eventModel";
import SeatMapModel from "../src/models/seatMapModel";
import {
  createAttendee,
  createEvent,
  createOrganizer,
  createSeatMap,
} from "./factories";
import { buildTestApp, loginAgent } from "./helpers";

describe("seat-map generation contract and lifecycle", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  const ownedDraft = async () => {
    const { user: organizer } = await createOrganizer();
    const event = await createEvent({
      organizerId: organizer._id as Types.ObjectId,
      status: "draft",
    });
    const agent = await loginAgent(app, organizer.email);
    return { organizer, event, agent };
  };

  const generate = (
    agent: Awaited<ReturnType<typeof loginAgent>>,
    eventId: Types.ObjectId,
    body: object
  ) => agent.post(`/api/events/${eventId}/seatmap/generate`).send(body);

  it("accepts the frontend contract and applies row rules and blocked seats", async () => {
    const { event, agent } = await ownedDraft();

    const response = await generate(agent, event._id as Types.ObjectId, {
      rows: 2,
      cols: 3,
      default: { tier: "Standard", price: 50 },
      rules: [{ rows: [1], tier: "VIP", price: 120 }],
      blockedSeats: [{ x: 2, y: 3 }],
    });

    expect(response.status).toBe(200);
    expect(response.body.seats).toHaveLength(5);
    expect(
      response.body.seats
        .filter((seat: { x: number }) => seat.x === 1)
        .every(
          (seat: { tier: string; price: number }) =>
            seat.tier === "VIP" && seat.price === 120
        )
    ).toBe(true);
    expect(response.body.seats).not.toContainEqual(
      expect.objectContaining({ x: 2, y: 3 })
    );

    const linked = await eventModel.findById(event._id).lean();
    expect(String(linked!.seatMapId)).toBe(response.body._id);
  });

  it("allows an available draft layout to be regenerated", async () => {
    const { event, agent } = await ownedDraft();

    await generate(agent, event._id as Types.ObjectId, {
      rows: 1,
      cols: 2,
      default: { tier: "Standard", price: 20 },
    });
    const replacement = await generate(agent, event._id as Types.ObjectId, {
      rows: 2,
      cols: 2,
      default: { tier: "Standard", price: 30 },
    });

    expect(replacement.status).toBe(200);
    expect(replacement.body.seats).toHaveLength(4);
    expect(
      replacement.body.seats.every(
        (seat: { price: number }) => seat.price === 30
      )
    ).toBe(true);
  });

  it.each([
    {
      name: "the obsolete tiers payload",
      body: {
        rows: 2,
        cols: 2,
        tiers: [{ name: "Standard", price: 20 }],
      },
    },
    {
      name: "a blocked coordinate outside the grid",
      body: {
        rows: 2,
        cols: 2,
        default: { tier: "Standard", price: 20 },
        blockedSeats: [{ x: 2, y: 3 }],
      },
    },
    {
      name: "overlapping row rules",
      body: {
        rows: 2,
        cols: 2,
        default: { tier: "Standard", price: 20 },
        rules: [
          { rows: [1], tier: "VIP", price: 50 },
          { rows: [1], tier: "Premium", price: 40 },
        ],
      },
    },
    {
      name: "a grid with every seat blocked",
      body: {
        rows: 1,
        cols: 1,
        default: { tier: "Standard", price: 20 },
        blockedSeats: [{ x: 1, y: 1 }],
      },
    },
  ])("rejects $name", async ({ body }) => {
    const { event, agent } = await ownedDraft();
    const response = await generate(
      agent,
      event._id as Types.ObjectId,
      body
    );

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_FAILED");
  });

  it("locks both generator and raw replacement after publication", async () => {
    const { user: organizer } = await createOrganizer();
    const event = await createEvent({
      organizerId: organizer._id as Types.ObjectId,
      status: "published",
    });
    await createSeatMap({ eventId: event._id as Types.ObjectId, rows: 1, cols: 2 });
    const before = await SeatMapModel.findOne({ eventId: event._id }).lean();
    const agent = await loginAgent(app, organizer.email);

    const generated = await generate(agent, event._id as Types.ObjectId, {
      rows: 2,
      cols: 2,
      default: { tier: "Replacement", price: 1 },
    });
    const raw = await agent.put(`/api/events/${event._id}/seatmap`).send({
      layoutType: "grid",
      seats: [{ x: 1, y: 1, tier: "Replacement", price: 1 }],
    });

    expect(generated.status).toBe(409);
    expect(generated.body.code).toBe("SEAT_MAP_LOCKED");
    expect(raw.status).toBe(409);
    expect(raw.body.code).toBe("SEAT_MAP_LOCKED");

    const after = await SeatMapModel.findOne({ eventId: event._id }).lean();
    expect(after!.seats).toEqual(before!.seats);
  });

  it("locks a draft map when any booking history exists", async () => {
    const { event, agent } = await ownedDraft();
    const { user: attendee } = await createAttendee();
    await createSeatMap({ eventId: event._id as Types.ObjectId });
    await BookingModel.create({
      userId: attendee._id,
      eventId: event._id,
      items: [{ seatCoords: { x: 1, y: 1 }, price: 100 }],
      total: 100,
      status: "expired",
    });

    const response = await generate(agent, event._id as Types.ObjectId, {
      rows: 1,
      cols: 1,
      default: { tier: "Replacement", price: 1 },
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SEAT_MAP_LOCKED");
    expect(response.body.message).toMatch(/booking history/i);
  });

  it("locks a draft map when reserved or sold inventory exists", async () => {
    const { event, agent } = await ownedDraft();
    await createSeatMap({
      eventId: event._id as Types.ObjectId,
      seats: [
        { x: 1, y: 1, tier: "Standard", price: 100, status: "reserved" },
      ],
    });

    const response = await generate(agent, event._id as Types.ObjectId, {
      rows: 1,
      cols: 1,
      default: { tier: "Replacement", price: 1 },
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SEAT_MAP_LOCKED");
    expect(response.body.message).toMatch(/inventory is active/i);
  });

  it("does not allow a custom generator to replace a template map", async () => {
    const { event, agent } = await ownedDraft();
    await eventModel.updateOne(
      { _id: event._id },
      { $set: { venueType: "template", templateVenueId: new Types.ObjectId() } }
    );

    const response = await generate(agent, event._id as Types.ObjectId, {
      rows: 1,
      cols: 1,
      default: { tier: "Standard", price: 10 },
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SEAT_MAP_LOCKED");
    expect(response.body.message).toMatch(/venue template/i);
  });

  it("keeps ownership enforcement ahead of lifecycle information", async () => {
    const { event } = await ownedDraft();
    const { user: otherOrganizer } = await createOrganizer();
    const otherAgent = await loginAgent(app, otherOrganizer.email);

    const response = await generate(otherAgent, event._id as Types.ObjectId, {
      rows: 1,
      cols: 1,
      default: { tier: "Standard", price: 10 },
    });

    expect(response.status).toBe(403);
  });
});
