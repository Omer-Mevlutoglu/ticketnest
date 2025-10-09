import { useMemo, useState } from "react";

// Simple Luhn validator so we can accept "4242 4242 4242 4242" etc.
function luhnCheck(num: string): boolean {
  const digits = num.replace(/\s+/g, "");
  if (!/^\d{12,19}$/.test(digits)) return false;

  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function validExpiry(mmYY: string): boolean {
  // Accept "MM/YY"
  const m = mmYY.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mm = parseInt(m[1], 10);
  const yy = parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return false;

  const fullYear = 2000 + yy;
  // end of that month
  const expEnd = new Date(fullYear, mm, 0, 23, 59, 59);
  return expEnd >= new Date();
}

export function useMockPayment() {
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState(""); // "MM/YY"
  const [cvv, setCvv] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const formattedNumber = useMemo(
    () =>
      cardNumber
        .replace(/\D/g, "")
        .replace(/(.{4})/g, "$1 ")
        .trim(),
    [cardNumber]
  );

  function validate(): boolean {
    if (!cardName.trim()) {
      setFormError("Cardholder name is required");
      return false;
    }
    if (!luhnCheck(cardNumber)) {
      setFormError("Card number is invalid");
      return false;
    }
    if (!validExpiry(expiry)) {
      setFormError("Expiry must be valid & in the future (MM/YY)");
      return false;
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setFormError("CVV must be 3–4 digits");
      return false;
    }
    setFormError(null);
    return true;
  }

  // Simulate a PSP delay
  async function simulatePaymentDelay(ms = 1500) {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, ms));
    setSubmitting(false);
  }

  return {
    // fields
    cardName,
    setCardName,
    cardNumber,
    setCardNumber,
    formattedNumber,
    expiry,
    setExpiry,
    cvv,
    setCvv,

    // ui state
    submitting,
    formError,

    // actions
    validate,
    simulatePaymentDelay,
  };
}
