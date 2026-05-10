import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../api/client';
import { formatGHS, GHANA_REGIONS } from '../utils/format';
import { ShoppingCart, ClipboardList, ShoppingBag } from 'lucide-react';

const DELIVERY_FEE = 20; // flat rate

export default function CartCheckout() {
  const { items, removeFromCart, updateQuantity, clearCart, subtotal } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState('cart'); // 'cart' | 'checkout'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', delivery_region: '', delivery_address: '', order_note: '',
  });

  const total = subtotal + DELIVERY_FEE;

  const handleField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        delivery_fee: DELIVERY_FEE,
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      };
      const res = await api.placeOrder(payload);
      clearCart();
      navigate('/confirmation', { state: { order: res.data } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && step === 'cart') {
    return (
      <div className="container">
        <div className="empty-state mt-8">
          <div className="empty-state__icon"><ShoppingCart size={48} color="var(--text-m)" /></div>
          <p className="empty-state__title">Your cart is empty</p>
          <p className="empty-state__text">Head over to the shop and find something you love.</p>
          <Link to="/shop" className="btn btn-primary">Browse Shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="section-title flex items-center mt-4 mb-6">
        {step === 'cart' ? <><ShoppingCart size={28} style={{ marginRight: 12 }} /> Your Cart</> : <><ClipboardList size={28} style={{ marginRight: 12 }} /> Checkout</>}
      </h1>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'2rem' }}>
        {/* Main column */}
        <div>
          {step === 'cart' && (
            <div className="card">
              {items.map((item) => {
                const img = item.images?.[0];
                return (
                  <div key={item.id} className="cart-item">
                    {img ? (
                      <img src={img} alt={item.name} className="cart-item__img" />
                    ) : (
                      <div className="cart-item__img" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <ShoppingBag size={28} color="var(--border)" />
                      </div>
                    )}
                    <div className="cart-item__body">
                      <Link to={`/products/${item.id}`} className="cart-item__name">{item.name}</Link>
                      <p className="cart-item__price">{formatGHS(item.price)} each</p>
                      <div className="cart-item__actions">
                        <div className="qty-selector" style={{ transform:'scale(.85)', transformOrigin:'left center' }}>
                          <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                          <input className="qty-input" type="number" min={1} value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)} />
                          <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                        </div>
                        <span className="text-sm fw-bold">{formatGHS(parseFloat(item.price) * item.quantity)}</span>
                        <button className="text-sm" style={{ color:'var(--danger)' }} onClick={() => removeFromCart(item.id)}>Remove</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 'checkout' && (
            <form id="checkout-form" onSubmit={handleSubmit} className="card" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <h2 className="fw-semi" style={{ fontSize:'1.125rem', marginBottom:'.25rem' }}>Delivery Details</h2>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" required value={form.customer_name} onChange={(e) => handleField('customer_name', e.target.value)} placeholder="Akwasi Mensah" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number (Ghana)</label>
                <input className="form-input" required type="tel" value={form.customer_phone} onChange={(e) => handleField('customer_phone', e.target.value)} placeholder="0244000000" />
                <span className="form-hint">We'll send your order updates via SMS to this number.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Region</label>
                <select className="form-select" required value={form.delivery_region} onChange={(e) => handleField('delivery_region', e.target.value)}>
                  <option value="">Select region…</option>
                  {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Address</label>
                <textarea className="form-textarea" required value={form.delivery_address} onChange={(e) => handleField('delivery_address', e.target.value)} placeholder="House number, street, landmark…" style={{ minHeight:80 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Order Note (optional)</label>
                <input className="form-input" value={form.order_note} onChange={(e) => handleField('order_note', e.target.value)} placeholder="Any special instructions?" />
              </div>
              {error && <p className="form-error">{error}</p>}
            </form>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <div className="card" style={{ position:'sticky', top:'calc(var(--nav-h) + 1rem)' }}>
            <h3 className="fw-semi mb-4" style={{ fontSize:'1rem' }}>Order Summary</h3>
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm mb-2">
                <span className="truncate" style={{ maxWidth:'60%' }}>{i.name} ×{i.quantity}</span>
                <span className="fw-semi">{formatGHS(parseFloat(i.price) * i.quantity)}</span>
              </div>
            ))}
            <div style={{ borderTop:'1px solid var(--border)', margin:'1rem 0', paddingTop:'1rem' }}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Subtotal</span><span>{formatGHS(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-muted">Delivery</span><span>{formatGHS(DELIVERY_FEE)}</span>
              </div>
              <div className="flex justify-between fw-bold text-lg">
                <span>Total</span><span style={{ color:'var(--brand)' }}>{formatGHS(total)}</span>
              </div>
            </div>

            {step === 'cart' ? (
              <button className="btn btn-primary btn-full mt-2" onClick={() => setStep('checkout')}>
                Proceed to Checkout →
              </button>
            ) : (
              <>
                <button type="submit" form="checkout-form" className="btn btn-primary btn-full mt-2" disabled={submitting}>
                  {submitting ? 'Placing Order…' : `Place Order — ${formatGHS(total)}`}
                </button>
                <button className="btn btn-ghost btn-full mt-2" onClick={() => setStep('cart')}>← Back to Cart</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
