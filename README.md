# 🚀 AI-Powered Adaptive Queue System  

> Smart • Fair • Real-Time Queue Management System

A production-ready full-stack MERN application designed to eliminate physical queues, optimize waiting time, and ensure fairness using intelligent priority handling and real-time updates.

---

## 🧠 Overview  

Traditional queue systems are inefficient, lack transparency, and often result in unfair priority handling.  
This system introduces a smart, adaptive queue engine that dynamically manages tokens, predicts wait times, and ensures a balanced experience for all users.

---

## ⚙️ Tech Stack  

- Frontend: React.js + Vite + Tailwind CSS  
- Backend: Node.js + Express.js  
- Database: MongoDB + Mongoose  
- Real-Time: Socket.io  

---

## ✨ Features  

### 👤 User Panel  
- Generate token (Normal / Priority)  
- View token status, position, and wait time  
- View full queue  
- Receive real-time notifications  

### 🛠️ Admin Dashboard  
- View live queue  
- Complete / Skip tokens  
- Prioritize tokens  
- View stats and analytics  
- Adjust queue flow settings  

---

## 🧠 Fairness Engine  

Priority users are served faster but limited by a max priority streak.  
This ensures normal users are not continuously skipped.

Example:  
Normal → Normal → Priority → Normal → Priority  

---

## ⚡ Advanced Features  

- JWT Authentication (Admin/User roles)  
- Security with Helmet & Rate Limiting  
- Multi-counter queue system  
- Real-time updates via Socket.io  
- Smart wait time prediction  
- QR-based token system  
- API versioning support  

---

## 📁 Project Structure  

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

---

## 🚀 Getting Started  

### 1. Setup Environment  

copy backend\.env.example backend\.env  
copy frontend\.env.example frontend\.env  

---

### 2. Install Dependencies  

npm install  
npm run install:all  

---

### 3. Run Project  

npm run dev  

Frontend: http://localhost:5173  
Backend: http://localhost:5000  

---

## 🔌 API Overview  

### Auth  
POST /api/auth/register  
POST /api/auth/login  
GET /api/auth/me  

### User  
POST /api/tokens/create  
GET /api/tokens/my/:tokenNumber  
GET /api/tokens/my/:tokenNumber/qr  
GET /api/tokens/queue  

### Admin  
GET /api/admin/queue  
PATCH /api/admin/tokens/:tokenId/status  
PATCH /api/admin/tokens/:tokenId/prioritize  
GET /api/admin/stats  
GET /api/admin/analytics  
GET /api/admin/events  
GET /api/admin/flow  
PATCH /api/admin/flow  
POST /api/admin/flow/advance  

---

## ⚙️ Notes  

- Use AUTH_DISABLED=true for local development  
- Enable JWT in production  
- Use /api/v1 for future compatibility  
- MongoDB fallback only for development  

---

## 🏆 Why This Project  

- Solves real-world queue problems  
- Fairness-based intelligent system  
- Real-time synchronization  
- Scalable architecture  
- Hackathon-ready  

---

## 🎯 Future Scope  

- Mobile app integration  
- Advanced AI prediction  
- Multi-location deployment  

---

## 👨‍💻 Author  

Devansh 🚀  
B.Tech CSE  

---
