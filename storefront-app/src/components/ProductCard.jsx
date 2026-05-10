import { Link } from 'react-router-dom';
import { formatGHS, categoryLabel } from '../utils/format';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Star } from 'lucide-react';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const img = product.images?.[0];
  const isPreorder = product.type === 'preorder';
  const isSoldOut = !isPreorder && product.stock_quantity === 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSoldOut) addToCart(product, 1);
  };

  return (
    <Link to={`/products/${product.id}`} className="product-card">
      {img ? (
        <img src={img} alt={product.name} className="product-card__img" loading="lazy" />
      ) : (
        <div className="product-card__img-placeholder">
          <ShoppingBag size={48} color="rgba(124,58,237,.4)" />
        </div>
      )}

      <div className="product-card__body">
        <div className="flex gap-2 flex-wrap">
          <span className={`badge ${isPreorder ? 'badge-brand' : 'badge-accent'}`}>
            {isPreorder ? 'Preorder' : 'In Stock'}
          </span>
          {product.is_featured && (
            <span className="badge badge-accent flex items-center gap-1">
              <Star size={12} fill="currentColor" /> Featured
            </span>
          )}
          {isSoldOut && <span className="badge badge-danger">Sold Out</span>}
        </div>
        <p className="product-card__name">{product.name}</p>
        <p className="text-xs text-muted">{categoryLabel(product.category)}</p>
        <p className="product-card__price">{formatGHS(product.price)}</p>
      </div>

      <div className="product-card__footer">
        <button
          className={`btn btn-sm w-full ${isSoldOut ? 'btn-ghost' : 'btn-primary'}`}
          onClick={handleAdd}
          disabled={isSoldOut}
        >
          {isSoldOut ? 'Sold Out' : isPreorder ? 'Add Preorder' : 'Add to Cart'}
        </button>
      </div>
    </Link>
  );
}
