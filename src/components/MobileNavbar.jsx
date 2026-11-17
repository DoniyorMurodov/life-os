import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MOBILE_MORE, MOBILE_PRIMARY } from '../data/navigation';
import Icon from './Icon';

export default function MobileNavbar() {
  const { pathname } = useLocation();
  // The sheet remembers the route it was opened on, so any navigation closes it automatically.
  const [openedAt, setOpenedAt] = useState(null);
  const open = openedAt === pathname;
  const setOpen = (value) => setOpenedAt((current) => {
    const next = typeof value === 'function' ? value(current === pathname) : value;
    return next ? pathname : null;
  });
  const moreActive = MOBILE_MORE.some((item) => pathname.startsWith(item.to));

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpenedAt(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div className="more-backdrop" onClick={() => setOpen(false)}>
          <div
            className="more-sheet"
            id="more-menu"
            role="dialog"
            aria-modal="true"
            aria-label="More pages"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" aria-hidden="true" />
            <div className="more-grid">
              {MOBILE_MORE.map((item) => (
                <NavLink key={item.to} to={item.to} className="more-link">
                  <span className="more-link-icon"><Icon name={item.icon} size={22} /></span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-nav" aria-label="Main navigation">
        {MOBILE_PRIMARY.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="mobile-nav-link">
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`mobile-nav-link ${moreActive || open ? 'active' : ''}`}
          aria-expanded={open}
          aria-controls="more-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'x' : 'more'} size={22} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
