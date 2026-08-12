import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet } from "@/lib/api";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    resetCsrfToken: vi.fn(),
  };
});

const AuthState = () => {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading auth</p>;
  return <p>{user ? `Signed in: ${user.email}` : "Signed out"}</p>;
};

describe("session hydration", () => {
  beforeEach(() => vi.mocked(apiGet).mockReset());

  it("clears the client identity when a focus refresh reports session expiry", async () => {
    vi.mocked(apiGet)
      .mockResolvedValueOnce({
        user: {
          id: "attendee-1",
          email: "attendee@example.test",
          role: "attendee",
        },
      })
      .mockRejectedValueOnce(new ApiError(401, "Authentication required"));

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>
    );

    expect(
      await screen.findByText("Signed in: attendee@example.test")
    ).toBeInTheDocument();

    window.dispatchEvent(new Event("focus"));

    await waitFor(() =>
      expect(screen.getByText("Signed out")).toBeInTheDocument()
    );
    expect(localStorage.getItem("tn_user")).toBeNull();
  });
});
