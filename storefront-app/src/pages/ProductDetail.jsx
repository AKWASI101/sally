import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { formatGHS, categoryLabel, formatDate } from '../utils/format';
import { useCart } from '../context/CartContext';
import { ShoppingBag, AlertTriangle, Package, Check, XIcon } from 'lucide-react';

function useCountdown(deadline) {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    if (!deadline) return;
    const calc = () => {
      const diff = new Date(deadline) - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return timeLeft;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainImg, setMainImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const countdown = useCountdown(product?.type === 'preorder' ? product?.order_deadline : null);

  useEffect(() => {
    api.getProduct(id)
      .then((res) => setProduct(res.data))
      .catch(() => navigate('/shop'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container"><div className="spinner-wrap"><div className="spinner" /></div></div>;
  if (!product) return null;

  const imgs = product.images || [];
  const isSoldOut = product.type === 'in_stock' && product.stock_quantity === 0;
  const isDeadlinePassed = countdown === null && product.type === 'preorder';
  const canAdd = !isSoldOut && !isDeadlinePassed;
  const maxQty = product.type === 'in_stock' ? product.stock_quantity : 99;

  const handleAddToCart = () => {
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="container mt-4">
      <button className="btn btn-ghost btn-sm mb-6" onClick={() => navigate(-1)}>← Back</button>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'2rem' }}>
        {/* Image Gallery */}
        <div className="gallery">
          <div className="gallery__main">
            {imgs.length > 0 ? (
              <img src={imgs[mainImg]} alt={product.name} />
            ) : (
              <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--surface-2)' }}>
                <ShoppingBag size={80} color="var(--border)" />
              </div>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="gallery__thumbs">
              {imgs.map((src, i) => (
                <div key={i} className={`gallery__thumb ${mainImg === i ? 'active' : ''}`} onClick={() => setMainImg(i)}>
                  <img src={src} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <div className="flex gap-2 flex-wrap mb-3">
            <span className={`badge ${product.type === 'preorder' ? 'badge-brand' : 'badge-accent'}`}>
              {product.type === 'preorder' ? 'Preorder' : 'In Stock'}
            </span>
            {product.is_featured && <span className="badge badge-accent">★ Featured</span>}
            <span className="badge badge-muted">{categoryLabel(product.category)}</span>
          </div>

          <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'clamp(1.5rem,4vw,2rem)', fontWeight:600, lineHeight:1.25, marginBottom:'.75rem' }}>
            {product.name}
          </h1>

          <p style={{ fontSize:'2rem', fontWeight:800, color:'var(--brand)', marginBottom:'1.25rem' }}>
            {formatGHS(product.price)}
          </p>

          {product.description && (
            <p style={{ color:'var(--text-m)', lineHeight:1.75, marginBottom:'1.5rem' }}>
              {product.description}
            </p>
          )}

          {/* Batch / Preorder info */}
          {product.type === 'preorder' && product.batch_name && (
            <div style={{ background:'var(--brand-light)', borderRadius:'var(--r-md)', padding:'1rem', marginBottom:'1.5rem' }}>
              <p className="text-sm fw-semi mb-2 flex items-center" style={{ color:'var(--brand-dark)' }}>
                <Package size={16} style={{ marginRight: 6 }} /> Batch: {product.batch_name}
              </p>
              {countdown && (
                <>
                  <p className="text-xs text-muted mb-2">Order deadline: {formatDate(product.order_deadline)}</p>
                  <div className="countdown">
                    {[['d','Days'],['h','Hours'],['m','Mins'],['s','Secs']].map(([k,l]) => (
                      <div key={k} className="countdown-unit">
                        <span className="countdown-unit__num">{String(countdown[k]).padStart(2,'0')}</span>
                        <span className="countdown-unit__label">{l}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {isDeadlinePassed && (
                <p className="text-sm flex items-center" style={{ color:'var(--danger)', fontWeight:600 }}>
                  <AlertTriangle size={16} style={{ marginRight: 6 }} /> Preorder deadline has passed.
                </p>
              )}
              {product.estimated_arrival && <p className="text-xs text-muted mt-2">Est. arrival: {formatDate(product.estimated_arrival)}</p>}
            </div>
          )}

          {/* In-stock info */}
          {product.type === 'in_stock' && (
            <p className="text-sm mb-4 flex items-center" style={{ color: product.stock_quantity > 0 ? 'var(--success)' : 'var(--danger)', fontWeight:600 }}>
              {product.stock_quantity > 0 ? (
                <><Check size={16} style={{ marginRight: 4 }} /> In Stock ({product.stock_quantity} left)</>
              ) : (
                <><XIcon size={16} style={{ marginRight: 4 }} /> Out of Stock</>
              )}
            </p>
          )}

          {/* Quantity + Add to Cart */}
          {canAdd && (
            <div className="flex items-center gap-4 flex-wrap mb-4">
              <div className="qty-selector">
                <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q-1))} disabled={qty <= 1}>−</button>
                <input
                  className="qty-input"
                  type="number"
                  min={1}
                  max={maxQty}
                  value={qty}
                  onChange={(e) => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                />
                <button className="qty-btn" onClick={() => setQty(q => Math.min(maxQty, q+1))} disabled={qty >= maxQty}>+</button>
              </div>
              <p className="text-sm text-muted">× {formatGHS(product.price)} = <strong>{formatGHS(parseFloat(product.price) * qty)}</strong></p>
            </div>
          )}

          <button
            className={`btn btn-lg w-full ${canAdd ? 'btn-primary' : 'btn-ghost'}`}
            onClick={handleAddToCart}
            disabled={!canAdd}
          >
            {added ? '✓ Added to Cart!' : isSoldOut ? 'Sold Out' : isDeadlinePassed ? 'Preorder Closed' : `Add to Cart — ${formatGHS(parseFloat(product.price) * qty)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
