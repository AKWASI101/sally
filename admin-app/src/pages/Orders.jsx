import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatGHS, formatDate, statusBadgeClass, statusLabel } from '../utils/format';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/Pagination';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', payment: '', from: '', to: '', page: 1 });
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.payment) params.payment = filters.payment;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      params.page = filters.page;
      const res = await api.listOrders(params);
      setOrders(res.data || []);
      setPagination(res.pagination);
    } catch (err) { addToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val, page: 1 }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Orders</h1>
      </div>

      <div className="filter-bar">
        <select className="form-select" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All Status</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="payment_confirmed">Payment Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="form-select" value={filters.payment} onChange={(e) => setFilter('payment', e.target.value)}>
          <option value="">All Payments</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
        </select>
        <input className="form-input" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} placeholder="From" />
        <input className="form-input" type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} placeholder="To" />
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          <p className="text-sm text-muted mb-4">{pagination.total} order{pagination.total !== 1 ? 's' : ''} found</p>
          <div className="list-stack">
            {orders.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '.25rem' }}>
                  <strong style={{ fontSize: '.875rem' }}>{o.reference}</strong>
                  <span className={`badge ${statusBadgeClass(o.fulfillment_status)}`}>{statusLabel(o.fulfillment_status)}</span>
                </div>
                <p className="text-sm">{o.customer_name} · {o.customer_phone}</p>
                <p className="text-sm text-muted">
                  {o.item_count} item{o.item_count !== 1 ? 's' : ''} · {formatGHS(o.total)}
                  {o.payment_status === 'pending' && ' ⚠️'}
                </p>
                <p className="text-xs text-muted" style={{ marginTop: '.25rem' }}>{formatDate(o.created_at)}</p>
              </Link>
            ))}
            {orders.length === 0 && (
              <div className="empty-state">
                <div className="empty-state__icon">🧾</div>
                <p className="empty-state__text">No orders found.</p>
              </div>
            )}
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
        </>
      )}
    </div>
  );
}
