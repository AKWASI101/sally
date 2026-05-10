import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import { Ship, Package, ShoppingBag } from 'lucide-react';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'beauty_skincare', label: 'Beauty & Skincare' },
  { value: 'fashion_clothing', label: 'Fashion & Clothing' },
  { value: 'electronics_gadgets', label: 'Electronics & Gadgets' },
  { value: 'home_kitchen', label: 'Home & Kitchen' },
  { value: 'other', label: 'Other' },
];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const type = searchParams.get('type') || '';
  const category = searchParams.get('category') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const load = useCallback(async (opts = {}) => {
    const isMore = opts.more;
    isMore ? setLoadingMore(true) : setLoading(true);
    try {
      const params = { limit: 20, page: isMore ? page + 1 : page };
      if (type) params.type = type;
      if (category) params.category = category;
      const res = await api.listProducts(params);
      if (isMore) {
        setProducts((prev) => [...prev, ...res.data]);
      } else {
        setProducts(res.data);
      }
      setPagination(res.pagination);
      if (isMore) setSearchParams((p) => { p.set('page', String(page + 1)); return p; });
    } catch (e) {
      console.error(e);
    } finally {
      isMore ? setLoadingMore(false) : setLoading(false);
    }
  }, [type, category, page]);

  useEffect(() => {
    setProducts([]);
    load();
  }, [type, category]);

  const setFilter = (key, val) => {
    setSearchParams((prev) => {
      if (val) prev.set(key, val); else prev.delete(key);
      prev.delete('page');
      return prev;
    });
  };

  return (
    <div className="container">
      <div className="section-header mt-4">
        <h1 className="section-title">Shop</h1>
        <p className="section-subtitle">{pagination.total} products available</p>
      </div>

      {/* Filters */}
      <div className="filter-bar mb-6">
        <button
          className={`filter-chip ${!type ? 'active' : ''}`}
          onClick={() => setFilter('type', '')}
        >All</button>
        <button
          className={`filter-chip flex items-center ${type === 'preorder' ? 'active' : ''}`}
          onClick={() => setFilter('type', 'preorder')}
        ><Ship size={14} style={{ marginRight: 4 }} /> Preorders</button>
        <button
          className={`filter-chip flex items-center ${type === 'in_stock' ? 'active' : ''}`}
          onClick={() => setFilter('type', 'in_stock')}
        ><Package size={14} style={{ marginRight: 4 }} /> In Stock</button>

        <select
          className="form-select"
          style={{ width:'auto' }}
          value={category}
          onChange={(e) => setFilter('category', e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><ShoppingBag size={48} color="var(--text-m)" /></div>
          <p className="empty-state__title">No products found</p>
          <p className="empty-state__text">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>

          {pagination.page < pagination.pages && (
            <div className="text-center mt-8">
              <button
                className="btn btn-outline"
                onClick={() => load({ more: true })}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load More Products'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
