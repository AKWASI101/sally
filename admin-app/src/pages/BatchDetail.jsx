import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatGHS, formatDate, statusBadgeClass, statusLabel } from '../utils/format';
import { useToast } from '../context/ToastContext';

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [batch, setBatch] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [batchRes, ordersRes] = await Promise.all([
          api.listBatches(),
          api.batchOrders(id),
        ]);
        const b = (batchRes.data || []).find((x) => x.id === id);
        setBatch(b || null);
        setOrders(ordersRes.data || []);
      } catch (err) { addToast(err.message, 'error'); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleExport = async () => {
    try {
      const res = await api.exportBatchCSV(id);
      if (res.blob) {
        const url = URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename;
        a.click();
        URL.revokeObjectURL(url);
        addToast('CSV exported');
      }
    } catch (err) { addToast(err.message, 'error'); }
  };

  if (loading) return <div className="spinner" />;
  if (!batch) return <div className="empty-state"><p className="empty-state__text">Batch not found.</p></div>;

  const confirmed = orders.filter((o) => o.payment_status === 'confirmed').length;
  const pending = orders.filter((o) => o.payment_status === 'pending').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{batch.name}</h1>
          <p className="text-sm text-muted" style={{ marginTop: '.25rem' }}>
            <span className={`badge ${statusBadgeClass(batch.status)}`}>{statusLabel(batch.status)}</span>
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/batches')}>← Batches</button>
      </div>

      {/* Batch summary */}
      <div className="stat-grid mb-6">
        <div className="stat-card">
          <span className="stat-card__label">Orders</span>
          <span className="stat-card__value">{orders.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Confirmed</span>
          <span className="stat-card__value" style={{ color: 'var(--success)' }}>{confirmed}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Pending</span>
          <span className="stat-card__value" style={{ color: 'var(--warn)' }}>{pending}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Total Value</span>
          <span className="stat-card__value" style={{ fontSize: '1.125rem' }}>{formatGHS(batch.total_value)}</span>
        </div>
      </div>

      <p className="text-sm text-muted mb-4">
        Deadline: {formatDate(batch.order_deadline)} · Arrival: {formatDate(batch.estimated_arrival)}
      </p>

      {/* CSV export */}
      <div className="mb-6">
        <button className="btn btn-accent" onClick={handleExport}>📄 Export CSV for Courier</button>
      </div>

      {/* Orders list */}
      <h2 className="section-title">Orders in Batch</h2>
      <div className="list-stack">
        {orders.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '.25rem' }}>
              <strong style={{ fontSize: '.875rem' }}>{o.reference}</strong>
              <span className={`badge ${statusBadgeClass(o.payment_status)}`}>{statusLabel(o.payment_status)}</span>
            </div>
            <p className="text-sm text-muted">{o.customer_name} · {o.customer_phone}</p>
            <p className="text-sm">{formatGHS(o.total)}</p>
          </Link>
        ))}
        {orders.length === 0 && (
          <div className="empty-state"><p className="empty-state__text">No orders in this batch yet.</p></div>
        )}
      </div>
    </div>
  );
}
