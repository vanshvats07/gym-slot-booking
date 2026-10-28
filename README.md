# Gym Slot Booking

A gym session booking app built with HTML, CSS, vanilla JavaScript, Node.js, Express, MongoDB, and Mongoose.

## Features

- Members can register, sign in, browse sessions, book or cancel, and join or leave a waitlist.
- Members can see their current position in each waitlist from the bookings page.
- Admins can create sessions, see their bookings and waitlists, and check members in.
- Session times are entered and displayed in India Standard Time (IST).
- A session has a capacity of 20. MongoDB transactions and a conditional database update protect that limit during simultaneous bookings.
- Passwords are hashed with bcryptjs. Login uses a signed JWT stored in a same-site, HttpOnly cookie.

## Run the app

1. Use Node.js 20 or later and a MongoDB Atlas or replica-set database. Booking and cancellation use MongoDB transactions.
2. Copy `.env.example` to `.env`.
3. Set `MONGO_URI` and a private `JWT_SECRET` of at least 32 characters. Set the admin and member seed passwords before creating those demo accounts.
4. Install packages and create demo data:

   ```bash
   npm install
   npm run seed
   ```

5. Start the app:

   ```bash
   npm start
   ```

6. Open `http://localhost:5000`.

The seed script creates `admin@gym.local` and `member@gym.local` with the passwords provided by `SEED_ADMIN_PASSWORD` and `SEED_MEMBER_PASSWORD`. It does not change existing passwords. It also creates sessions and extra test members. Extra test members receive random passwords that are not displayed.

To reset the password for an existing `admin@gym.local` account, set `ADMIN_RESET_PASSWORD` to a private password in `.env` and run:

```bash
npm run reset-admin-password
```

The reset command only updates the password hash for that existing admin account. It requires a password of 8 to 72 bytes. Remove `ADMIN_RESET_PASSWORD` from `.env` after the command succeeds.

## Run tests

Run the test suite with Node.js's built-in test runner:

```bash
npm test
```

The current tests do not require a running MongoDB instance.

## Main pages

- `/index.html` — login and registration
- `/sessions.html` — view and filter sessions, book a place, or join a waitlist
- `/bookings.html` — view and manage your bookings and waitlist entries
- `/admin.html` — create sessions, view bookings, and check in members

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/sessions?date=YYYY-MM-DD`, `POST /api/sessions` (admin)
- `GET /api/sessions/:id/bookings` (admin)
- `GET /api/bookings/my`, `POST /api/bookings/:sessionId`, `DELETE /api/bookings/:bookingId`
- `DELETE /api/bookings/waitlist/:sessionId`
- `POST /api/admin/checkin` (admin)

`GET /api/bookings/my` includes a `position` on each active waitlist entry. The position is calculated when the response is requested and can change as members join or are promoted.

The browser sends the HttpOnly login cookie automatically. API clients may instead send a bearer token in the request authorization header. API errors use JSON with `success: false` and a short message.

See [`CODE-WALKTHROUGH.md`](./CODE-WALKTHROUGH.md) for an overview of the project architecture and booking flow.

## Before public deployment

- Change demo passwords and use private production secrets.
- Keep `.env` out of Git.
- Use HTTPS so production cookies are sent securely.
- Test booking, cancellation, waitlist promotion, admin permissions, and check-in against a MongoDB deployment that supports transactions.
