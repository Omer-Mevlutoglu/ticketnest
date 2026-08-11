# TicketNest

A ticketing platform where the hard part is the part you can see: **picking a seat**.

Browse events without an account, open an interactive seat map, and hold seats for ten minutes while you check out. Two people clicking the same seat at the same moment is the interesting case, and it is handled with MongoDB transactions and conditional updates rather than hope — [see below](#how-the-seat-hold-works).

**[Live demo](https://ticketnest-iota.vercel.app)** · no sign-up needed to browse

---

## Try it in 60 seconds

1. Open the [live demo](https://ticketnest-iota.vercel.app) and click into any event — no account required.
2. Open the seat map and select a seat. It is held for you for ten minutes, and the countdown starts.
3. Sign in with a demo account below and complete the simulated checkout.

To see the concurrency handling, open the same seat map in two browsers and try to take the same seat in both. One wins; the other is told the seat has gone.

### Demo accounts

All three use the password **`DemoPassword123!`**

| Role | Email | What you can do |
| --- | --- | --- |
| Attendee | `attendee@demo.ticketnest` | Browse, hold seats, check out, view bookings |
| Organizer | `organizer@demo.ticketnest` | Inspect the dashboard, events, pricing, and seat-map preview (management writes are read-only) |
| Admin | `admin@demo.ticketnest` | Inspect metrics, masked users, bookings, requests, and venues (management writes are read-only) |

These are created by `npm run seed:demo` and are safe to share. The hosted site
runs with `DEMO_MODE=true`: attendee flows remain interactive, while every
organizer and the public demo admin receive `DEMO_RESTRICTED` for sensitive
writes. Private admins seeded from `ADMIN_EMAILS` remain trusted. A local clone
defaults to `DEMO_MODE=false`, exposing the complete feature set.

> **Public demo privacy:** the database is disposable and may be reset. Do not
> enter real personal information. Visitor identifiers shown to the demo admin
> are masked; private trusted admins retain the operational view.

> **Payments are simulated.** No payment provider is involved and no money moves. Card details are validated in the browser and never sent to the server. Replacing this with Stripe is the next planned step.

<!-- TODO: record a 30-second capture of select seats -> countdown -> checkout
     and embed it here. It is the single most persuasive thing on this page. -->

---

## What it does

**Attendees** browse published events, pick seats on a live map, hold them for ten minutes, check out, and see their bookings.

**Organizers** register, wait for admin approval, then create events, generate seat maps from a grid spec or a venue template, and publish.

**Admins** approve organizers, manage reusable venue templates, and suspend accounts.

---

## Tech stack

| | |
| --- | --- |
| **Backend** | Node.js, TypeScript, Express 5, Mongoose 8, MongoDB |
| **Auth** | Passport (local strategy), server-side sessions in MongoDB, bcrypt |
| **Frontend** | React 19, Vite, React Router 7, Tailwind CSS 4 |
| **Testing** | Vitest, Supertest, `mongodb-memory-server` (replica set) |
| **Services** | Cloudinary (images), SendGrid (email) |
| **Hosting** | Vercel (frontend), MongoDB Atlas |

---

## How the seat hold works

This is the part worth reading the code for.

A seat map is one document per event with an embedded `seats` array. Every seat is `available`, `reserved` (with a holder and an expiry), or `sold`.

**Claiming a seat** is a single conditional update — no read-then-write, so there is no window between checking and taking:

```js
findOneAndUpdate(
  {
    eventId,
    seats: { $elemMatch: {
      x, y,
      $or: [
        { status: "available" },
        { status: "reserved", reservedUntil: { $lt: now } },  // lapsed hold
      ],
    }},
  },
  { $set: { "seats.$.status": "reserved", "seats.$.reservedBy": userId, ... } }
)
```

Three things make this correct:

- **`$elemMatch`, not dotted paths.** Writing `"seats.x": x, "seats.status": "available"` lets MongoDB satisfy each condition from a *different* array element — so the document matches while no single seat qualifies, and the positional `$` updates the wrong seat. Every seat query here constrains one element.
- **A transaction across the whole selection.** Booking three seats where the third is gone must leave the first two free, not held by a booking that failed. That is why MongoDB must run as a replica set.
- **`matchedCount`, not `modifiedCount`.** Mongoose's `timestamps: true` bumps `updatedAt` on every update, so `modifiedCount` is `1` even when the intended change matched nothing. Guards that check it silently never fire.

Expired holds are released by a background sweep that refuses overlapping runs, and every release is conditional — running it twice changes nothing the second time.

All of this is covered by tests: two concurrent claims on one seat, partial-failure rollback, reclaiming a lapsed hold, and cancellation releasing exactly the right seats. See `backend/tests/booking.concurrency.test.ts` and `seatRelease.test.ts`.

---

## API response shapes

Two conventions worth knowing before writing a client.

**List endpoints return a page, not an array.** `GET /api/events`,
`/api/events/mine`, `/api/admin/users`, `/api/admin/events`, and
`/api/admin/bookings` all answer:

```json
{ "data": [...], "total": 42, "page": 1, "limit": 20, "pageCount": 3 }
```

`?page=` and `?limit=` control it; `limit` is capped at 100 and defaults to 20,
so no single request can pull a whole collection. Sorting always includes `_id`
as a tiebreaker, so paging never repeats or skips a record.

**Related data is joined server-side.** `GET /api/bookings` returns each booking
with its `event` attached, and `GET /api/favorites` returns
`{ ids, events }`. Neither requires a follow-up request per row.

Errors are `{ message, error, code? }` — `message` and `error` carry the same
text, the second kept for older clients. `code` is a stable identifier
(`HOLD_EXPIRED`, `VALIDATION_FAILED`, `RATE_LIMITED`) for branching without
matching on prose.

---

## Running it locally

### Requirements

- Node.js >= 22, npm >= 10
- **MongoDB running as a replica set.** A standalone `mongod` will not work — the booking code uses transactions, and MongoDB rejects them outside a replica set. MongoDB Atlas is a replica set already. For a local single node:

  ```bash
  mongod --replSet rs0 --dbpath /your/data/path
  ```

  then once, in `mongosh`: `rs.initiate()`

### Setup

```bash
git clone <this repo> && cd ticketnest

cd backend && npm ci && cp .env.example .env      # then fill it in
cd ../frontend && npm ci && cp .env.example .env
```

Every backend variable is documented in `backend/.env.example` and validated at startup — a missing or malformed value crashes the process and names the variable rather than failing quietly later.

`DEMO_MODE` defaults to `false`. Set it to `true` only on a public portfolio
deployment where organizer and demo-admin management writes must be protected.

**You do not need an email provider.** `ENABLE_EMAIL` defaults to `false`, and
with it off the app runs end to end with no external service: new accounts are
verified on creation, and password reset is hidden rather than broken. Set it to
`true` with a `SENDGRID_API_KEY` and a verified `FROM_EMAIL` to exercise the
real verification and reset flow — the logic is the same either way, the flag
only controls whether a message is actually sent.

Apply schema migrations, then optionally seed something to look at:

```bash
cd backend && npm run migrate && npm run seed:demo
```

Migrations are explicit rather than run at boot — startup only warns about
pending ones, and `/readyz` reports unready until they are applied.

### Run

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

Backend on `http://localhost:5000`, frontend on `http://localhost:5173`.

---

## Verifying

```bash
cd backend && npm run build && npm run typecheck && npm test
```

```bash
cd frontend && npm run lint && npm run build
```

269 backend tests, plus a GitHub Actions workflow that runs all of it on push. They spin up an in-memory MongoDB **replica set**, so transactions work and no external database is touched. They cannot reach Atlas, SendGrid, or Cloudinary: the test setup injects placeholder secrets and refuses any database URI that is not local.

The frontend has no test harness yet — `npm test` there is a labelled placeholder.

---

## Layout

```
backend/
  src/
    configs/      validated env, database, feature flags
    controllers/  HTTP in, HTTP out
    services/     business logic - bookingService.ts is the core
    models/       Mongoose schemas
    middleware/   auth, roles, rate limits, CSRF, error handler
    jobs/         hold-expiry worker
    scripts/      demo seeding
  tests/          integration tests against an in-memory replica set

frontend/
  src/
    pages/        route components, grouped by role
    components/   shared UI
    hooks/        data fetching
    lib/          CSRF transport
  context/        auth provider
```

Requests flow **routes -> middleware -> controllers -> services -> models**. Business rules and ownership checks live in the services, so they hold regardless of which route reaches them.

---

## Operations

`GET /healthz` — liveness. Answers without touching MongoDB, so a database
blip does not restart otherwise-healthy processes.

`GET /readyz` — readiness. Fails when the database is unreachable, when
migrations are pending, or while the process is shutting down. This is the one
a load balancer should watch.

Every response carries an `x-request-id`, echoed from the request when one is
supplied. It appears in the structured log line for the request and in anything
the error handler records, so one string traces a failure end to end.

On SIGTERM the process reports unready first, then stops the expiry worker,
drains in-flight requests, and closes MongoDB — with a deadline, so a stuck
shutdown still terminates.

---

## Security

- Session cookies, `httpOnly`, `SameSite=None` + `Secure` in production
- CSRF: origin validation on every write, plus double-submit tokens
- Rate limits sized per endpoint — login, registration, and password reset have different risk profiles
- `helmet` security headers; CORS restricted to a configured allowlist
- Password reset signs you out everywhere, and each link works once
- Suspending an account ends its live sessions immediately, not at next login
- Unexpected errors return a generic 500 in production — no driver messages or stack traces

---

## Known limitations

Deliberate scope choices, not oversights:

- **Payments are simulated.** No provider, no money, no refunds.
- **Email is off by default.** Verification and password-reset logic exists and is tested, but nothing is dispatched unless `ENABLE_EMAIL=true` and a provider key is supplied. This keeps a fresh clone runnable with zero configuration.
- **The expiry worker is single-instance.** It runs on an interval in the API process. Running two instances duplicates the work — harmless, since every write is conditional, but wasteful. A real deployment wants an external scheduler or a job queue.
- **Seat maps are one document per event.** Fine at this scale; the 16 MB BSON limit caps it around 40,000 seats, and heavy contention on one popular event serializes on that document. A separate `seats` collection with a unique index on `(eventId, x, y)` is the fix.
- **Money is stored as a JavaScript number.** It should be integer minor units with an explicit currency.
- **No pagination** on list endpoints, and the `Event` collection has no indexes yet.
- **The seat grid is mouse-only** — it needs keyboard navigation and ARIA labels.
- **No search.**

---

## License

ISC
