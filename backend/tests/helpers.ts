import type { Express } from "express";
import request from "supertest";
import { createApp, CreateAppOptions } from "../src/app";
import { DEFAULT_PASSWORD } from "./factories";

/** Builds the real Express app against the already-connected test database. */
export const buildTestApp = (options: CreateAppOptions = {}): Express =>
  createApp(options);

/**
 * Returns a Supertest agent that has completed the session login flow, so
 * subsequent requests carry the `connect.sid` cookie.
 */
export const loginAgent = async (
  app: Express,
  email: string,
  password: string = DEFAULT_PASSWORD
) => {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password });

  if (res.status !== 200) {
    throw new Error(
      `Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`
    );
  }

  return agent;
};
