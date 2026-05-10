import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatGHS, formatDate, daysUntil, statusBadgeClass, statusLabel } from '../utils/format';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const { addToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listBatches();
      setBatches(res.data || []);
    } catch (err) { addToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Batches</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Batch</button>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="list-stack">
          {batches.map((b) => {
            const days = daysUntil(b.order_deadline);
            return (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '.5rem' }}>
                  <strong style={{ fontSize: '.875rem' }}>{b.name}</strong>
                  <span className={`badge ${statusBadgeClass(b.status)}`}>{statusLabel(b.status)}</span>
                </div>
                <p className="text-sm text-muted">
                  Deadline: {formatDate(b.order_deadline)}
                  {b.status === 'open' && days !== null && ` · ⏱ ${days}d left`}
                </p>
                <p className="text-sm text-muted">Arrival: {formatDate(b.estimated_arrival)}</p>
                <p className="text-sm text-muted">{b.order_count} orders · {formatGHS(b.total_value)}</p>
                <div className="flex gap-2 flex-wrap" style={{ marginTop: '.75rem' }}>
                  <Link to={`/batches/${b.id}`} className="btn btn-ghost btn-sm">View Orders</Link>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditTarget(b)}>Edit</button>
                  {b.status === 'open' && (
                    <CloseBatchBtn batchId={b.id} onDone={load} />
                  )}
                </div>
              </div>
            );
          })}
          {batches.length === 0 && (
            <div className="empty-state">
              <div className="empty-state__icon">🚢</div>
              <p className="empty-state__text">No batches yet.</p>
            </div>
          )}
        </div>
      )}

      {showCreate && <BatchFormModal onClose={() => setShowCreate(false)} onSaved={load} />}
      {editTarget && <BatchFormModal batch={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />}
    </div>
  );
}

function CloseBatchBtn({ batchId, onDone }) {
  const [confirm, setConfirm] = useState(false);
  const { addToast } = useToast();

  const handleClose = async () => {
    try {
      await api.updateBatch(batchId, { status: 'closed' });
      addToast('Batch closed');
      setConfirm(false);
      onDone();
    } catch (err) { addToast(err.message, 'error'); }
  };

  if (!confirm) return <button className="btn btn-sm" style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }} onClick={() => setConfirm(true)}>Close Batch</button>;

  return (
    <Modal title="Close Batch?" onClose={() => setConfirm(false)}>
      <p className="text-sm text-muted">This will deactivate all preorder products linked to this batch. This action cannot be undone.</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
        <button className="btn btn-danger" onClick={handleClose}>Close Batch</button>
      </div>
    </Modal>
  );
}

function BatchFormModal({ batch, onClose, onSaved }) {
  const isEdit = !!batch;
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: batch?.name || '',
    order_deadline: batch?.order_deadline?.slice(0, 10) || '',
    estimated_arrival: batch?.estimated_arrival?.slice(0, 10) || '',
    notes: batch?.notes || '',
    status: batch?.status || 'open',
  });

  const handleChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateBatch(batch.id, form);
        addToast('Batch updated');
      } else {
        await api.createBatch(form);
        addToast('Batch created');
      }
      onClose();
      onSaved();
    } catch (err) { addToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? 'Edit Batch' : 'New Batch'} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Batch Name</label>
          <input className="form-input" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required placeholder="e.g. May 2026 Shipment" />
        </div>
        <div className="form-group">
          <label className="form-label">Order Deadline</label>
          <input className="form-input" type="date" value={form.order_deadline} onChange={(e) => handleChange('order_deadline', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Estimated Arrival</label>
          <input className="form-input" type="date" value={form.estimated_arrival} onChange={(e) => handleChange('estimated_arrival', e.target.value)} required />
        </div>
        {isEdit && (
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="shipped">Shipped</option>
              <option value="arrived">Arrived</option>
              <option value="fulfilled">Fulfilled</option>
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea className="form-textarea" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Internal notes…" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
