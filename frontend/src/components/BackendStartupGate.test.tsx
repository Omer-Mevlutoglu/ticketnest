import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BackendStartupGate from "./BackendStartupGate";

const readyResponse = { ok: true } as Response;

describe("BackendStartupGate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows Render guidance only when the first readiness probe exceeds five seconds", async () => {
    let resolveProbe!: (response: Response) => void;
    const pendingProbe = new Promise<Response>((resolve) => {
      resolveProbe = resolve;
    });
    const fetchMock = vi.fn(() => pendingProbe);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BackendStartupGate>
        <p>Application ready</p>
      </BackendStartupGate>
    );

    expect(
      screen.queryByText(/warming up the ticketnest server/i)
    ).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_999);
    });
    expect(
      screen.queryByText(/warming up the ticketnest server/i)
    ).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(
      screen.getByText(/warming up the ticketnest server/i)
    ).toBeInTheDocument();

    await act(async () => {
      resolveProbe(readyResponse);
      await pendingProbe;
    });

    expect(screen.getByText("Application ready")).toBeInTheDocument();
    expect(sessionStorage.getItem("ticketnest.backend-ready")).toBe("true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never probes or shows the notice again after readiness succeeds in the session", async () => {
    sessionStorage.setItem("ticketnest.backend-ready", "true");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BackendStartupGate>
        <p>Application ready</p>
      </BackendStartupGate>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(screen.getByText("Application ready")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/warming up the ticketnest server/i)
    ).not.toBeInTheDocument();
  });
});
