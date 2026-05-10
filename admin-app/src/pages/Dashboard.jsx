import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatGHS, formatDate, daysUntil, statusBadgeClass, statusLabel } from '../utils/format';
import { useToast } from '../context/ToastContext';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    api.dashboard()
      .then((res) => setData(res.data))
      .catch((err) => addToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleConfirm = async (orderId) => {
    try {
      await api.confirmPayment(orderId);
      addToast('Payment confirmed');
      // Refresh
      const res = await api.dashboard();
      setData(res.data);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (loading) return <div className="spinner" />;
  if (!data) return <div className="empty-state"><p className="empty-state__text">Failed to load dashboard.</p></div>;

  const { summary, pending_actions, recent_orders, open_batches } = data;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {/* Summary cards */}
      <div className="stat-grid mb-6">
        <div className="stat-card">
          <span className="stat-card__label">Orders This Month</span>
          <span className="stat-card__value">{summary.orders_this_month}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Revenue</span>
          <span className="stat-card__value">{formatGHS(summary.revenue_this_month)}</span>
        </div>
        <div className={`stat-card ${summary.pending_payments > 0 ? 'stat-card--warning' : ''}`}>
          <span className="stat-card__label">Pending Payments</span>
          <span className="stat-card__value">{summary.pending_payments} {summary.pending_payments > 0 && '⚠️'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Open Batches</span>
          <span className="stat-card__value">{summary.open_batches}</span>
        </div>
      </div>

      {/* Pending actions */}
      {pending_actions.length > 0 && (
        <section className="mb-6">
          <h2 className="section-title">⚡ Requires Action</h2>
          <div className="list-stack">
            {pending_actions.map((o) => (
              <div key={o.id} className="card" style={{ borderColor: 'rgba(255,179,71,.3)' }}>
                <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '.5rem' }}>
                  <strong style={{ fontSize: '.875rem' }}>{o.reference}</strong>
                  <span className="badge badge-warning">Pending</span>
                </div>
                <p className="text-sm">{o.customer_name} · {formatGHS(o.total)}</p>
                {o.momo_reference && <p className="text-xs text-muted" style={{ marginTop: '.25rem' }}>MoMo: {o.momo_reference}</p>}
                <div className="flex gap-2" style={{ marginTop: '.75rem' }}>
                  <button className="btn btn-accent btn-sm" onClick={() => handleConfirm(o.id)}>✓ Confirm</button>
                  <Link to={`/orders/${o.id}`} className="btn btn-ghost btn-sm">View</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Open batches */}
      {open_batches.length > 0 && (
        <section className="mb-6">
          <h2 className="section-title">Open Batches</h2>
          <div className="list-stack">
            {open_batches.map((b) => {
              const days = daysUntil(b.order_deadline);
              return (
                <div key={b.id} className="card">
                  <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '.5rem' }}>
                    <strong style={{ fontSize: '.875rem' }}>{b.name}</strong>
                    <span className="badge badge-success">Open</span>
                  </div>
                  <p className="text-sm text-muted">
                    Deadline: {formatDate(b.order_deadline)} {days !== null && `· ⏱ ${days}d left`}
                  </p>
                  <p className="text-sm text-muted">{b.order_count} orders · {formatGHS(b.total_value)}</p>
                  <div style={{ marginTop: '.75rem' }}>
                    <Link to={`/batches/${b.id}`} className="btn btn-ghost btn-sm">View Batch</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent orders */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title" style={{ marginBottom: 0 }}>Recent Orders</h2>
          <Link to="/orders" className="btn btn-ghost btn-sm">View All</Link>
        </div>
        <div className="list-stack">
          {recent_orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '.25rem' }}>
                <strong style={{ fontSize: '.875rem' }}>{o.reference}</strong>
                <span className={`badge ${statusBadgeClass(o.fulfillment_status)}`}>{statusLabel(o.fulfillment_status)}</span>
              </div>
              <p className="text-sm text-muted">{o.customer_name} · {o.item_count} item{o.item_count !== 1 ? 's' : ''} · {formatGHS(o.total)}</p>
              <p className="text-xs text-muted" style={{ marginTop: '.25rem' }}>{formatDate(o.created_at)}</p>
            </Link>
          ))}
          {recent_orders.length === 0 && (
            <div className="empty-state"><p className="empty-state__text">No orders yet.</p></div>
          )}
        </div>
      </section>
    </div>
  );
}
