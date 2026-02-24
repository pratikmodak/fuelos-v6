// ═══════════════════════════════════════════════════════════
// FuelOS v8 — API Service Layer
// Connects Vite frontend → Express/Render backend
// ═══════════════════════════════════════════════════════════

const API_URL = import.meta.env.VITE_API_URL || 'https://fuelos-backend.onrender.com';

// ── Token management
const getToken  = () => localStorage.getItem('fuelos_token');
const setToken  = (t) => localStorage.setItem('fuelos_token', t);
const clearToken = () => localStorage.removeItem('fuelos_token');

// ── Base fetch with auth + error handling
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
  login: async (email, password, role) => {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password, role } });
    setToken(data.token);
    return data;
  },
  adminLogin:  (password) => apiFetch('/api/auth/admin-login',  { method: 'POST', body: { password } }),
  adminVerify: async (otp) => {
    const data = await apiFetch('/api/auth/admin-verify', { method: 'POST', body: { otp } });
    setToken(data.token);
    return data;
  },
  logout: () => clearToken(),
  me: () => apiFetch('/api/auth/me'),
};

// ─────────────────────────────────────────────────────────
// OWNERS
// ─────────────────────────────────────────────────────────
export const Owners = {
  me:     ()     => apiFetch('/api/owners/me'),
  update: (data) => apiFetch('/api/owners/me', { method: 'PATCH', body: data }),
};

// ─────────────────────────────────────────────────────────
// PUMPS & NOZZLES
// ─────────────────────────────────────────────────────────
export const Pumps = {
  list:         ()             => apiFetch('/api/pumps'),
  create:       (pump)         => apiFetch('/api/pumps', { method: 'POST', body: pump }),
  update:       (id, data)     => apiFetch(`/api/pumps/${id}`, { method: 'PATCH', body: data }),
  listNozzles:  (pumpId)       => apiFetch(`/api/pumps/${pumpId}/nozzles`),
  addNozzle:    (pumpId, n)    => apiFetch(`/api/pumps/${pumpId}/nozzles`, { method: 'POST', body: n }),
  removeNozzle: (pumpId, nId)  => apiFetch(`/api/pumps/${pumpId}/nozzles/${nId}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────
// SHIFTS
// ─────────────────────────────────────────────────────────
export const Shifts = {
  list:   (params = {}) => apiFetch(`/api/shifts?${new URLSearchParams(params)}`),
  submit: (report)      => apiFetch('/api/shifts', { method: 'POST', body: report }),
};

// ─────────────────────────────────────────────────────────
// PAYMENTS (Razorpay)
// ─────────────────────────────────────────────────────────
export const Payments = {
  createOrder: (plan, billing, couponCode) =>
    apiFetch('/api/payments/create-order', { method: 'POST', body: { plan, billing, couponCode } }),
  verify: (razorpay_order_id, razorpay_payment_id, razorpay_signature, txnId) =>
    apiFetch('/api/payments/verify', { method: 'POST',
      body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, txnId } }),
  history: () => apiFetch('/api/payments/history'),
};

// ─────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────
export const Analytics = {
  sales:   (params = {}) => apiFetch(`/api/analytics/sales?${new URLSearchParams(params)}`),
  summary: ()            => apiFetch('/api/analytics/summary'),
};

// ─────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────
export const Admin = {
  stats:           ()       => apiFetch('/api/admin/stats'),
  owners:          ()       => apiFetch('/api/admin/owners'),
  updateOwner:     (id, d)  => apiFetch(`/api/admin/owners/${id}`, { method: 'PATCH', body: d }),
  transactions:    ()       => apiFetch('/api/admin/transactions'),
  retryTxn:        (id)     => apiFetch(`/api/admin/transactions/${id}/retry`, { method: 'POST' }),
  getConfig:       ()       => apiFetch('/api/admin/config'),
  saveConfig:      (cfg)    => apiFetch('/api/admin/config', { method: 'POST', body: cfg }),
  audit:           ()       => apiFetch('/api/admin/audit'),
  waLog:           ()       => apiFetch('/api/whatsapp/log'),
};

// ─────────────────────────────────────────────────────────
// 🆕 INDENTS (v8) — Tank refill / supply orders
// ─────────────────────────────────────────────────────────
export const Indents = {
  list:         (params = {}) => apiFetch(`/api/indents?${new URLSearchParams(params)}`),
  create:       (indent)      => apiFetch('/api/indents', { method: 'POST', body: indent }),
  updateStatus: (id, status)  => apiFetch(`/api/indents/${id}/status`, { method: 'PATCH', body: { status } }),
  remove:       (id)          => apiFetch(`/api/indents/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────
// 🆕 FUEL PRICES (v8) — Rate manager
// ─────────────────────────────────────────────────────────
export const Prices = {
  get:     ()       => apiFetch('/api/prices'),
  history: ()       => apiFetch('/api/prices/history'),
  set:     (rates)  => apiFetch('/api/prices', { method: 'POST', body: { rates } }),
};

// ─────────────────────────────────────────────────────────
// 🆕 REPORTS (v8) — PDF data endpoints
// ─────────────────────────────────────────────────────────
export const Reports = {
  shift:     (id)            => apiFetch(`/api/reports/shift/${id}`),
  gst:       (params = {})   => apiFetch(`/api/reports/gst?${new URLSearchParams(params)}`),
  analytics: (params = {})   => apiFetch(`/api/reports/analytics?${new URLSearchParams(params)}`),
};

// ─────────────────────────────────────────────────────────
// 🆕 NOTIFICATIONS (v8) — Push alert centre
// ─────────────────────────────────────────────────────────
export const Notifications = {
  list:    ()    => apiFetch('/api/notifications'),
  create:  (n)   => apiFetch('/api/notifications', { method: 'POST', body: n }),
  markRead:(id)  => apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  readAll: ()    => apiFetch('/api/notifications/read-all', { method: 'PATCH' }),
};

// ─────────────────────────────────────────────────────────
// 🆕 CREDITS (v8) — Full CRUD + transaction ledger
// ─────────────────────────────────────────────────────────
export const Credits = {
  list:        (params = {}) => apiFetch(`/api/credits?${new URLSearchParams(params)}`),
  create:      (cc)          => apiFetch('/api/credits', { method: 'POST', body: cc }),
  update:      (id, data)    => apiFetch(`/api/credits/${id}`, { method: 'PATCH', body: data }),
  remove:      (id)          => apiFetch(`/api/credits/${id}`, { method: 'DELETE' }),
  summary:     ()            => apiFetch('/api/credits/summary'),
  transactions:(id)          => apiFetch(`/api/credits/${id}/transactions`),
  addTxn:      (id, txn)     => apiFetch(`/api/credits/${id}/transactions`, { method: 'POST', body: txn }),
};

// ─────────────────────────────────────────────────────────
// 🆕 SHIFT AUDIT (v8) — Edit submitted shifts with reason log
// ─────────────────────────────────────────────────────────
export const Audit = {
  list:      (params = {}) => apiFetch(`/api/audit/shifts?${new URLSearchParams(params)}`),
  editShift: (id, data)    => apiFetch(`/api/audit/shifts/${id}`, { method: 'PATCH', body: data }),
  history:   (id)          => apiFetch(`/api/audit/shifts/${id}/history`),
};

// ─────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────
export async function checkBackend() {
  try {
    const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, version: data.version };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export default {
  Auth, Owners, Pumps, Shifts, Payments, Analytics, Admin,
  Indents, Prices, Reports, Notifications, Credits, Audit,
  checkBackend,
};
