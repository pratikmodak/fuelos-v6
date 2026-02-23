// ═══════════════════════════════════════════════════════════
// FuelOS — API Service Layer
// Connects Vercel frontend → Render backend
// ═══════════════════════════════════════════════════════════

// Your Render backend URL — update this after deploying backend
const API_URL = import.meta.env.VITE_API_URL || "https://fuelos-backend.onrender.com";

// ── Auth token management
const getToken = () => localStorage.getItem("fuelos_token");
const setToken = (t) => localStorage.setItem("fuelos_token", t);
const clearToken = () => localStorage.removeItem("fuelos_token");

// ── Base fetch with auth header
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────
export const Auth = {
  // Login as owner / manager / operator
  login: async (email, password, role) => {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email, password, role },
    });
    setToken(data.token);
    return data; // { token, user, role }
  },

  // Admin step 1: verify password
  adminLogin: async (password) => {
    return apiFetch("/api/auth/admin-login", {
      method: "POST",
      body: { password },
    });
  },

  // Admin step 2: verify OTP → get token
  adminVerify: async (otp) => {
    const data = await apiFetch("/api/auth/admin-verify", {
      method: "POST",
      body: { otp },
    });
    setToken(data.token);
    return data;
  },

  logout: () => clearToken(),

  // Check if logged in + get current user
  me: () => apiFetch("/api/auth/me"),
};

// ─────────────────────────────────────────────────────────
// OWNERS
// ─────────────────────────────────────────────────────────
export const Owners = {
  me: () => apiFetch("/api/owners/me"),
  update: (data) => apiFetch("/api/owners/me", { method: "PATCH", body: data }),
};

// ─────────────────────────────────────────────────────────
// PUMPS
// ─────────────────────────────────────────────────────────
export const Pumps = {
  list: () => apiFetch("/api/pumps"),
  create: (pump) => apiFetch("/api/pumps", { method: "POST", body: pump }),
  update: (id, data) => apiFetch(`/api/pumps/${id}`, { method: "PATCH", body: data }),

  // Nozzles
  listNozzles: (pumpId) => apiFetch(`/api/pumps/${pumpId}/nozzles`),
  addNozzle: (pumpId, nozzle) =>
    apiFetch(`/api/pumps/${pumpId}/nozzles`, { method: "POST", body: nozzle }),
  removeNozzle: (pumpId, nozzleId) =>
    apiFetch(`/api/pumps/${pumpId}/nozzles/${nozzleId}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────
// SHIFTS
// ─────────────────────────────────────────────────────────
export const Shifts = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/api/shifts${q ? "?" + q : ""}`);
  },
  submit: (report) => apiFetch("/api/shifts", { method: "POST", body: report }),
};

// ─────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────
export const Payments = {
  createOrder: (plan, billing, couponCode) =>
    apiFetch("/api/payments/create-order", {
      method: "POST",
      body: { plan, billing, couponCode },
    }),

  verify: (razorpay_order_id, razorpay_payment_id, razorpay_signature, txnId) =>
    apiFetch("/api/payments/verify", {
      method: "POST",
      body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, txnId },
    }),

  history: () => apiFetch("/api/payments/history"),
};

// ─────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────
export const Analytics = {
  sales: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/api/analytics/sales${q ? "?" + q : ""}`);
  },
  summary: () => apiFetch("/api/analytics/summary"),
};

// ─────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────
export const Admin = {
  stats: () => apiFetch("/api/admin/stats"),
  owners: () => apiFetch("/api/admin/owners"),
  updateOwner: (id, data) =>
    apiFetch(`/api/admin/owners/${id}`, { method: "PATCH", body: data }),
  transactions: () => apiFetch("/api/admin/transactions"),
  retryTransaction: (id) =>
    apiFetch(`/api/admin/transactions/${id}/retry`, { method: "POST" }),
  getConfig: () => apiFetch("/api/admin/config"),
  saveConfig: (config) =>
    apiFetch("/api/admin/config", { method: "POST", body: config }),
  audit: () => apiFetch("/api/admin/audit"),
  waLog: () => apiFetch("/api/whatsapp/log"),
};

// ─────────────────────────────────────────────────────────
// HEALTH CHECK — test if backend is reachable
// ─────────────────────────────────────────────────────────
export async function checkBackend() {
  try {
    const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export default { Auth, Owners, Pumps, Shifts, Payments, Analytics, Admin, checkBackend };
