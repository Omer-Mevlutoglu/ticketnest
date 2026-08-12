import type { Express } from "express";
import { beforeAll, describe, expect, it, vi } from "vitest";
import ApprovalRequest from "../src/models/approvalRequest";
import { auditLogModel } from "../src/models/auditLogModel";
import userModel from "../src/models/userModel";
import { createAdmin, createOrganizer } from "./factories";
import { buildTestApp, loginAgent } from "./helpers";

describe("Phase 5 — atomic organizer approval", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  it("updates the request, privilege and audit trail together", async () => {
    const { user: organizer } = await createOrganizer({ isApproved: false });
    const { user: admin } = await createAdmin({ email: "approval-admin@test.dev" });
    await ApprovalRequest.create({ organizerId: organizer._id });
    const agent = await loginAgent(app, admin.email);

    const response = await agent.put(
      `/api/admin/organizers/${organizer._id}/approve`
    );
    expect(response.status).toBe(200);

    const [updatedUser, updatedRequest, audit] = await Promise.all([
      userModel.findById(organizer._id).lean(),
      ApprovalRequest.findOne({ organizerId: organizer._id }).lean(),
      auditLogModel.findOne({ targetId: organizer._id }).lean(),
    ]);
    expect(updatedUser).toMatchObject({ isApproved: true, sessionVersion: 1 });
    expect(updatedRequest?.status).toBe("approved");
    expect(audit).toMatchObject({
      action: "user.approval_changed",
      actorId: admin._id,
      targetId: organizer._id,
    });
  });

  it("is idempotent for the same decision and rejects an opposite queue decision", async () => {
    const { user: organizer } = await createOrganizer({ isApproved: false });
    const { user: admin } = await createAdmin({ email: "idempotent-admin@test.dev" });
    await ApprovalRequest.create({ organizerId: organizer._id });
    const agent = await loginAgent(app, admin.email);

    const path = `/api/admin/organizers/${organizer._id}`;
    expect((await agent.put(`${path}/approve`)).status).toBe(200);
    expect((await agent.put(`${path}/approve`)).status).toBe(200);

    expect(
      await auditLogModel.countDocuments({
        action: "user.approval_changed",
        targetId: organizer._id,
      })
    ).toBe(1);

    const conflict = await agent.put(`${path}/reject`);
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe("APPROVAL_ALREADY_DECIDED");
    await expect(
      ApprovalRequest.findOne({ organizerId: organizer._id }).then(
        (request) => request?.status
      )
    ).resolves.toBe("approved");
  });

  it("rolls back both state writes when the required audit write fails", async () => {
    const { user: organizer } = await createOrganizer({ isApproved: false });
    const { user: admin } = await createAdmin({ email: "rollback-admin@test.dev" });
    await ApprovalRequest.create({ organizerId: organizer._id });
    const agent = await loginAgent(app, admin.email);
    const createAudit = vi
      .spyOn(auditLogModel, "create")
      .mockRejectedValueOnce(new Error("audit unavailable") as never);

    const response = await agent.put(
      `/api/admin/organizers/${organizer._id}/approve`
    );
    createAudit.mockRestore();

    expect(response.status).toBe(500);
    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
    const [unchangedUser, unchangedRequest] = await Promise.all([
      userModel.findById(organizer._id).lean(),
      ApprovalRequest.findOne({ organizerId: organizer._id }).lean(),
    ]);
    expect(unchangedUser?.isApproved).toBe(false);
    expect(unchangedRequest?.status).toBe("pending");
  });

  it("audits suspension once and treats a retry as a no-op", async () => {
    const { user: organizer } = await createOrganizer();
    const { user: admin } = await createAdmin({ email: "suspend-admin@test.dev" });
    const agent = await loginAgent(app, admin.email);
    const path = `/api/admin/users/${organizer._id}/suspend`;

    expect((await agent.put(path)).status).toBe(200);
    expect((await agent.put(path)).status).toBe(200);

    expect(
      await auditLogModel.countDocuments({
        action: "user.suspended",
        actorId: admin._id,
        targetId: organizer._id,
      })
    ).toBe(1);
  });
});
