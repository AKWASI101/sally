import { Outlet, ScrollRestoration, NavLink, useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, MapPin, ShoppingCart } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useCart } from '../context/CartContext';

export default function Layout() {
  const { totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <main className="page-wrap">
        <Outlet />
      </main>
      <Footer />

      {/* Mobile bottom tab bar — hidden on desktop via CSS */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavLink to="/" end className={({ isActive }) => `mobile-nav__item${isActive ? ' active' : ''}`}>
          <Home size={22} />
          Home
        </NavLink>

        <NavLink to="/shop" className={({ isActive }) => `mobile-nav__item${isActive ? ' active' : ''}`}>
          <ShoppingBag size={22} />
          Shop
        </NavLink>

        <NavLink to="/track" className={({ isActive }) => `mobile-nav__item${isActive ? ' active' : ''}`}>
          <MapPin size={22} />
          Track
        </NavLink>

        <button
          className={`mobile-nav__item${location.pathname === '/cart' ? ' active' : ''}`}
          onClick={() => navigate('/cart')}
          aria-label="Cart"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', position: 'relative' }}
        >
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="cart-badge" style={{ top: -8, right: -8 }}>
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </span>
          Cart
        </button>
      </nav>

      <ScrollRestoration />
    </>
  );
}
