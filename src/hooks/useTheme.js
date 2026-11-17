import { useEffect } from 'react';

const THEME_COLORS = { dark: '#0f172a', light: '#f5f7fb' };

/** Applies "dark" | "light" | "system" to <html data-theme> and the browser theme-color. */
export function useTheme(theme = 'dark') {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');

    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[resolved]);
    };

    apply();
    if (theme !== 'system') return undefined;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
