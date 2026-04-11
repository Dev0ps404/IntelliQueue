# 🚀 IntelliQueue (AI-Powered Adaptive Queue System)

> ⚡ Smart • Fair • Real-time Queue Management using AI-inspired logic



## 🧠 Overview

A## 🧠 IntelliQueue

IntelliQueue is an AI-powered adaptive queue management system built using the MERN stack, designed to optimize and automate queue handling in real-time. It leverages intelligent priority algorithms combined with fairness-aware scheduling to ensure that high-priority users are served efficiently without causing starvation of normal users.

The system provides a seamless experience for both users and administrators. Users can generate tokens, track their live position in the queue, and receive real-time notifications, while administrators gain full control over queue flow with dynamic configurations, analytics, and multi-counter management.

With real-time synchronization powered by Socket.io, IntelliQueue ensures that all users stay updated with the latest queue status. The platform is scalable, secure, and production-ready, making it suitable for use in hospitals, banks, service centers, and other high-demand environments.

By combining smart automation, real-time updates, and fairness-driven logic, IntelliQueue transforms traditional queue systems into intelligent, efficient, and user-friendly solutions.


Designed for:
- 🏥 Hospitals  
- 🏦 Banks  
- 🛠 Service Centers  
- 🎓 Universities  

---

## 🛠 Tech Stack

| Layer        | Tech |
|-------------|------|
| 🗄 Database  | MongoDB + Mongoose |
| ⚙ Backend   | Node.js + Express.js |
| 🎨 Frontend | React.js + Vite + Tailwind CSS |
| 🔄 Realtime | Socket.io |
| 🔐 Auth     | JWT (Role-based access) |

---

## ✨ Key Features

### 👤 User Panel

- 🎟 Generate Token (Normal / Priority)
- 📊 Live Token Tracking (Position + ETA)
- 📋 Full Queue Visualization
- 🔔 Real-time Notifications (Near Turn Alerts)
- 📱 QR Code for Token Sharing

---

### 🛡 Admin Dashboard

- 📡 Live Queue Monitoring
- ✅ Mark Tokens (Completed / Skipped)
- ⚡ Manual Priority Control
- 📈 Real-time Analytics Dashboard

#### 🎛 Dynamic Queue Controls

- ⏱ Average Service Time
- 🔁 Max Priority Streak (Fairness Control)
- ⚖ Priority Weight System
- 🚫 Starvation Prevention
- 🧮 Multi-Counter Support
- 🔔 Near-Turn Trigger
- 🤖 Auto-Serve Toggle

---

## 🧩 Fairness Algorithm (Core USP)

```text
IF priority_streak < limit:
    serve(priority_token)
ELSE:
    serve(normal_token)
    reset(priority_streak)
```

💡 Goal:
- Priority users get faster service  
- Normal users never get ignored  

---

## 🏗 Architecture

```text
                ┌──────────────┐
                │   Frontend   │
                │ React + Vite │
                └──────┬───────┘
                       │
              Socket.io + REST API
                       │
        ┌──────────────▼──────────────┐
        │         Backend             │
        │ Node + Express             │
        │ - Controllers              │
        │ - Services (Queue Engine)  │
        │ - Middleware               │
        └──────────────┬──────────────┘
                       │
                ┌──────▼──────┐
                │  MongoDB    │
                └─────────────┘
```

---

## 📁 Project Structure

```bash
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

---

## 🔐 Security & Production Features

- 🛡 JWT Authentication (`admin`, `user`)
- 🚫 Rate Limiting
- 🧱 Helmet Security Headers
- 📦 Request Validation
- 📜 Centralized Error Handling
- 📊 Structured Logging System

---

## ⚡ Real-Time Engine

- 🔄 Live Queue Sync using Socket.io  
- 🎯 Token-specific notification rooms  
- 📡 Broadcast updates to all users  
- ⏳ Accurate wait-time prediction  

---

## 📊 Smart Analytics

- 📈 Queue Performance Metrics
- ⏱ Average Wait Time Tracking
- 📜 Event Timeline Logs
- 🔍 Historical Data Insights

---

## 🔌 API Overview

### 🔑 Auth

```bash
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

---

### 👤 User

```bash
POST   /api/tokens/create
GET    /api/tokens/my/:tokenNumber
GET    /api/tokens/my/:tokenNumber/qr
GET    /api/tokens/queue
```

---

### 🛡 Admin

```bash
GET    /api/admin/queue
PATCH  /api/admin/tokens/:tokenId/status
PATCH  /api/admin/tokens/:tokenId/prioritize
GET    /api/admin/stats
GET    /api/admin/analytics
GET    /api/admin/events
GET    /api/admin/flow
PATCH  /api/admin/flow
POST   /api/admin/flow/advance
```

---

## ⚙ Local Setup

### 1️⃣ Setup Environment

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

---

### 2️⃣ Install Dependencies

```bash
npm install
npm run install:all
```

---

### 3️⃣ Run Project

```bash
npm run dev
```

Backend: http://localhost:5000  
Frontend: http://localhost:5173  

---

## 🧪 Dev Notes

- AUTH_DISABLED=true → Skip login (dev mode)
- AUTH_DISABLED=false → Enable JWT auth
- MONGO_MEMORY_FALLBACK=true → Local testing only
- Use `/api/v1` for future-proof APIs

---

## 🏆 Highlights

✔ Real-time system  
✔ Fairness-based algorithm  
✔ Production-ready backend  
✔ Scalable architecture  
✔ Clean UI + responsive design  

---

## 💡 Future Enhancements

- 🤖 AI-based wait prediction
- 📱 Mobile App
- 🌍 Multi-location queue sync
- 🎤 Voice-based token calling
- 📊 Advanced BI Dashboard

---

## 👨‍💻 Author

**Devansh 🚀**

---

## ⭐ Support

If you like this project:

👉 Star ⭐ the repo  
👉 Fork 🍴 it  
👉 Contribute 💡  
