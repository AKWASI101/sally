import { Outlet, ScrollRestoration } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="page-wrap">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </>
  );
}
