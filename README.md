# FuelOS v8 — Frontend

React + Vite fuel station management platform.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## 🔐 Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Owner | rajesh@sharma.com | owner123 |
| Manager | vikram@sharma.com | mgr123 |
| Operator | amit@sharma.com | op123 |
| Admin | admin@fuelos.in | admin2025 + OTP |

> **Offline mode**: App works fully with seed data when backend is not connected.

## 📦 Deploy to Vercel

1. Push this folder to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Set env var: `VITE_API_URL=https://your-render-backend.onrender.com`
4. Deploy ✓

## ⚙️ Environment Variables

Copy `.env.example` → `.env.local`:

```
VITE_API_URL=https://fuelos-backend.onrender.com
VITE_RAZORPAY_KEY_ID=rzp_test_xxx
```

## 🗂️ Project Structure

```
fuelos-v8-frontend/
├── index.html          # Entry HTML with font preloads
├── package.json
├── vite.config.js
├── vercel.json         # Vercel deployment config
├── .env.example
└── src/
    ├── main.jsx        # React root mount
    ├── App.jsx         # Full application (4,200+ lines)
    ├── api.js          # API service layer (all v8 endpoints)
    └── index.css       # Global styles + scrollbar + animations
```

## ✨ v8 Features

### Owner Dashboard (20 tabs)
- 📊 **Overview** — KPIs, spark lines, quick actions
- 🏗 **Consolidated** — All pumps combined view
- 📈 **Advanced Analytics** — Per-pump filter, 7d/30d/90d, shift breakdown, PDF export
- ⛽ **My Pumps** — Add/edit pumps and nozzles
- 🔬 **Machine Tests** — Variance tracking, Pass/Warn/Fail
- 🛢 **Stock & Tanks** — Dip readings, alerts
- 📦 **Indent Orders** *(v8)* — Refill orders, supplier tracking, Ordered→Delivered pipeline
- 💳 **Plans & Limits** — Upgrade with live Razorpay gateway
- 📜 **Billing** — Full Razorpay UPI/Card/NetBanking flow
- 🤝 **Credits** *(v8)* — Full CRUD, transaction ledger, utilization bars
- 👥 **Staff** — Managers and operators management
- 📋 **Shift Reports** — With PDF export per shift
- 🔍 **Shift Audit** *(v8)* — Edit submitted shifts with compliance log
- 💱 **Fuel Prices** *(v8)* — Global or per-pump rate manager
- 🧾 **GST Reports** — With PDF export
- 🔔 **Notifications** *(v8)* — Auto alerts (stock, tests, plan, credit)
- ⚙️ **Settings** — WhatsApp, password

### Manager Dashboard (7 tabs)
Operations, Machine Tests, Cash & Payments, Denomination, Dip & Tanks, Attendance, Shift Reports

### Operator Dashboard (4 tabs)
My Nozzles, Machine Tests, Payment Entry, My History

### Admin Dashboard (13 tabs)
Overview, Owners & Stats, Payments, WhatsApp Stats, Integrations (Razorpay/WhatsApp/Email/SMS), All Pumps, Machine Tests, Analytics, System Health, Audit Log, Coupons, Alerts

## 🔌 Backend API (v8 endpoints)

See `src/api.js` for full list. Key v8 additions:
- `POST/GET /api/indents` — indent orders
- `POST/GET /api/prices` — fuel price manager
- `GET /api/reports/shift/:id` — shift PDF data
- `GET /api/reports/gst` — GST PDF data
- `GET /api/notifications` — auto-generated alerts
- `GET/POST/PATCH/DELETE /api/credits` — credit CRUD
- `GET/PATCH /api/audit/shifts` — shift audit trail
