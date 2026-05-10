import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatGHS, categoryLabel } from '../utils/format';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ type: '', category: '', status: 'active', page: 1 });
  const [loading, setLoading] = useState(true);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const { addToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      params.page = filters.page;
      const res = await api.listProducts(params);
      setProducts(res.data);
      setPagination(res.pagination);
    } catch (err) { addToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await api.archiveProduct(archiveTarget.id);
      addToast('Product archived');
      setArchiveTarget(null);
      load();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val, page: 1 }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <Link to="/products/new" className="btn btn-primary">+ Add Product</Link>
      </div>

      <div className="filter-bar">
        <select className="form-select" value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
          <option value="">All Types</option>
          <option value="preorder">Preorder</option>
          <option value="in_stock">In Stock</option>
        </select>
        <select className="form-select" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
          <option value="">All Categories</option>
          <option value="beauty_skincare">Beauty & Skincare</option>
          <option value="fashion_clothing">Fashion & Clothing</option>
          <option value="electronics_gadgets">Electronics & Gadgets</option>
          <option value="home_kitchen">Home & Kitchen</option>
          <option value="other">Other</option>
        </select>
        <select className="form-select" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          <p className="text-sm text-muted mb-4">{pagination.total} product{pagination.total !== 1 ? 's' : ''} found</p>
          <div className="list-stack">
            {products.map((p) => {
              const img = p.images && p.images.length > 0 ? p.images[0] : null;
              return (
                <div key={p.id} className="card">
                  <div className="flex gap-3">
                    {img ? (
                      <img src={img} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--r-md)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 64, height: 64, background: 'var(--surface-3)', borderRadius: 'var(--r-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📦</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <strong className="truncate" style={{ fontSize: '.875rem' }}>{p.name}</strong>
                        <span className={`badge ${p.type === 'preorder' ? 'badge-primary' : 'badge-accent'}`}>
                          {p.type === 'preorder' ? 'Preorder' : 'In Stock'}
                        </span>
                      </div>
                      <p className="text-sm text-muted">
                        {categoryLabel(p.category)} · {formatGHS(p.price)}
                        {p.type === 'in_stock' && ` · ${p.stock_quantity} units`}
                      </p>
                      {p.batch_name && <p className="text-xs text-muted">Batch: {p.batch_name}</p>}
                      {p.is_featured && <span className="text-xs" style={{ color: 'var(--warn)' }}>★ Featured</span>}
                      <div className="flex gap-2" style={{ marginTop: '.5rem' }}>
                        <Link to={`/products/${p.id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
                        {p.is_active && <button className="btn btn-sm" style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }} onClick={() => setArchiveTarget(p)}>Archive</button>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {products.length === 0 && (
              <div className="empty-state">
                <div className="empty-state__icon">📦</div>
                <p className="empty-state__text">No products found.</p>
              </div>
            )}
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
        </>
      )}

      {archiveTarget && (
        <Modal title="Archive Product?" onClose={() => setArchiveTarget(null)}>
          <p className="text-sm text-muted">
            Are you sure you want to archive <strong>{archiveTarget.name}</strong>? It will be hidden from the public storefront.
          </p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setArchiveTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleArchive}>Archive</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
