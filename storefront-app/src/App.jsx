import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import CartCheckout from './pages/CartCheckout';
import OrderConfirmation from './pages/OrderConfirmation';
import TrackOrder from './pages/TrackOrder';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true,            element: <Home /> },
      { path: 'shop',           element: <Shop /> },
      { path: 'products/:id',   element: <ProductDetail /> },
      { path: 'cart',           element: <CartCheckout /> },
      { path: 'confirmation',   element: <OrderConfirmation /> },
      { path: 'track',          element: <TrackOrder /> },
    ],
  },
]);

export default function App() {
  return (
    <CartProvider>
      <RouterProvider router={router} />
    </CartProvider>
  );
}
