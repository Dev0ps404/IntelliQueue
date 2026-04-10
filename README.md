# AI-Powered Adaptive Queue System

A complete full-stack MERN application for smart queue management with real-time updates and fairness-aware priority handling.

## Stack

- MongoDB + Mongoose
- Express.js + Node.js
- React.js + Vite + Tailwind CSS
- Socket.io (real-time queue sync + notifications)

## Features

### User Panel

- Generate token as Normal or Priority
- View My Token with live status, position, and estimated wait time
- View full queue with visual priority highlighting
- Receive near-turn notifications in real time

### Admin Dashboard

- View live queue updates
- Mark tokens as completed or skipped
- Manually prioritize waiting tokens
- View queue stats (total, active, average wait)
- Adjust queue flow dynamically:
  - Average service minutes
  - Max priority streak (fairness control)
  - Max priority share
  - Priority weight and starvation threshold
  - Multi-counter count
  - Near-turn threshold
  - Auto-serve toggle

### Fairness Algorithm

Priority tokens are served faster but constrained by a max consecutive priority streak. When the streak limit is reached, a normal token is forced next if one is waiting.

### Backend Production Upgrade

- JWT authentication and role authorization (`admin`, `user`)
- Request validation, centralized error handling, and structured logging
- Security hardening with Helmet and rate limiting
- Multi-counter queue engine with dynamic reordering
- Queue event tracking and analytics timeline support
- Historical service-time based wait estimation
- Optional QR payload generation for token sharing and mobile workflows
- API versioning support (`/api` and `/api/v1`)

## Project Structure

```text
backend/
  src/
    config/
    controllers/
    models/
    routes/
    services/
    socket/
    utils/
frontend/
  src/
    api/
    components/
    context/
    pages/
    utils/
```

## Local Setup

1. Copy environment templates:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

1. Install dependencies:

```bash
npm install
npm run install:all
```

1. Start both services:

```bash
npm run dev
```

- Backend: <http://localhost:5000>
- Frontend: <http://localhost:5173>

## API Overview

### Auth Endpoints

- `POST /api/auth/register` - create user account
- `POST /api/auth/login` - get JWT access token
- `GET /api/auth/me` - get authenticated profile

### User Endpoints

- `POST /api/tokens/create` - generate token
- `GET /api/tokens/my/:tokenNumber` - get token details
- `GET /api/tokens/my/:tokenNumber/qr` - fetch QR data URL for a token
- `GET /api/tokens/queue` - get current queue snapshot

### Admin Endpoints

- `GET /api/admin/queue` - live queue
- `PATCH /api/admin/tokens/:tokenId/status` - set `completed` or `skipped`
- `PATCH /api/admin/tokens/:tokenId/prioritize` - manually boost token priority
- `GET /api/admin/stats` - queue stats + analytics payload
- `GET /api/admin/analytics` - queue analytics timeline
- `GET /api/admin/events` - queue event logs
- `GET /api/admin/flow` - flow configuration
- `PATCH /api/admin/flow` - update flow configuration
- `POST /api/admin/flow/advance` - manually trigger next token

## Notes

- The backend auto-starts serving the next token when enabled via flow settings.
- Socket.io broadcasts queue updates to all clients and targeted notifications to token-specific rooms.
- Styling is responsive and optimized for desktop and mobile dashboards.

## Backend Integration Guide

1. For local development with existing frontend (no login screen changes), keep `AUTH_DISABLED=true` in `backend/.env`.
1. For production auth enforcement, set `AUTH_DISABLED=false` and configure `JWT_SECRET`.
1. Use `/api/v1/*` endpoints for new mobile clients while keeping `/api/*` backward compatibility for existing frontend.
1. If local MongoDB is unavailable, keep `MONGO_MEMORY_FALLBACK=true` for development only; disable it in production.
1. Monitor `backend/logs/events.log` and `/api/admin/events` for queue and token lifecycle tracking.
