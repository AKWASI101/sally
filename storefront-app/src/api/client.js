/* API Client for Sally Storefront */

const BASE = '/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

export const api = {
  // Public products
  listProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/products${q ? `?${q}` : ''}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  getBatches: () => request('/products/batches'),

  // Public orders
  placeOrder: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  submitMomo: (ref, momo_reference) =>
    request(`/orders/${ref}/momo`, { method: 'PATCH', body: JSON.stringify({ momo_reference }) }),
  trackOrder: (phone, ref) => request(`/orders/track?phone=${encodeURIComponent(phone)}&ref=${encodeURIComponent(ref)}`),
};
