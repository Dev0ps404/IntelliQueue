# 🚀 IntelliQueue — AI-Powered Adaptive Queue System  

> ⚡ Smart • Fair • Real-Time Queue Management  

---

## 🧠 Problem  

Traditional queue systems are:
- ⏳ Time-consuming  
- ❌ Unpredictable  
- ⚖️ Often unfair (priority misuse / neglect)  

People waste hours waiting without knowing their turn.

---

## 💡 Solution  

**IntelliQueue** is an AI-powered adaptive queue system that:
- Eliminates physical waiting  
- Dynamically manages priority  
- Predicts wait times  
- Ensures fairness using a smart algorithm  

---

## ✨ Key Features  

### 👤 User Side  
- 🎫 Generate Token (Normal / Priority)  
- 📍 Live Position Tracking  
- ⏱️ Wait Time Prediction  
- 🔔 Real-Time Notifications  

---

### 🛠️ Admin Panel  
- 📊 Live Queue Monitoring  
- ✅ Complete / Skip Tokens  
- ⚡ Manual Priority Control  
- 📈 Analytics Dashboard  
- ⚙️ Dynamic Queue Configuration  

---

## 🧠 🔥 Fairness Engine (Core Innovation)

- Priority users get faster access  
- Normal users are **never starved**  
- Smart balancing ensures fairness  

**Queue Example:**

- Normal → Normal → Priority → Normal → Priority


---

## ⚙️ Tech Stack  

| Layer       | Technology |
|------------|-----------|
| Frontend   | React + Vite + Tailwind |
| Backend    | Node.js + Express |
| Database   | MongoDB |
| Real-Time  | Socket.io |

---

## ⚡ Advanced Capabilities  

- 🔐 JWT Authentication (Admin/User roles)  
- 🛡️ Security (Helmet + Rate Limiting)  
- 🔄 Multi-counter queue system  
- 📊 Analytics & event logging  
- ⏱️ Smart wait-time prediction  
- 📱 QR-based token system  
- 🔌 API versioning (`/api`, `/api/v1`)  

---

## 🏗️ Architecture  

- Frontend (React)
- ↓
- Backend API (Node + Express)
- ↓
- Database (MongoDB)
- ↓
- Socket.io (Real-Time Updates)

  
---

## 📁 Project Structure  

- backend/
- src/
- controllers/
- models/
- routes/
- services/
- socket/

- frontend/
- src/
- components/
- pages/
- api/

  
---

## 🚀 Getting Started  

### 1️⃣ Setup  

- copy backend.env.example backend.env
- copy frontend.env.example frontend.env

  
---

### 2️⃣ Install  

- npm install
- npm run install:all

  
---

### 3️⃣ Run 

- npm run dev

  
🌐 Frontend: http://localhost:5173  
⚙️ Backend: http://localhost:5000  

---

## 🔌 API Overview  

### Auth  
- POST /api/auth/register  
- POST /api/auth/login  
- GET /api/auth/me  

### User  
- POST /api/tokens/create  
- GET /api/tokens/queue  
- GET /api/tokens/my/:tokenNumber  

### Admin  
- GET /api/admin/queue  
- PATCH /api/admin/tokens/:tokenId/status  
- PATCH /api/admin/tokens/:tokenId/prioritize  

---

## 📊 Real-Time System  

- 🔄 Live queue updates  
- 📢 Broadcast to all users  
- 🎯 Token-specific notifications  

---

## 🏆 Why This Project Stands Out  

✔️ Real-world problem solving  
✔️ Fairness-based intelligent system  
✔️ Real-time architecture  
✔️ Scalable design  
✔️ Hackathon-ready  

---

## 🎯 Future Scope  

- 📱 Mobile App  
- 🧠 Advanced AI prediction  
- 🌍 Multi-location queue system  

---

## 👨‍💻 Author  

**Devansh** 🚀  
B.Tech CSE | Full Stack Developer  

---

## ⭐ Final Thought  

> “Stop waiting in lines. Start managing them intelligently.”
