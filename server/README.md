# EventX Server (Node.js + Express + MongoDB)

API for authentication, events, bookings with seat selection, QR generation, notifications, and analytics.

## Setup

1. **Install MongoDB**
   - [Download and install MongoDB Community Edition](https://www.mongodb.com/try/download/community)
   - Start the MongoDB service
   - OR use MongoDB Atlas (cloud)

2. **Configure Environment**
   - Copy `.env.example` to `.env` and update values
   - Example local environment:

   ```env
   PORT=5002
   MONGO_URI=mongodb://127.0.0.1:27017/eventx
   JWT_SECRET=dev_secret_change_me
   CLIENT_URL=http://localhost:5173
   SEED_ON_START=true
   ```

3. **Install dependencies and run**:

   ```powershell
   npm install
   npm run dev
   ```

## Database Connection

The application will:
- Try to connect to the MongoDB URI specified in `.env`
- If connection fails, fall back to an in-memory MongoDB (data lost on restart)

## Seed Data

Seed sample data (admin + users + events + bookings + notifications):

```powershell
npm run seed
```

This creates:
- Admin user: `admin@eventx.dev` / `Admin123!`
- Regular users with various demographics
- Sample events with venue, pricing
- Pre-filled bookings and notifications

## API Routes

Key routes:
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/events`, `POST /api/events` (admin), `PUT/DELETE /api/events/:id` (admin)
- `POST /api/bookings/:eventId` (user), `GET /api/bookings/me`, `POST /api/bookings/checkin/:bookingId`
- `GET /api/analytics/overview` (admin), `GET /api/analytics/demographics` (admin), `GET /api/analytics/event/:id` (admin), `GET /api/analytics/export` (admin)
- `GET /api/notifications`, `POST /api/notifications`, `POST /api/notifications/:id/read`
