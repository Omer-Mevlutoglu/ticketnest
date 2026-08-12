import { expect, test, type Page } from "@playwright/test";

const DEMO_PASSWORD = "DemoPassword123!";
const DEMO_EVENT = "TicketNest Demo — Live Seat Selection";

const login = async (page: Page, email: string, password = DEMO_PASSWORD) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
};

const registerAttendee = async (page: Page, email: string, password: string) => {
  await page.goto("/register");
  await page.getByLabel("Username").fill("browser-rival");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, email, password);
};

const openDemoSeatMap = async (page: Page) => {
  await page.goto("/events");
  const card = page.getByRole("heading", { name: DEMO_EVENT, exact: true }).locator("..");
  await card.getByRole("button", { name: "Buy Ticket" }).click();
  await page.getByRole("button", { name: "Book Now" }).click();
  await expect(page.getByRole("heading", { name: "Select Your Seats" })).toBeVisible();
};

test("anonymous discovery and email-disabled registration lead to a working login", async ({
  page,
}) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Now Showing" })).toBeVisible();
  await expect(page.getByText(DEMO_EVENT).first()).toBeVisible();
  const eventCards = page.getByTestId("event-card");
  await expect(eventCards).toHaveCount(3);
  expect(
    await eventCards.evaluateAll((cards) =>
      cards.every((card) => card.scrollWidth <= card.clientWidth)
    )
  ).toBe(true);
  const demoPosters = page.locator('img[alt$=" poster"]');
  await expect(demoPosters).toHaveCount(3);
  expect(
    await demoPosters.evaluateAll((images) =>
      images.every((image) => (image as HTMLImageElement).naturalWidth > 0)
    )
  ).toBe(true);

  const demoCard = page
    .getByRole("heading", { name: DEMO_EVENT, exact: true })
    .locator("..");
  await demoCard.getByRole("button", { name: "Buy Ticket" }).click();
  await page.getByRole("button", { name: "Add to favorites" }).click();
  await expect(
    page.getByText("Sign in to add events to your favorites.")
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);

  const email = `browser-${Date.now()}@example.test`;
  const password = "BrowserPassword123!";
  await page.goto("/register");
  await expect(page.getByText(/unverified login identifier/i)).toBeVisible();
  await page.getByLabel("Username").fill("browser-attendee");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: /browser account menu/i })).toBeVisible();
});

test("attendee selects priced seats, completes mock checkout, and sees the booking", async ({
  page,
}) => {
  await login(page, "attendee@demo.ticketnest");
  await openDemoSeatMap(page);

  await page.getByRole("gridcell", { name: /row 1, seat 1, premium, 120\.00/i }).click();
  await page.getByRole("gridcell", { name: /row 1, seat 2, premium, 120\.00/i }).click();
  await expect(page.getByRole("status")).toContainText("total 240.00");
  await page.getByRole("button", { name: "Proceed to checkout" }).last().click();

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await page.getByLabel("Cardholder Name").fill("Portfolio Tester");
  await page.getByLabel("Card Number").fill("4242424242424242");
  await page.getByLabel("Expiry (MM/YY)").fill("12/40");
  await page.getByLabel("CVV").fill("123");
  await page.getByRole("button", { name: "Pay", exact: true }).click();

  await expect(page).toHaveURL(/\/my-bookings$/);
  await expect(page.getByRole("heading", { name: "My Bookings" })).toBeVisible();
  const booking = page.locator("div", { hasText: DEMO_EVENT }).filter({
    hasText: "240.00",
  }).first();
  await expect(booking).toContainText("paid");
});

test("two browser sessions contest one seat and exactly one claim succeeds", async ({
  browser,
}) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();

  try {
    const rivalPassword = "BrowserPassword123!";
    await Promise.all([
      login(first, "attendee@demo.ticketnest"),
      registerAttendee(second, `rival-${Date.now()}@example.test`, rivalPassword),
    ]);
    await Promise.all([openDemoSeatMap(first), openDemoSeatMap(second)]);

    const seatName = /row 1, seat 3, premium, 120\.00/i;
    await Promise.all([
      first.getByRole("gridcell", { name: seatName }).click(),
      second.getByRole("gridcell", { name: seatName }).click(),
    ]);
    const responsePromises = [first, second].map((page) =>
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/api/bookings"
      )
    );
    await Promise.all([
      first.getByRole("button", { name: "Proceed to checkout" }).last().click(),
      second.getByRole("button", { name: "Proceed to checkout" }).last().click(),
    ]);
    const statuses = (await Promise.all(responsePromises))
      .map((response) => response.status())
      .sort();
    expect(statuses).toEqual([201, 409]);

    await expect
      .poll(() =>
        [first.url(), second.url()].filter((url) => url.includes("/checkout/")).length
      )
      .toBe(1);

    const losingPage = first.url().includes("/checkout/") ? second : first;
    await expect(losingPage).toHaveURL(/\/seatmap$/);
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});

test("organizer creates a custom draft map and publication locks regeneration", async ({
  page,
}) => {
  await login(page, "organizer@demo.ticketnest");
  await page.goto("/organizer/events/new");

  const uniqueTitle = `Browser Draft ${Date.now()}`;
  const start = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const localInput = (value: Date) =>
    new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);

  await page.getByLabel("Title").fill(uniqueTitle);
  await page.getByLabel("Categories (comma separated)").fill("browser, smoke");
  await page.getByLabel("Description").fill("Created by the isolated browser release proof.");
  await page.getByLabel("Start").fill(localInput(start));
  await page.getByLabel("End").fill(localInput(end));
  await page.getByLabel("Custom", { exact: true }).check();
  await page.getByLabel("Venue Name").fill("Browser Test Hall");
  await page.getByLabel("Venue Address").fill("1 Isolated Test Street");
  await page.getByLabel("Rows").fill("2");
  await page.getByLabel("Cols").fill("3");
  await page.getByLabel("Default Tier").fill("standard");
  await page.getByLabel("Default Price").fill("75");
  await page.getByRole("button", { name: "Create Event" }).click();

  await expect(page).toHaveURL(/\/organizer\/events\/[^/]+\/manage$/);
  await expect(page.getByText("draft", { exact: true })).toBeVisible();
  await expect(page.getByText("Total").locator("..")).toContainText("6");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("published", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/seat-map structure is locked after publication/i)
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate" })).toHaveCount(0);

  const eventId = page.url().match(/events\/([^/]+)\/manage/)?.[1];
  expect(eventId).toBeTruthy();
  const regenerationStatus = await page.evaluate(async ({ id }) => {
    const response = await fetch(
      `http://127.0.0.1:5100/api/events/${id}/seatmap/generate`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: 2,
          cols: 3,
          default: { tier: "standard", price: 75 },
        }),
      }
    );
    return response.status;
  }, { id: eventId });
  expect(regenerationStatus).toBe(409);
});
