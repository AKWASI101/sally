import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();
  const fileRef = useRef();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);

  const [form, setForm] = useState({
    name: '', description: '', category: 'other', type: 'in_stock',
    price: '', stock_quantity: '', batch_id: '', is_featured: false,
  });



  const populateForm = (p) => {
    setForm({
      name: p.name || '', description: p.description || '', category: p.category || 'other',
      type: p.type || 'in_stock', price: p.price || '', stock_quantity: p.stock_quantity || '',
      batch_id: p.batch_id || '', is_featured: p.is_featured || false,
    });
    setExistingImages(p.images || []);
  };

  useEffect(() => {
    api.listBatches().then((r) => setBatches(r.data || [])).catch(() => {});

    const fetchProduct = async () => {
      setLoading(true);
      try {
        // Use a workaround: fetch multiple pages or just get the product from the products list
        // Since we don't have a GET /products/:id endpoint, we do a filtered list
        const res = await api.listProducts({ page: 1, limit: 100 });
        const product = res.data.find((p) => p.id === id);
        if (!product) {
          // Try archived
          const res2 = await api.listProducts({ page: 1, limit: 100, status: 'archived' });
          const p2 = res2.data.find((p) => p.id === id);
          if (p2) populateForm(p2);
          else { addToast('Product not found', 'error'); navigate('/products'); }
        } else {
          populateForm(product);
        }
      } catch (err) { addToast(err.message, 'error'); }
      finally { setLoading(false); }
    };

    if (isEdit) {
      fetchProduct();
    }
  }, [id, isEdit, addToast, navigate]);



  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const total = existingImages.length + newFiles.length + files.length;
    if (total > 5) { addToast('Maximum 5 images allowed', 'error'); return; }
    setNewFiles((f) => [...f, ...files]);
  };

  const removeExisting = (idx) => setExistingImages((imgs) => imgs.filter((_, i) => i !== idx));
  const removeNew = (idx) => setNewFiles((files) => files.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('type', form.type);
      fd.append('price', form.price);
      fd.append('is_featured', form.is_featured);

      if (form.type === 'in_stock') fd.append('stock_quantity', form.stock_quantity);
      if (form.type === 'preorder') fd.append('batch_id', form.batch_id);

      if (isEdit) {
        fd.append('existing_images', JSON.stringify(existingImages));
      }
      newFiles.forEach((f) => fd.append('images', f));

      if (isEdit) {
        await api.updateProduct(id, fd);
        addToast('Product updated');
      } else {
        await api.createProduct(fd);
        addToast('Product created');
      }
      navigate('/products');
    } catch (err) { addToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="spinner" />;

  const openBatches = batches.filter((b) => b.status === 'open');
  const totalImages = existingImages.length + newFiles.length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Product' : 'New Product'}</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products')}>← Products</button>
      </div>

      <form onSubmit={handleSubmit} className="flex-col gap-4" style={{ display: 'flex' }}>
        <div className="form-group">
          <label className="form-label">Product Name</label>
          <input className="form-input" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required placeholder="e.g. Vitamin C Serum" />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" value={form.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Product description…" />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={(e) => handleChange('category', e.target.value)}>
            <option value="beauty_skincare">Beauty & Skincare</option>
            <option value="fashion_clothing">Fashion & Clothing</option>
            <option value="electronics_gadgets">Electronics & Gadgets</option>
            <option value="home_kitchen">Home & Kitchen</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Type</label>
          <div className="radio-group">
            <label className="radio-label">
              <input type="radio" name="type" value="in_stock" checked={form.type === 'in_stock'} onChange={(e) => handleChange('type', e.target.value)} />
              In Stock
            </label>
            <label className="radio-label">
              <input type="radio" name="type" value="preorder" checked={form.type === 'preorder'} onChange={(e) => handleChange('type', e.target.value)} />
              Preorder
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Price (GHS)</label>
          <input className="form-input" type="number" step="0.01" min="0.01" value={form.price} onChange={(e) => handleChange('price', e.target.value)} required placeholder="85.00" />
        </div>

        {form.type === 'in_stock' && (
          <div className="form-group">
            <label className="form-label">Stock Quantity</label>
            <input className="form-input" type="number" min="0" value={form.stock_quantity} onChange={(e) => handleChange('stock_quantity', e.target.value)} required placeholder="10" />
          </div>
        )}

        {form.type === 'preorder' && (
          <div className="form-group">
            <label className="form-label">Linked Batch</label>
            <select className="form-select" value={form.batch_id} onChange={(e) => handleChange('batch_id', e.target.value)} required>
              <option value="">Select a batch…</option>
              {openBatches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {/* Images */}
        <div className="form-group">
          <label className="form-label">Images (up to 5)</label>
          <div className="image-upload-grid">
            {existingImages.map((src, i) => (
              <div key={`ex-${i}`} className="image-upload-slot">
                <img src={src} alt="" />
                <button type="button" className="remove-btn" onClick={() => removeExisting(i)}>✕</button>
              </div>
            ))}
            {newFiles.map((f, i) => (
              <div key={`new-${i}`} className="image-upload-slot">
                <img src={URL.createObjectURL(f)} alt="" />
                <button type="button" className="remove-btn" onClick={() => removeNew(i)}>✕</button>
              </div>
            ))}
            {totalImages < 5 && (
              <div className="image-upload-slot" onClick={() => fileRef.current?.click()}>
                <span style={{ fontSize: '1.5rem', color: 'var(--text-d)' }}>+</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFileSelect} />
        </div>

        <label className="checkbox-wrapper">
          <input type="checkbox" checked={form.is_featured} onChange={(e) => handleChange('is_featured', e.target.checked)} />
          <span className="text-sm">Mark as Featured (homepage display)</span>
        </label>

        <div className="flex gap-3 mt-4">
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/products')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
