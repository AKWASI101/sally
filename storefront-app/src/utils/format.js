/* Shared utility helpers */

export function formatGHS(amount) {
  const num = parseFloat(amount) || 0;
  return `GHS ${num.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function categoryLabel(slug) {
  const map = {
    beauty_skincare: 'Beauty & Skincare',
    fashion_clothing: 'Fashion & Clothing',
    electronics_gadgets: 'Electronics & Gadgets',
    home_kitchen: 'Home & Kitchen',
    other: 'Other',
  };
  return map[slug] || slug;
}

export function statusLabel(s) {
  const map = {
    pending_payment: 'Pending Payment',
    payment_confirmed: 'Payment Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    pending: 'Pending',
    confirmed: 'Confirmed',
    open: 'Open',
    closed: 'Closed',
    shipped_batch: 'Shipped',
    arrived: 'Arrived',
    fulfilled: 'Fulfilled',
  };
  return map[s] || s;
}

export const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Northern', 'Volta', 'Upper East', 'Upper West', 'Bono',
  'Bono East', 'Ahafo', 'Western North', 'Oti', 'North East', 'Savannah',
];
