
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">King Sally Imports</Link>

        <div className="navbar__links">
          <NavLink to="/" end className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}>Home</NavLink>
          <NavLink to="/shop" className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}>Shop</NavLink>
          <NavLink to="/track" className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}>Track Order</NavLink>
        </div>

        <button className="cart-btn" onClick={() => navigate('/cart')} aria-label="View cart">
          <ShoppingCart size={18} /> Cart
          {totalItems > 0 && <span className="cart-badge">{totalItems > 99 ? '99+' : totalItems}</span>}
        </button>
      </div>
    </nav>
  );
}
