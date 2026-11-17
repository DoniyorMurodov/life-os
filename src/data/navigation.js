export const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/tasks', label: 'Tasks', icon: 'tasks' },
  { to: '/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/study', label: 'Study', icon: 'book' },
  { to: '/focus', label: 'Focus', icon: 'timer' },
  { to: '/money', label: 'Money', icon: 'wallet' },
  { to: '/notes', label: 'Notes', icon: 'note' },
  { to: '/goals', label: 'Goals', icon: 'target' },
  { to: '/statistics', label: 'Statistics', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

/** First 3 go to the mobile bottom bar; the rest live under "More". */
export const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 3);
export const MOBILE_MORE = NAV_ITEMS.slice(3);
