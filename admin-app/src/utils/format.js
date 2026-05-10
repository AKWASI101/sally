/** Format a number as GHS currency */
export function formatGHS(amount) {
  return `GHS ${Number(amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Readable date */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Readable datetime */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Days remaining from now */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / 86400000));
}

/** Status → badge class mapping */
const STATUS_MAP = {
  open: 'badge-success', closed: 'badge-muted', shipped: 'badge-info', arrived: 'badge-accent', fulfilled: 'badge-primary',
  pending_payment: 'badge-warning', payment_confirmed: 'badge-success', processing: 'badge-info', delivered: 'badge-accent', cancelled: 'badge-danger',
  pending: 'badge-warning', confirmed: 'badge-success',
};

export function statusBadgeClass(status) {
  return STATUS_MAP[status] || 'badge-muted';
}

/** Human-readable status label */
export function statusLabel(status) {
  return (status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Category label */
const CATEGORY_LABELS = {
  beauty_skincare: 'Beauty & Skincare',
  fashion_clothing: 'Fashion & Clothing',
  electronics_gadgets: 'Electronics & Gadgets',
  home_kitchen: 'Home & Kitchen',
  other: 'Other',
};
export function categoryLabel(cat) {
  return CATEGORY_LABELS[cat] || cat || 'Other';
}
