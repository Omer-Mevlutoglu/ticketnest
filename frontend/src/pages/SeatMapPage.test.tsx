import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import toast from "react-hot-toast";
import { apiGet, apiPost } from "@/lib/api";
import { calculateSeatTotal } from "@/lib/seatSelection";
import SeatMapPage from "./SeatMapPage";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiGet: vi.fn(), apiPost: vi.fn() };
});
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

describe("seat selection", () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockResolvedValue({
      _id: "map-1",
      eventId: "event-1",
      layoutType: "grid",
      seats: [
        { x: 1, y: 1, tier: "premium", price: 120, status: "available" },
        { x: 1, y: 2, tier: "standard", price: 60, status: "available" },
      ],
    });
    vi.mocked(apiPost).mockReset();
  });

  it("calculates mixed-tier totals exactly", () => {
    expect(calculateSeatTotal([{ price: 120 }, { price: 60.5 }])).toBe(180.5);
  });

  it("announces the total and presents a server booking conflict", async () => {
    vi.mocked(apiPost).mockRejectedValue(
      new Error("Those seats were just claimed by another attendee")
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/events/event-1/seatmap"]}>
        <Routes>
          <Route path="/events/:id/seatmap" element={<SeatMapPage />} />
        </Routes>
      </MemoryRouter>
    );

    const seat = await screen.findByRole("gridcell", {
      name: /row 1, seat 1, premium, 120\.00/i,
    });
    await user.click(seat);
    expect(screen.getByRole("status")).toHaveTextContent("total 120.00");

    const checkoutButtons = screen.getAllByRole("button", {
      name: /proceed to checkout/i,
    });
    await user.click(checkoutButtons.at(-1)!);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Those seats were just claimed by another attendee"
      )
    );
  });
});
