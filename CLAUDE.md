# BachBoys - Claude Code Project Guide

This file provides context for Claude Code when working on this project.

## Project Overview

BachBoys is a mobile-first Progressive Web App for Nick's Vegas bachelor party, inspired by tech conference apps like Dreamforce.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Auth**: JWT with refresh tokens (individual logins)
- **Deployment**: Docker Compose (self-hosted)

## Project Structure

```
/home/ben/bachboys/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.ts              # Express entry
│   │   ├── config/               # Environment config (including VAPID)
│   │   ├── db/                   # PostgreSQL pool + migrations
│   │   ├── middleware/           # auth, adminAuth, errorHandler
│   │   ├── routes/               # API endpoints
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── events.ts
│   │   │   ├── payments.ts
│   │   │   ├── notifications.ts
│   │   │   └── admin/
│   │   ├── services/             # Business logic (PushService)
│   │   └── types/
│   └── package.json
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── sw.ts                 # Custom service worker
│   │   ├── api/                  # API client
│   │   ├── components/
│   │   │   ├── shared/           # BottomNav, Header, Card, Badge, NotificationSettings, InstallPrompt, OfflineIndicator
│   │   │   ├── schedule/         # Timeline, EventCard
│   │   │   ├── payments/         # BalanceCard, PaymentItem
│   │   │   ├── attendees/        # AttendeeList, AttendeeCard
│   │   │   └── admin/            # AdminLayout, EventForm, CostSplitEditor
│   │   ├── hooks/                # usePushNotifications, usePWAInstall
│   │   ├── pages/
│   │   │   ├── admin/            # Dashboard, Events, Users, Payments, Notifications
│   │   │   └── ...               # Schedule, EventDetail, Payments, Attendees, Profile
│   │   ├── store/                # Zustand state (authStore)
│   │   └── types/
│   └── package.json
└── nginx/
    └── nginx.conf
```

## Development Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up -d --build

# Frontend dev (standalone)
cd frontend && npm run dev

# Backend dev (standalone)
cd backend && npm run dev

# Generate VAPID keys for push notifications
npx web-push generate-vapid-keys
```

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | Attendees with profile, contact, is_admin, is_groom, trip_status |
| `events` | Activities with time, location, is_mandatory, total_cost, split_type |
| `rsvps` | User attendance for optional events (confirmed/declined/maybe) |
| `event_costs` | Custom cost per person per event (supports groom=$0) |
| `payments` | Track payments made (amount, method, status, confirmed_by) |
| `push_subscriptions` | Web push subscription endpoints per user |
| `notification_history` | Log of sent notifications |
| `refresh_tokens` | JWT refresh token storage |

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login, get tokens
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### User (Authenticated)
- `GET /api/users` - List all attendees
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update own profile
- `PUT /api/users/:id/trip-status` - Confirm/decline trip attendance

### Events (Authenticated)
- `GET /api/events` - List all events (schedule)
- `GET /api/events/:id` - Event details with attendees
- `PUT /api/events/:eventId/rsvp` - RSVP to optional event

### Payments (Authenticated)
- `GET /api/payments` - User's payments
- `GET /api/payments/summary` - Balance (owed/paid/remaining)
- `POST /api/payments` - Report payment made

### Notifications (Authenticated)
- `POST /api/notifications/subscribe` - Subscribe to push notifications
- `DELETE /api/notifications/unsubscribe` - Unsubscribe from push

### Admin
- `POST/PUT/DELETE /api/admin/events` - CRUD events
- `POST/DELETE /api/admin/users` - Manage attendees
- `PUT /api/admin/events/:id/costs` - Set custom cost splits
- `PUT /api/admin/payments/:id` - Confirm/reject payments
- `POST /api/admin/notifications` - Send push notifications
- `GET /api/admin/notifications/history` - View sent notifications
- `GET /api/admin/notifications/stats` - Subscription stats

---

## Implementation Status

### Completed Phases

#### Phase 1: Foundation ✅
- [x] Docker Compose setup (PostgreSQL, backend, frontend, nginx)
- [x] Backend: Express + TypeScript + database connection
- [x] Database migrations (all tables)
- [x] JWT auth endpoints (register, login, refresh, me)
- [x] Frontend: Vite + React + Tailwind + React Router
- [x] Login/Register pages
- [x] Auth state management (Zustand)

#### Phase 2: Schedule System ✅
- [x] API: event CRUD, RSVP endpoints
- [x] Frontend: Schedule page with Timeline
- [x] EventCard component with mandatory/optional badges
- [x] EventDetail page
- [x] RsvpButton with optimistic updates
- [x] BottomNav mobile navigation

#### Phase 3: Cost Tracking ✅
- [x] API: payment endpoints, balance calculation
- [x] Frontend: Payments page
- [x] BalanceCard component
- [x] PaymentItem list
- [x] Report payment flow

#### Phase 4: Attendees & Profiles ✅
- [x] API: profile update, attendee listing
- [x] Frontend: Attendees page
- [x] AttendeeCard component
- [x] Profile edit page

#### Phase 5: Admin Panel ✅
- [x] Admin middleware
- [x] Admin API endpoints
- [x] AdminLayout with navigation
- [x] Event management with forms
- [x] CostSplitEditor component
- [x] User management
- [x] Payment confirmation table

#### Phase 6: PWA & Notifications ✅
- [x] PWA manifest.json (via vite-plugin-pwa)
- [x] Custom service worker with offline support
- [x] Install prompt (iOS + Android/Desktop)
- [x] Web Push setup (VAPID keys)
- [x] Push subscription management
- [x] Notification sending from admin
- [x] Offline indicator component

#### Phase 7: Polish & Deploy ✅
- [x] Generate real VAPID keys and add to .env
- [x] Create PWA icons (pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png)
- [x] Configure backend for reverse proxy (trust proxy, CORS)
- [x] Update frontend for relative API URLs in production
- [x] Database seed script with test data

### Remaining Tasks
- [ ] SSL/HTTPS setup via Nginx Proxy Manager (required for push notifications)
- [ ] Mobile-first responsive polish
- [ ] Loading/error state improvements
- [ ] Production environment testing

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DB_USER=bachboys
DB_PASSWORD=your-secure-password
DB_NAME=bachboys

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Web Push VAPID Keys (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@bachboys.app

# Environment
NODE_ENV=development
```

