import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNavbar from './MobileNavbar';
import TimerPill from './TimerPill';

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <Sidebar />
      <main id="main" className="main" tabIndex={-1}>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <TimerPill />
      <MobileNavbar />
    </div>
  );
}
