import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatGHS } from '../utils/format';
import { HelpCircle, PartyPopper, Smartphone } from 'lucide-react';

const MOMO_NUMBER = '0244000000'; // Replace with actual business MoMo number

export default function OrderConfirmation() {
  const { state } = useLocation();
  const order = state?.order;
  const [momoRef, setMomoRef] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!order) {
    return (
      <div className="container">
        <div className="empty-state mt-8">
          <div className="empty-state__icon"><HelpCircle size={48} color="var(--text-m)" /></div>
          <p className="empty-state__title">No order found</p>
          <p className="empty-state__text">Please place an order first.</p>
          <Link to="/shop" className="btn btn-primary">Browse Shop</Link>
        </div>
      </div>
    );
  }

  const handleMomoSubmit = async (e) => {
    e.preventDefault();
    if (!momoRef.trim()) return;
    setSubmitting(true); setError('');
    try {
      await api.submitMomo(order.reference, momoRef.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 680 }}>
      {/* Success Banner */}
      <div className="confirm-banner mt-4">
        <div className="flex justify-center mb-4"><PartyPopper size={48} color="var(--success)" /></div>
        <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.5rem', fontWeight:600, marginBottom:'.5rem' }}>
          Order Placed Successfully!
        </h1>
        <p className="text-muted mb-3">Your order reference is:</p>
        <div className="confirm-ref">{order.reference}</div>
        <p className="text-sm text-muted mt-3">Screenshot or write this down — you'll need it to track your order.</p>
      </div>

      {/* Order Summary */}
      <div className="card mb-4">
        <h2 className="fw-semi mb-4" style={{ fontSize:'1rem' }}>Order Summary</h2>
        {(order.items || []).map((item, i) => (
          <div key={i} className="flex justify-between text-sm mb-2">
            <span>{item.product_name} ×{item.quantity}</span>
            <span className="fw-semi">{formatGHS(item.subtotal)}</span>
          </div>
        ))}
        <div style={{ borderTop:'1px solid var(--border)', marginTop:'1rem', paddingTop:'1rem' }}>
          <div className="flex justify-between text-sm mb-1"><span className="text-muted">Subtotal</span><span>{formatGHS(order.subtotal)}</span></div>
          <div className="flex justify-between text-sm mb-2"><span className="text-muted">Delivery</span><span>{formatGHS(order.delivery_fee)}</span></div>
          <div className="flex justify-between fw-bold text-lg"><span>Total</span><span style={{ color:'var(--brand)' }}>{formatGHS(order.total)}</span></div>
        </div>
      </div>

      {/* MoMo Payment Instructions */}
      <div className="momo-box mb-4">
        <h2 className="fw-semi mb-4 flex items-center" style={{ fontSize:'1rem' }}>
          <Smartphone size={20} style={{ marginRight: 6 }} /> How to Pay (MoMo)
        </h2>
        <div className="momo-step">
          <div className="momo-num">1</div>
          <div>
            <p className="fw-semi text-sm">Dial *170# on your phone</p>
            <p className="text-xs text-muted">Or open your MTN/Vodafone/AirtelTigo mobile money app.</p>
          </div>
        </div>
        <div className="momo-step">
          <div className="momo-num">2</div>
          <div>
            <p className="fw-semi text-sm">Send money to: <span style={{ color:'var(--brand)', fontFamily:'monospace' }}>{MOMO_NUMBER}</span></p>
            <p className="text-xs text-muted">Name: Sally Enterprise</p>
          </div>
        </div>
        <div className="momo-step">
          <div className="momo-num">3</div>
          <div>
            <p className="fw-semi text-sm">Send exactly: <span style={{ color:'var(--brand)' }}>{formatGHS(order.total)}</span></p>
            <p className="text-xs text-muted">Use your order reference <strong>{order.reference}</strong> as the payment note.</p>
          </div>
        </div>
        <div className="momo-step">
          <div className="momo-num">4</div>
          <div>
            <p className="fw-semi text-sm">Submit your MoMo transaction ID below</p>
            <p className="text-xs text-muted">This helps us confirm your payment quickly.</p>
          </div>
        </div>
      </div>

      {/* MoMo Reference Submission */}
      {!submitted ? (
        <div className="card mb-6">
          <h3 className="fw-semi mb-3" style={{ fontSize:'1rem' }}>Submit Your MoMo Transaction ID</h3>
          <form onSubmit={handleMomoSubmit} style={{ display:'flex', gap:'.75rem', flexWrap:'wrap' }}>
            <input
              className="form-input"
              style={{ flex: 1, minWidth: 200 }}
              value={momoRef}
              onChange={(e) => setMomoRef(e.target.value)}
              placeholder="e.g. 1234567890"
              required
            />
            <button type="submit" className="btn btn-accent" disabled={submitting || !momoRef.trim()}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </form>
          {error && <p className="form-error mt-2">{error}</p>}
          <p className="form-hint mt-2">You can also submit this later from the <Link to="/track" style={{ color:'var(--brand)' }}>order tracking page</Link>.</p>
        </div>
      ) : (
        <div className="card mb-6" style={{ background:'#f0fdf4', border:'1px solid #86efac' }}>
          <p className="fw-semi" style={{ color:'var(--success)' }}>✓ MoMo reference submitted! We'll confirm your payment shortly.</p>
        </div>
      )}

      <div className="flex gap-3 flex-wrap mb-8">
        <Link to="/track" className="btn btn-primary">Track My Order →</Link>
        <Link to="/shop" className="btn btn-ghost">Continue Shopping</Link>
      </div>
    </div>
  );
}
