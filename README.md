# BachBoys - Bachelor Party Planning App

A mobile-first Progressive Web App for planning and coordinating bachelor parties, inspired by tech conference apps like Dreamforce.

## Features

- **Schedule View**: See all events on a timeline, RSVP to optional activities
- **Cost Tracking**: View costs per activity, track payments, see your balance
- **Attendee Profiles**: See who's coming, their contact info, and trip status
- **Admin Panel**: Manage events, users, costs, and payments

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development without Docker)

### Running with Docker (Recommended)

```bash
# Start all services
docker-compose up

# Or run in background
docker-compose up -d
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### First Time Setup

1. Start the app with `docker-compose up`
2. Register a new account at http://localhost:5173/register
3. The first user can be made an admin by connecting to the database:

```bash
# Connect to database
docker exec -it bachboys-db psql -U bachboys -d bachboys

# Make a user an admin (replace 'username' with the actual username)
UPDATE users SET is_admin = true WHERE username = 'your_username';

# Set the groom
UPDATE users SET is_groom = true WHERE username = 'nick';
```

### Local Development (without Docker)

1. Install PostgreSQL and create a database
2. Copy `.env.example` to `.env` and configure
3. Install dependencies:

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## Project Structure

```
bachboys/
├── backend/           # Express + TypeScript API
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── db/        # Database pool & migrations
│   │   └── middleware/# Auth, error handling
│   └── package.json
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/     # Route components
│   │   ├── components/# Reusable UI components
│   │   ├── store/     # Zustand state management
│   │   └── api/       # API client functions
│   └── package.json
├── docker-compose.yml
└── .env
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id/rsvp` - RSVP to event

### Payments
- `GET /api/payments` - Get user's payments
- `GET /api/payments/summary` - Get balance summary
- `POST /api/payments` - Report a payment

### Users
- `GET /api/users` - List all attendees
- `PUT /api/users/:id` - Update profile
- `PUT /api/users/:id/trip-status` - Update trip status

### Admin (requires admin role)
- `POST/PUT/DELETE /api/admin/events` - Manage events
- `PUT /api/admin/events/:id/costs` - Set cost splits
- `GET/PUT /api/admin/payments` - Manage payments
- `GET /api/admin/dashboard` - View stats

## Admin Panel

The admin panel is available at `/admin` for users with admin privileges.

### Features

- **Dashboard**: Overview stats (attendees, events, payments, collection rate)
- **Event Management**: Create, edit, delete events with full scheduling options
- **Cost Split Editor**: Set per-person costs for each event, auto-calculate even splits
- **User Management**: Add/remove attendees, set admin/groom status
- **Payment Tracking**: View all payments, confirm/reject pending payments, view balances

### Accessing Admin

1. Navigate to your Profile page
2. If you're an admin, you'll see the "Admin Panel" card
3. Click to access the full admin interface

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Query, Zustand
- **Backend**: Node.js, Express, TypeScript, PostgreSQL
- **Infrastructure**: Docker, Docker Compose
