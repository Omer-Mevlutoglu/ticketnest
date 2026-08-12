import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPost, resetCsrfToken } from "./api";

const response = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe("API CSRF recovery", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetCsrfToken();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("refreshes a rejected token and retries the write once", async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { csrfToken: "stale-token" }))
      .mockResolvedValueOnce(
        response(403, { code: "CSRF_INVALID", message: "Expired" })
      )
      .mockResolvedValueOnce(response(200, { csrfToken: "fresh-token" }))
      .mockResolvedValueOnce(response(200, { saved: true }));

    await expect(apiPost("/api/example", { value: 1 })).resolves.toEqual({
      saved: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1][1].headers["x-csrf-token"]).toBe(
      "stale-token"
    );
    expect(fetchMock.mock.calls[3][1].headers["x-csrf-token"]).toBe(
      "fresh-token"
    );
  });

  it("never loops when the refreshed token is also rejected", async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { csrfToken: "token-one" }))
      .mockResolvedValueOnce(response(403, { code: "CSRF_INVALID" }))
      .mockResolvedValueOnce(response(200, { csrfToken: "token-two" }))
      .mockResolvedValueOnce(
        response(403, { code: "CSRF_INVALID", message: "Still rejected" })
      );

    await expect(apiPost("/api/example", {})).rejects.toMatchObject({
      status: 403,
      code: "CSRF_INVALID",
      message: "Still rejected",
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
