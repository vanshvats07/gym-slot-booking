# Code walkthrough

## Application structure

- `server.js` configures Express, serves the static pages, mounts the API routes, and connects to MongoDB.
- `routes/` contains the authentication, session, booking, and admin endpoints.
- `middleware/auth.js` verifies the login token and enforces role-based access.
- `models/` defines the Mongoose schemas and database indexes.
- `public/` contains the browser pages, shared API client, and page-specific scripts.
- `scripts/` contains commands for creating demo data and resetting the seeded admin password.

## Booking flow

1. A member requests a session through `POST /api/bookings/:sessionId`.
2. The route runs the booking changes in a MongoDB transaction. It conditionally increments `bookedCount` only when a seat remains.
3. If the session is full, the member is added to the waitlist instead.
4. When a confirmed booking is cancelled, the transaction releases its seat and promotes the earliest eligible waitlisted member.
5. The session's conditional update and the unique member/session indexes protect capacity and prevent duplicate active records during concurrent requests.

## Authentication flow

The login route returns a signed JWT in an HttpOnly, same-site cookie. Protected routes verify the token, load the current user, and optionally require an administrator role. The browser keeps only non-sensitive display information in local storage; the cookie is sent automatically with same-origin API requests.

## Session time validation

Sessions are listed by India calendar day and can start only on the hour in the `Asia/Kolkata` timezone. The date validation helpers live in `utils/session-time.js` and are covered by the built-in Node.js test runner.
