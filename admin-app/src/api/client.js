/**
 * API client — thin wrapper around fetch.
 * JWT is stored in-memory (not localStorage) for security.
 */

let _token = null;

export const setToken = (t) => { _token = t; };
export const getToken = () => _token;
export const clearToken = () => { _token = null; };

async function request(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  // Don't set Content-Type for FormData (browser sets boundary)
  if (!(opts.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...opts, headers });
  // Handle CSV downloads
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/csv')) {
    const blob = await res.blob();
    return { success: true, blob, filename: getFilename(res) };
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function getFilename(res) {
  const d = res.headers.get('content-disposition') || '';
  const match = d.match(/filename="?([^"]+)"?/);
  return match ? match[1] : 'export.csv';
}

export const api = {
  // Auth
  login: (body) => request('/api/v1/admin/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  // Dashboard
  dashboard: () => request('/api/v1/admin/dashboard'),

  // Products
  listProducts: (params) => request(`/api/v1/admin/products?${new URLSearchParams(params)}`),
  createProduct: (formData) => request('/api/v1/admin/products', { method: 'POST', body: formData }),
  updateProduct: (id, formData) => request(`/api/v1/admin/products/${id}`, { method: 'PATCH', body: formData }),
  archiveProduct: (id) => request(`/api/v1/admin/products/${id}`, { method: 'DELETE' }),

  // Batches
  listBatches: () => request('/api/v1/admin/batches'),
  createBatch: (body) => request('/api/v1/admin/batches', { method: 'POST', body: JSON.stringify(body) }),
  updateBatch: (id, body) => request(`/api/v1/admin/batches/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  batchOrders: (id) => request(`/api/v1/admin/batches/${id}/orders`),
  exportBatchCSV: (id) => request(`/api/v1/admin/batches/${id}/export`),

  // Orders
  listOrders: (params) => request(`/api/v1/admin/orders?${new URLSearchParams(params)}`),
  orderDetail: (id) => request(`/api/v1/admin/orders/${id}`),
  confirmPayment: (id) => request(`/api/v1/admin/orders/${id}/payment`, { method: 'PATCH' }),
  updateStatus: (id, body) => request(`/api/v1/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  addNote: (id, body) => request(`/api/v1/admin/orders/${id}/notes`, { method: 'POST', body: JSON.stringify(body) }),
  cancelOrder: (id, body) => request(`/api/v1/admin/orders/${id}`, { method: 'DELETE', body: JSON.stringify(body) }),
};
