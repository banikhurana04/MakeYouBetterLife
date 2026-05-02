# Make You Better

A beginner-friendly full-stack app for **daily habits** (sleep, water, meals, exercise), a **dashboard** with streaks, charts (Chart.js), and insights, **skincare and lifestyle** views backed by rule-based recommendations, **fashion** suggestions tied to your profile and optional **weather**, and **JWT authentication** with **forgot / reset password**.

The UI title is **Make You Better**; the npm package name in `package.json` is **`life3600`**.

- Frontend: **HTML + Tailwind CSS (CDN) + Vanilla JS** (shared `api.js` / `auth.js`, token in `localStorage`)
- Backend: **Node.js + Express (JavaScript only)**
- Database: **MongoDB + Mongoose**
- Authentication: **JWT + bcrypt**, with **forgot / reset password** (dev-friendly reset link in API response and server log)

## Prerequisites

- **Node.js** (LTS recommended)
- **MongoDB** reachable at your `MONGO_URI` (local install or Atlas)

## Folder structure

```text
backend/
  server.js
  config/
  models/
  routes/
  controllers/
  middleware/
  validation/
  utils/
  services/
frontend/
  login.html
  register.html
  forgot-password.html
  reset-password.html
  dashboard.html
  skincare.html
  lifestyle.html
  css/
    styles.css
  js/
    api.js
    auth.js
    dashboard.js
    skincare.js
    lifestyle.js
```

## Setup

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file (copy from the example)

**Windows (cmd/PowerShell):**

```bash
copy .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

3. Configure environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGO_URI` | Yes | MongoDB connection string (example uses database `life3600`) |
| `JWT_SECRET` | Yes | Secret used to sign JWTs (use a long random string) |
| `JWT_EXPIRES_IN` | No | Token lifetime (default in code / example: `7d`) |
| `PORT` | No | Server port (default `5000`) |
| `APP_BASE_URL` | No | Base URL for password-reset links (default `http://localhost:<PORT>`) |
| `OPENWEATHER_API_KEY` | No | [OpenWeatherMap](https://openweathermap.org/api) key for `/api/weather` and fashion recommendations that pass `city` |

4. Run the app

- **Development** (auto-restart with nodemon):

```bash
npm run dev
```

- **Production**:

```bash
npm start
```

Then open the app on the same origin as the API (default **port 5000**):

- Login: `http://localhost:5000/login.html`
- Register: `http://localhost:5000/register.html`
- Forgot password: `http://localhost:5000/forgot-password` (clean URL; also `forgot-password.html`)
- Reset password (from link with `?token=...`): `http://localhost:5000/reset-password`
- After login: `http://localhost:5000/dashboard.html`
- Skincare: `http://localhost:5000/skincare.html`
- Lifestyle: `http://localhost:5000/lifestyle.html`

## API usage notes

- **JWT**: Protected routes expect `Authorization: Bearer <token>` (the bundled frontend stores the token under `life3600_token` in `localStorage` and attaches it automatically).
- **Forgot password (development)**: `POST /forgot-password` does not send email. It returns a JSON field `resetLink` when the email exists, and logs the same link to the server console—use that to open the reset page in dev.

## API endpoints

### Authentication

- `POST /register` — body: `name`, `email`, `password` → creates user, returns `token` and `user`
- `POST /login` — body: `email`, `password` → returns `token` and `user`
- `POST /forgot-password` — body: `email` → generic message; `resetLink` when user found (see note above)
- `POST /reset-password` — body: `token`, `password`

### Profile (JWT required)

- `GET /get-profile`
- `PUT /update-profile` — JSON body may include string fields (max 60 chars each): `lifestyle_goal`, `skin_type`, `fashion_style` (used by recommendations when not overridden in the request)

### Habits (JWT required)

- `POST /add-habit` — body: `date` (required, `YYYY-MM-DD`), optional `sleep_hours`, `water_intake`, `meals`, `exercise_minutes` (numbers ≥ 0; omit or null for unknown)
- `GET /get-habits` — query: `range=daily|weekly|monthly` (default `weekly`). For `daily`, optional `date=YYYY-MM-DD` selects that calendar day (defaults to today).
- `PUT /update-habit` — same habit fields as add; identify the row with `habitId` **or** `date` (user+date upsert path)

### Dashboard (JWT required)

- `GET /dashboard-data` — returns `habits` (summary, averages, completion rate, trends, weekly/monthly series, habit score), merged `insights`, and `healthDataset` (scores, trends, ideals) used elsewhere in the app

### Recommendations (JWT required)

- `POST /recommendations/skincare` — optional JSON: `skin_type`, `concerns` (array). If omitted, uses the profile’s `skin_type` and recent habit averages. Response includes `recommendation`, `reason`, `meta`, `lifestyle` snippet, and `healthDataset`.
- `POST /recommendations/fashion` — optional JSON: `occasion`, `time`, `style`, `weather`, or `city` (when `city` is set, weather is fetched and mapped to a simple condition for styling)

### Weather (no JWT; requires API key)

- `GET /api/weather?city=<name>` — current weather summary for a city  
- `GET /api/weather?lat=<number>&lon=<number>` — same by coordinates (both required and in valid ranges)

Successful responses look like `{ temperature, condition, location }` where `condition` is one of **`Hot`**, **`Cold`**, or **`Rainy`** (metric units). Errors include missing/invalid API key, bad input, timeouts, or upstream failures (appropriate HTTP status and `{ message }`).

## Notes about habit dates

Habit entries are stored **per user per day** using a unique index on `userId + date`.  
When you add a habit for a date that already exists, it is **updated** rather than duplicated.
