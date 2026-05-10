import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { formatDate } from '../utils/format';
import ProductCard from '../components/ProductCard';
import { Sparkles, Ship, Star, ShoppingBag, Lock, Smartphone, Truck, MessageCircle } from 'lucide-react';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.listProducts({ featured: 'true', limit: 8 }),
      api.getBatches(),
    ])
      .then(([prodRes, batchRes]) => {
        setFeatured(prodRes.data || []);
        setBatches(batchRes.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div style={{ position:'absolute', width:400, height:400, top:-80, right:-80, borderRadius:'50%', background:'white', opacity:.05 }} />
        <div style={{ position:'absolute', width:200, height:200, bottom:-40, left:'30%', borderRadius:'50%', background:'white', opacity:.06 }} />
        <div className="container">
          <div className="hero__content">
            <div className="hero__eyebrow"><Sparkles size={14} /> Ghana's #1 Preorder Platform</div>
            <h1 className="hero__title">
              Shop Premium Products, <em>Delivered</em> to Your Door
            </h1>
            <p className="hero__subtitle">
              Browse exclusive preorders and in-stock items. Place your order, send your MoMo, and we handle the rest.
            </p>
            <div className="hero__actions">
              <Link to="/shop" className="btn btn-accent btn-lg">Browse Shop →</Link>
              <Link to="/track" className="btn btn-lg" style={{ background:'rgba(255,255,255,.15)', color:'#fff', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,.3)' }}>Track My Order</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Open Batches */}
      {batches.length > 0 && (
        <section className="section-sm" style={{ background: '#f5f3ff' }}>
          <div className="container">
            <div className="section-header">
              <h2 className="section-title flex items-center gap-2"><Ship size={28} className="text-brand" /> Open Preorder Batches</h2>
              <p className="section-subtitle">Order before the deadline — we ship directly from source.</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
              {batches.map((b) => (
                <div key={b.id} className="batch-banner" onClick={() => navigate(`/shop?type=preorder`)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge badge-brand">Open</span>
                    <span className="text-xs text-muted">{b.product_count} items</span>
                  </div>
                  <h3 className="fw-semi" style={{ fontSize:'1rem', marginBottom:'.4rem' }}>{b.name}</h3>
                  <p className="text-sm text-muted">Order deadline: <strong>{formatDate(b.order_deadline)}</strong></p>
                  <p className="text-sm text-muted">Est. arrival: {formatDate(b.estimated_arrival)}</p>
                  <p className="text-sm" style={{ color:'var(--brand)', fontWeight:600, marginTop:'.75rem' }}>Shop this batch →</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="section">
        <div className="container">
          <div className="section-header flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="section-title flex items-center gap-2"><Star size={28} className="text-brand" /> Featured Products</h2>
              <p className="section-subtitle">Handpicked items you'll love</p>
            </div>
            <Link to="/shop" className="btn btn-outline btn-sm">View All →</Link>
          </div>
          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : featured.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon"><ShoppingBag size={48} color="var(--text-m)" /></div>
              <p className="empty-state__title">Coming Soon</p>
              <p className="empty-state__text">Our featured products are being curated. Check back soon!</p>
            </div>
          ) : (
            <div className="product-grid">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Trust Banner */}
      <section className="section-sm" style={{ background:'var(--brand)', color:'#fff' }}>
        <div className="container">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'2rem', textAlign:'center' }}>
            {[
              { icon: <Lock size={32} />, title:'Secure Orders', text:'Every order protected with a unique reference' },
              { icon: <Smartphone size={32} />, title:'MoMo Payments', text:"Easy mobile money payment — Ghana's way" },
              { icon: <Truck size={32} />, title:'Nationwide Delivery', text:'We deliver to all 16 regions of Ghana' },
              { icon: <MessageCircle size={32} />, title:'SMS Updates', text:'Get notified at every step of your order' },
            ].map((item) => (
              <div key={item.title}>
                <div className="flex justify-center" style={{ marginBottom:'.5rem' }}>{item.icon}</div>
                <div style={{ fontWeight:700, marginBottom:'.25rem' }}>{item.title}</div>
                <div style={{ fontSize:'.875rem', opacity:.85 }}>{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
