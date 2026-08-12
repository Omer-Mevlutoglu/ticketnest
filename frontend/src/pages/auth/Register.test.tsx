import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useAppConfig } from "@/hooks/useAppConfig";
import Register from "./Register";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useAppConfig", () => ({ useAppConfig: vi.fn() }));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const registerMock = vi.fn();

const renderPage = (emailEnabled: boolean) => {
  vi.mocked(useAuth).mockReturnValue({ register: registerMock } as never);
  vi.mocked(useAppConfig).mockReturnValue({
    config: { emailEnabled, mockPaymentsEnabled: true, demoMode: false },
    loading: false,
  });

  render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<p>Login destination</p>} />
        <Route path="/check-email" element={<p>Check email destination</p>} />
      </Routes>
    </MemoryRouter>
  );
};

const completeForm = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: /username/i }), "new-user");
  await user.type(screen.getByRole("textbox", { name: /^email/i }), "new@example.test");
  await user.type(screen.getByLabelText(/^password/i), "Password123!");
  await user.click(screen.getByRole("button", { name: /create account/i }));
};

describe("registration messaging", () => {
  beforeEach(() => registerMock.mockReset());

  it("explains email-disabled mode and sends the user to sign in", async () => {
    registerMock.mockResolvedValue({
      verificationEmailSent: false,
      emailVerificationRequired: false,
    });
    renderPage(false);

    expect(screen.getByText(/unverified login identifier/i)).toBeInTheDocument();
    await completeForm();

    expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(
      "Account created. You can sign in now."
    );
  });

  it("sends email-enabled registration to the verification instructions", async () => {
    registerMock.mockResolvedValue({
      verificationEmailSent: true,
      emailVerificationRequired: true,
    });
    renderPage(true);
    await completeForm();

    expect(
      await screen.findByText("Check email destination")
    ).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