---

## Key Features

1. **Schedule & Events**: Timeline view, mandatory vs optional events, RSVP functionality
2. **Cost Tracking**: Per-activity splitting (even/custom), groom pays $0 support, balance tracking
3. **Attendee Profiles**: Contact info, trip status, Venmo handles
4. **Push Notifications**: Schedule changes, payment reminders, event reminders
5. **Admin Panel**: Full CRUD for events/users, payment confirmation, notification sending
6. **PWA**: Installable, offline support, push notifications

## Design Notes

- Mobile-first with bottom navigation
- Clean modern light theme with primary blue accent (#3b82f6)
- Touch-friendly buttons and gestures
- Offline-capable with cached API responses

---

## Nginx Proxy Manager Setup

To host BachBoys with Nginx Proxy Manager:

### 1. Add Proxy Host

Create a new proxy host in NPM:

| Field | Value |
|-------|-------|
| Domain Names | `bachboys.yourdomain.com` |
| Scheme | `http` |
| Forward Hostname/IP | `bachboys-frontend` (or host IP) |
| Forward Port | `5173` |
| Websockets Support | ✅ Enabled |
| Block Common Exploits | ✅ Enabled |

### 2. Add Custom Location for API

In the same proxy host, go to **Custom Locations** and add:

| Field | Value |
|-------|-------|
| Location | `/api` |
| Scheme | `http` |
| Forward Hostname/IP | `bachboys-backend` (or host IP) |
| Forward Port | `3031` |

### 3. SSL Certificate

1. Go to the **SSL** tab
2. Select "Request a new SSL Certificate"
3. Enable "Force SSL" and "HTTP/2 Support"
4. Enter your email for Let's Encrypt

### 4. Update Environment

After SSL is configured, update `.env`:

```bash
# Update CORS to include your domain
CORS_ORIGIN=https://bachboys.yourdomain.com

# For production
NODE_ENV=production
```

Then restart: `docker-compose up -d`

---

## Test Accounts

After running `docker exec bachboys-backend npm run seed`:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Groom | `nick` | `groom123` |
| Attendee | `mike` | `test123` |
| Attendee | `dave` | `test123` |
| Attendee | `chris` | `test123` |
| Attendee | `tom` | `test123` |

---

## Ports Used

| Service | Port | Notes |
|---------|------|-------|
| Frontend | 5173 | Vite dev server |
| Backend API | 3031 | Express server |
| PostgreSQL | (internal) | Not exposed to host |
