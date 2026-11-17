import { Link, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { useTheme } from './hooks/useTheme';
import Layout from './components/Layout';
import EmptyState from './components/EmptyState';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import Schedule from './pages/Schedule';
import Study from './pages/Study';
import Focus from './pages/Focus';
import Money from './pages/Money';
import Notes from './pages/Notes';
import Goals from './pages/Goals';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';

function NotFound() {
  return (
    <EmptyState
      icon="alert"
      title="Page not found"
      description="This page doesn't exist."
      action={<Link to="/" className="btn btn-primary">Go home</Link>}
    />
  );
}

export default function App() {
  const { settings } = useApp();
  useTheme(settings.theme);

  if (!settings.onboarded) return <Onboarding />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="study" element={<Study />} />
        <Route path="focus" element={<Focus />} />
        <Route path="money" element={<Money />} />
        <Route path="notes" element={<Notes />} />
        <Route path="goals" element={<Goals />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
