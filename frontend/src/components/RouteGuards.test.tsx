import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth, RequireRole } from "./RouteGuards";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

const LoginTarget = () => {
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname;
  return <p>Login target from {from}</p>;
};

describe("route protection", () => {
  beforeEach(() => vi.mocked(useAuth).mockReset());

  it("redirects a signed-out visitor and preserves the intended page", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    render(
      <MemoryRouter initialEntries={["/my-bookings"]}>
        <Routes>
          <Route
            path="/my-bookings"
            element={
              <RequireAuth>
                <p>Private bookings</p>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginTarget />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText("Login target from /my-bookings")
    ).toBeInTheDocument();
  });

  it("keeps an unapproved organizer on the pending page", async () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      user: {
        id: "organizer-1",
        email: "pending@example.test",
        role: "organizer",
        isApproved: false,
      },
    } as never);
    render(
      <MemoryRouter initialEntries={["/organizer/create"]}>
        <Routes>
          <Route
            path="/organizer/create"
            element={
              <RequireRole roles={["organizer"]} requireApproval>
                <p>Create event</p>
              </RequireRole>
            }
          />
          <Route path="/organizer/pending" element={<p>Approval pending</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Approval pending")).toBeInTheDocument();
  });
});
