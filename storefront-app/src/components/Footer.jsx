import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__brand">Sally</div>
        <p className="footer__tagline">Ghana's premium preorder & in-stock shopping experience.</p>

        <div className="footer__grid">
          <div>
            <div className="footer__col-title">About</div>
            <p style={{ fontSize: '.875rem', lineHeight: 1.7 }}>
              Sally brings you curated beauty, fashion, and lifestyle products — shipped directly to your door across Ghana.
            </p>
          </div>
          <div>
            <div className="footer__col-title">Shop</div>
            <Link to="/shop" className="footer__link">All Products</Link>
            <Link to="/shop?type=preorder" className="footer__link">Preorders</Link>
            <Link to="/shop?type=in_stock" className="footer__link">In Stock</Link>
          </div>
          <div>
            <div className="footer__col-title">Help</div>
            <Link to="/track" className="footer__link">Track Order</Link>
          </div>
        </div>

        <div className="footer__bottom">
          © {new Date().getFullYear()} Sally. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
