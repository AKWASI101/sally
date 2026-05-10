import { useState } from 'react';
import { api } from '../api/client';
import { formatGHS, formatDateTime, statusLabel } from '../utils/format';
import { Check, Clock, X, Smartphone } from 'lucide-react';

const PIPELINE = ['pending_payment', 'payment_confirmed', 'processing', 'shipped', 'delivered'];

export default function TrackOrder() {
  const [form, setForm] = useState({ phone: '', ref: '' });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [momoRef, setMomoRef] = useState('');
  const [momoSubmitted, setMomoSubmitted] = useState(false);
  const [momoError, setMomoError] = useState('');
  const [momoLoading, setMomoLoading] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    setError(''); setOrder(null);
    setLoading(true);
    try {
      const res = await api.trackOrder(form.phone, form.ref);
      setOrder(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMomo = async (e) => {
    e.preventDefault();
    setMomoError('');
    setMomoLoading(true);
    try {
      await api.submitMomo(order.reference, momoRef.trim());
      setMomoSubmitted(true);
    } catch (err) {
      setMomoError(err.message);
    } finally {
      setMomoLoading(false);
    }
  };

  const currentIdx = order ? PIPELINE.indexOf(order.fulfillment_status) : -1;
  const isCancelled = order?.fulfillment_status === 'cancelled';

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <div className="section-header mt-4">
        <h1 className="section-title">Track Your Order</h1>
        <p className="section-subtitle">Enter your phone number and order reference to see your order status.</p>
      </div>

      {/* Lookup Form */}
      <div className="card mb-6">
        <form onSubmit={handleLookup} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              className="form-input"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="0244000000"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Order Reference</label>
            <input
              className="form-input"
              required
              value={form.ref}
              onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value.toUpperCase() }))}
              placeholder="SAL-2026-00001"
              style={{ fontFamily:'monospace', letterSpacing:'.5px' }}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Looking up…' : 'Track Order →'}
          </button>
        </form>
      </div>

      {/* Results */}
      {order && (
        <>
          {/* Header */}
          <div className="card mb-4" style={{ background:'linear-gradient(135deg,var(--brand-light),#f5f3ff)', border:'1px solid rgba(124,58,237,.2)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.25rem', fontWeight:600 }}>{order.reference}</h2>
              <span className={`badge ${isCancelled ? 'badge-danger' : order.fulfillment_status === 'delivered' ? 'badge-success' : 'badge-brand'}`}>
                {statusLabel(order.fulfillment_status)}
              </span>
            </div>
            <p className="text-sm text-muted">Customer: <strong>{order.customer_name}</strong></p>
            <div className="flex gap-4 flex-wrap mt-2">
              <div>
                <p className="text-xs text-muted">Subtotal</p>
                <p className="fw-semi text-sm">{formatGHS(order.subtotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Delivery</p>
                <p className="fw-semi text-sm">{formatGHS(order.delivery_fee)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Total</p>
                <p className="fw-semi text-sm" style={{ color:'var(--brand)' }}>{formatGHS(order.total)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Payment</p>
                <p className={`fw-semi text-sm`} style={{ color: order.payment_status === 'confirmed' ? 'var(--success)' : 'var(--accent)' }}>
                  {statusLabel(order.payment_status)}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card mb-4">
            <h3 className="fw-semi mb-4" style={{ fontSize:'1rem' }}>Order Status</h3>
            <div className="timeline">
              {PIPELINE.map((step) => {
                const idx = PIPELINE.indexOf(step);
                const isDone = !isCancelled && currentIdx > idx;
                const isCurrent = !isCancelled && currentIdx === idx;
                const logEntry = order.timeline?.find((t) => t.status === step);
                return (
                  <div key={step} className={`timeline-step ${isDone ? 'done' : isCurrent ? 'current' : ''}`}>
                    <div className="timeline-dot">
                      {isDone ? <Check size={14} /> : isCurrent ? <Clock size={14} /> : ''}
                    </div>
                    <div className="timeline-content">
                      <p className="timeline-step-label">{statusLabel(step)}</p>
                      {logEntry && <p className="timeline-step-date">{formatDateTime(logEntry.created_at)}</p>}
                      {logEntry?.note && <p className="text-xs text-muted" style={{ marginTop:'.1rem' }}>{logEntry.note}</p>}
                    </div>
                  </div>
                );
              })}
              {isCancelled && (
                <div className="timeline-step cancelled">
                  <div className="timeline-dot"><X size={14} /></div>
                  <div className="timeline-content">
                    <p className="timeline-step-label" style={{ color:'var(--danger)' }}>Cancelled</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MoMo submission if pending */}
          {order.payment_status === 'pending' && !isCancelled && (
            <div className="card mb-4">
              <h3 className="fw-semi mb-2 flex items-center" style={{ fontSize:'1rem' }}>
                <Smartphone size={18} style={{ marginRight: 6 }} />
                {order.momo_reference ? 'Update MoMo Reference' : 'Submit MoMo Transaction ID'}
              </h3>
              {order.momo_reference && (
                <p className="text-sm text-muted mb-3">Current: <strong>{order.momo_reference}</strong></p>
              )}
              {!momoSubmitted ? (
                <form onSubmit={handleMomo} style={{ display:'flex', gap:'.75rem', flexWrap:'wrap' }}>
                  <input
                    className="form-input"
                    style={{ flex:1, minWidth:180 }}
                    value={momoRef}
                    onChange={(e) => setMomoRef(e.target.value)}
                    placeholder="MoMo transaction ID"
                    required
                  />
                  <button type="submit" className="btn btn-accent" disabled={momoLoading || !momoRef.trim()}>
                    {momoLoading ? 'Submitting…' : 'Submit'}
                  </button>
                </form>
              ) : (
                <p className="text-sm fw-semi flex items-center" style={{ color:'var(--success)' }}>
                  <Check size={16} style={{ marginRight: 4 }} /> Submitted! We'll confirm shortly.
                </p>
              )}
              {momoError && <p className="form-error mt-2">{momoError}</p>}
            </div>
          )}

          {/* Items */}
          <div className="card mb-8">
            <h3 className="fw-semi mb-3" style={{ fontSize:'1rem' }}>Items Ordered</h3>
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm mb-2">
                <span className="text-muted">{item.product_name} ×{item.quantity}</span>
                <span className="fw-semi">{formatGHS(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
