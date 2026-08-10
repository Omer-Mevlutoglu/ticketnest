/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from "react-router-dom";

import toast from "react-hot-toast";
import { useCheckout } from "../hooks/useCheckout";
import { useMockPayment } from "../hooks/useMockPayment";
import { useAppConfig } from "../hooks/useAppConfig";
import BlurCircle from "../components/BlurCircle";
import Loading from "../components/Loading";

const PLACEHOLDER = "/placeholder.jpg";

const CheckoutPage: React.FC = () => {
  const { id } = useParams(); // bookingId
  const navigate = useNavigate();

  const {
    booking,
    event,
    seats,
    when,
    loading,
    error,
    posting,
    canPay,
    isExpired,
    countdown,
    mockPay,
    // mockFail,
    refetch,
  } = useCheckout(id);

  const {
    cardName,
    setCardName,
    setCardNumber,
    formattedNumber,
    expiry,
    setExpiry,
    cvv,
    setCvv,
    submitting,
    formError,
    validate,
    simulatePaymentDelay,
  } = useMockPayment();

  const { config, loading: configLoading } = useAppConfig();
  const mockPaymentsEnabled = config?.mockPaymentsEnabled ?? true;

  if (loading || configLoading) return <Loading />;

  if (error || !booking) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-center">
        <p className="text-red-400">{error || "Booking not found"}</p>
      </div>
    );
  }

  const disabled = !canPay || submitting || !!posting || !mockPaymentsEnabled;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      // 1) simulate card processing
      await simulatePaymentDelay();

      // 2) call backend mock to mark paid + flip seats to SOLD
      await mockPay();

      toast.success("Payment successful (mock)");
      await refetch();
      navigate("/my-bookings", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
    }
  }

  // async function onMockFail() {
  //   if (!canPay) return;
  //   try {
  //     await simulatePaymentDelay();
  //     await mockFail();
  //     toast("Payment failed (mock)");
  //     await refetch();
  //     navigate("/my-bookings", { replace: true });
  //   } catch (e: any) {
  //     toast.error(e?.message || "Operation failed");
  //   }
  // }

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">
      <BlurCircle top="80px" left="120px" />
      <BlurCircle bottom="0" right="120px" />

      <h1 className="text-lg font-semibold mb-6">Checkout</h1>

      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl">
        {/* Summary */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <img
              alt={event?.title || "Event"}
              src={event?.poster || PLACEHOLDER}
              className="md:max-w-45 aspect-video h-auto object-cover rounded"
            />
            <div className="flex-1">
              <p className="text-lg font-semibold">{event?.title ?? "Event"}</p>
              <p className="text-sm text-gray-400">{when}</p>
              <p className="text-sm text-gray-400">
                {event?.venueName}
                {event?.venueAddress ? ` • ${event.venueAddress}` : ""}
              </p>
              <div className="mt-3 text-sm">
                <p>
                  <span className="text-gray-400">Seats: </span>
                  {seats.join(", ")}
                </p>
                <p>
                  <span className="text-gray-400">Tickets: </span>
                  {booking.items.length}
                </p>
                <p>
                  <span className="text-gray-400">Total: </span>
                  {booking.total.toFixed(2)}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border
                    ${
                      booking.status === "paid"
                        ? "border-emerald-400 text-emerald-300"
                        : booking.status === "refunded"
                        ? "border-sky-400 text-sky-300"
                        : booking.status === "unpaid"
                        ? "border-yellow-400 text-yellow-300"
                        : booking.status === "expired"
                        ? "border-gray-400 text-red-600"
                        : "border-rose-400 text-rose-300"
                    }`}
                >
                  {isExpired && booking.status === "unpaid"
                    ? "expired"
                    : booking.status === "refunded"
                      ? "closed (demo payment)"
                      : booking.status}
                </span>
                {canPay && countdown && (
                  <span className="text-xs text-gray-400">
                    • Expires in {countdown}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card form (mock) */}
        <form
          onSubmit={onSubmit}
          className="rounded-lg border border-white/10 bg-white/5 p-4"
        >
          <p className="font-medium mb-1">Payment Details</p>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-sky-400/60 text-sky-300">
              Simulated
            </span>
            <span className="text-xs text-gray-400">
              Demo checkout — no payment provider is involved.
            </span>
          </div>

          {!mockPaymentsEnabled && (
            <div className="mb-3 text-sm text-yellow-300 border border-yellow-400/40 rounded px-3 py-2">
              Simulated payments are switched off on this server, so this
              booking cannot be completed here. Your seats stay held until the
              countdown ends.
            </div>
          )}

          {formError && (
            <div className="mb-3 text-sm text-rose-300 border border-rose-400/40 rounded px-3 py-2">
              {formError}
            </div>
          )}

          {!canPay && (
            <div className="mb-3 text-sm text-yellow-300 border border-yellow-400/40 rounded px-3 py-2">
              This booking is no longer payable.
            </div>
          )}

          <label className="text-sm text-gray-300">Cardholder Name</label>
          <input
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            className="w-full mt-1 mb-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
            placeholder="Jane Doe"
            disabled={disabled}
          />

          <label className="text-sm text-gray-300">Card Number</label>
          <input
            value={formattedNumber}
            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-full mt-1 mb-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none tracking-wider"
            placeholder="4242 4242 4242 4242"
            maxLength={23}
            disabled={disabled}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-300">Expiry (MM/YY)</label>
              <input
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="09/27"
                className="w-full mt-1 mb-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                disabled={disabled}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300">CVV</label>
              <input
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                maxLength={4}
                placeholder="123"
                className="w-full mt-1 mb-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={disabled}
              className="px-5 py-2 rounded-md bg-primary hover:bg-primary-dull transition disabled:opacity-50"
            >
              {submitting || posting === "pay" ? "Processing…" : "Pay"}
            </button>

            {/* <button
              type="button"
              onClick={onMockFail}
              disabled={disabled}
              className="px-5 py-2 rounded-md bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
            >
              {submitting || posting === "fail" ? "Processing…" : "Fail)"}
            </button> */}

            <button
              type="button"
              onClick={() => navigate("/my-bookings")}
              className="ml-auto px-5 py-2 rounded-md border border-white/10 hover:bg-white/5 transition"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Use any Luhn-valid test card (e.g., 4242 4242 4242 4242). No real
            payment is made, no money moves, and card details never leave your
            browser — they are validated client-side and never sent to the
            server. The amount charged is always the booking total stored
            server-side.
          </p>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
