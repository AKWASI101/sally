import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { formatGHS, formatDateTime, statusBadgeClass, statusLabel } from '../utils/format';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

const PIPELINE = ['pending_payment', 'payment_confirmed', 'processing', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.orderDetail(id);
      setOrder(res.data);
    } catch (err) { addToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleConfirmPayment = async () => {
    try {
      await api.confirmPayment(id);
      addToast('Payment confirmed');
      load();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleAdvanceStatus = async () => {
    const currentIdx = PIPELINE.indexOf(order.fulfillment_status);
    if (currentIdx < 0 || currentIdx >= PIPELINE.length - 1) return;
    const nextStatus = PIPELINE[currentIdx + 1];

    if (nextStatus === 'payment_confirmed') {
      return handleConfirmPayment();
    }

    try {
      const body = { status: nextStatus };
      if (nextStatus === 'shipped' && trackingNumber.trim()) {
        body.tracking_number = trackingNumber.trim();
      }
      await api.updateStatus(id, body);
      addToast(`Status updated to ${statusLabel(nextStatus)}`);
      setTrackingNumber('');
      load();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setAddingNote(true);
    try {
      await api.addNote(id, { note: note.trim() });
      addToast('Note added');
      setNote('');
      load();
    } catch (err) { addToast(err.message, 'error'); }
    finally { setAddingNote(false); }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    try {
      await api.cancelOrder(id, { reason: cancelReason.trim() });
      addToast('Order cancelled');
      setShowCancel(false);
      load();
    } catch (err) { addToast(err.message, 'error'); }
    finally { setCancelling(false); }
  };

  if (loading) return <div className="spinner" />;
  if (!order) return <div className="empty-state"><p className="empty-state__text">Order not found.</p></div>;

  const currentIdx = PIPELINE.indexOf(order.fulfillment_status);
  const nextStatus = currentIdx >= 0 && currentIdx < PIPELINE.length - 1 ? PIPELINE[currentIdx + 1] : null;
  const isCancelled = order.fulfillment_status === 'cancelled';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{order.reference}</h1>
          <p className="text-sm text-muted" style={{ marginTop: '.25rem' }}>
            Placed {formatDateTime(order.created_at)}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orders')}>← Orders</button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <span className={`badge ${statusBadgeClass(order.fulfillment_status)}`}>{statusLabel(order.fulfillment_status)}</span>
        <span className={`badge ${statusBadgeClass(order.payment_status)}`}>Payment: {statusLabel(order.payment_status)}</span>
      </div>

      {/* Customer info */}
      <section className="card mb-4">
        <h3 className="section-title" style={{ marginBottom: '.75rem' }}>Customer</h3>
        <p className="text-sm fw-bold">{order.customer_name}</p>
        <p className="text-sm text-muted">{order.customer_phone}</p>
        <p className="text-sm text-muted">{order.delivery_region}</p>
        <p className="text-sm text-muted">{order.delivery_address}</p>
        {order.order_note && <p className="text-sm" style={{ marginTop: '.5rem', fontStyle: 'italic', color: 'var(--text-m)' }}>"{order.order_note}"</p>}
      </section>

      {/* Items */}
      <section className="card mb-4">
        <h3 className="section-title" style={{ marginBottom: '.75rem' }}>Items</h3>
        {(order.items || []).map((item, i) => (
          <div key={i} style={{ padding: '.5rem 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div className="flex justify-between">
              <span className="text-sm">{item.product_name} x{item.quantity}</span>
              <span className="text-sm fw-bold">{formatGHS(item.subtotal)}</span>
            </div>
            <span className={`badge ${item.product_type === 'preorder' ? 'badge-primary' : 'badge-accent'}`} style={{ marginTop: '.25rem' }}>
              {item.product_type === 'preorder' ? 'Preorder' : 'In Stock'}
            </span>
            {item.batch_name && <span className="text-xs text-muted" style={{ marginLeft: '.5rem' }}>{item.batch_name}</span>}
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '.5rem', paddingTop: '.75rem' }}>
          <div className="flex justify-between text-sm text-muted"><span>Subtotal</span><span>{formatGHS(order.subtotal)}</span></div>
          <div className="flex justify-between text-sm text-muted"><span>Delivery</span><span>{formatGHS(order.delivery_fee)}</span></div>
          <div className="flex justify-between text-sm fw-bold" style={{ marginTop: '.25rem' }}><span>Total</span><span>{formatGHS(order.total)}</span></div>
        </div>
      </section>

      {/* Payment */}
      <section className="card mb-4">
        <h3 className="section-title" style={{ marginBottom: '.75rem' }}>Payment</h3>
        {order.momo_reference && <p className="text-sm">MoMo Ref: <strong>{order.momo_reference}</strong></p>}
        {!order.momo_reference && <p className="text-sm text-muted">No MoMo reference submitted yet.</p>}
        <p className="text-sm" style={{ marginTop: '.5rem' }}>
          Status: <span className={`badge ${statusBadgeClass(order.payment_status)}`}>{statusLabel(order.payment_status)}</span>
        </p>
        {order.payment_status === 'pending' && !isCancelled && (
          <button className="btn btn-accent btn-sm mt-4" onClick={handleConfirmPayment}>✓ Confirm Payment</button>
        )}
      </section>

      {/* Fulfillment timeline */}
      <section className="card mb-4">
        <h3 className="section-title" style={{ marginBottom: '.75rem' }}>Fulfillment Status</h3>
        <div className="timeline">
          {PIPELINE.map((step, i) => {
            const isDone = currentIdx >= i && !isCancelled;
            const isCurrent = currentIdx === i && !isCancelled;
            const logEntry = (order.timeline || []).find((t) => t.status === step);
            return (
              <div key={step} className="timeline-item">
                <div className={`timeline-dot ${isDone ? 'timeline-dot--done' : ''} ${isCurrent ? 'timeline-dot--current' : ''}`} />
                <div className="timeline-label">{statusLabel(step)} {isDone && !isCurrent && '✓'} {isCurrent && '⏳'}</div>
                {logEntry && <div className="timeline-date">{formatDateTime(logEntry.created_at)}</div>}
                {logEntry?.note && <div className="timeline-note">{logEntry.note}</div>}
              </div>
            );
          })}
          {isCancelled && (
            <div className="timeline-item">
              <div className="timeline-dot" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} />
              <div className="timeline-label" style={{ color: 'var(--danger)' }}>Cancelled</div>
              {order.cancelled_reason && <div className="timeline-note">Reason: {order.cancelled_reason}</div>}
            </div>
          )}
        </div>

        {/* Next action */}
        {nextStatus && !isCancelled && (
          <div style={{ marginTop: '1rem' }}>
            {nextStatus === 'shipped' && (
              <div className="form-group mb-4">
                <label className="form-label">Tracking Number (optional)</label>
                <input className="form-input" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Courier tracking ref…" />
              </div>
            )}
            <button className="btn btn-primary" onClick={handleAdvanceStatus}>
              Mark as {statusLabel(nextStatus)}
            </button>
          </div>
        )}
      </section>

      {/* Internal notes */}
      <section className="card mb-4">
        <h3 className="section-title" style={{ marginBottom: '.75rem' }}>Internal Notes</h3>
        <form onSubmit={handleAddNote} className="flex gap-2" style={{ marginBottom: '1rem' }}>
          <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a private note…" style={{ flex: 1 }} />
          <button type="submit" className="btn btn-ghost btn-sm" disabled={addingNote || !note.trim()}>Add</button>
        </form>
        {(order.admin_notes || []).map((n) => (
          <div key={n.id} style={{ padding: '.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <p className="text-sm">{n.note}</p>
            <p className="text-xs text-muted">{formatDateTime(n.created_at)}</p>
          </div>
        ))}
        {(!order.admin_notes || order.admin_notes.length === 0) && <p className="text-sm text-muted">No notes yet.</p>}
      </section>

      {/* Danger zone */}
      {!isCancelled && order.fulfillment_status !== 'delivered' && (
        <div className="danger-zone">
          <h3 className="section-title" style={{ color: 'var(--danger)', marginBottom: '.75rem' }}>Danger Zone</h3>
          <button className="btn btn-danger" onClick={() => setShowCancel(true)}>Cancel Order</button>
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <Modal title="Cancel Order" onClose={() => setShowCancel(false)}>
          <p className="text-sm text-muted mb-4">
            This will cancel <strong>{order.reference}</strong> and restore stock for any in-stock items. This cannot be undone.
          </p>
          <div className="form-group">
            <label className="form-label">Cancellation Reason (required)</label>
            <textarea className="form-textarea" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why is this order being cancelled?" />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setShowCancel(false)}>Keep Order</button>
            <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling || !cancelReason.trim()}>
              {cancelling ? 'Cancelling…' : 'Cancel Order'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
