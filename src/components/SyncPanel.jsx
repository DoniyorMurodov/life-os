import { useEffect, useState } from 'react';
import { useSync } from '../context/SyncContext';
import { useApp } from '../context/AppContext';
import { useToast } from './Toast';
import AuthForm from './AuthForm';
import Icon from './Icon';
import { getPushStatus, schedulePush } from '../services/push';

const STATUS_TEXT = {
  idle: 'Up to date',
  syncing: 'Syncing…',
  offline: 'Offline — will sync when back online',
  error: 'Sync failed — will retry',
};

function timeAgo(iso) {
  if (!iso) return 'never';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CloudSyncSection() {
  const { configured, ready, user, status, error, lastSyncAt, syncNow, signOut } = useSync();

  return (
    <section className="card settings-section">
      <h2 className="card-title"><Icon name="upload" size={18} /> Cloud sync</h2>
      {!configured ? (
        <p className="muted small">
          Not set up on this deployment. Once Supabase keys are added (see README → Cloud sync), sign in here to keep phone and
          computer in sync and never lose data.
        </p>
      ) : !ready ? (
        <p className="muted small">Loading…</p>
      ) : !user ? (
        <>
          <p className="muted small">Sign in to back up everything to the cloud and sync across your devices automatically.</p>
          <AuthForm />
        </>
      ) : (
        <>
          <div className="setting-row">
            <span className="setting-icon"><Icon name="user" size={18} /></span>
            <div className="setting-text">
              <p className="setting-title">{user.email}</p>
              <p className={`small ${status === 'error' ? 'form-error' : 'muted'}`}>
                {STATUS_TEXT[status]} · last sync {timeAgo(lastSyncAt)}
                {status === 'error' && error ? ` (${error})` : ''}
              </p>
            </div>
            <div className="setting-control">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => syncNow()} disabled={status === 'syncing'}>
                Sync now
              </button>
            </div>
          </div>
          <button type="button" className="btn btn-danger-ghost" onClick={signOut}>Sign out</button>
        </>
      )}
    </section>
  );
}

const PUSH_TEXT = {
  unsupported: 'This browser does not support background notifications. On iPhone: install the app to the Home Screen (iOS 16.4+).',
  not_configured: 'Not set up on this deployment yet (see README → Background notifications). Alerts work while the app is open.',
  blocked: 'Notifications are blocked — allow them in browser / phone settings.',
  needs_permission: 'Allow notifications so the timer can alert you when the app is closed.',
  ready: 'Active — you get an alert when the timer ends, even if the app is closed.',
};

export function BackgroundAlertsRow() {
  const { settings } = useApp();
  const toast = useToast();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let alive = true;
    getPushStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, [settings.notifications]);

  const test = async () => {
    const id = await schedulePush({
      fireAt: Date.now() + 10000,
      title: 'Life OS test',
      body: 'Background notifications work 🎉',
      accessCode: settings.aiAccessCode,
    });
    if (id) toast('Test scheduled — close the app now; it arrives in ~10 s.', { type: 'info' });
    else toast('Could not schedule the test notification.', { type: 'error' });
    return id;
  };

  return (
    <div className="setting-row">
      <span className="setting-icon"><Icon name="bell" size={18} /></span>
      <div className="setting-text">
        <p className="setting-title">Background alerts</p>
        <p className="muted small">{status ? PUSH_TEXT[status] : 'Checking…'}</p>
      </div>
      {status === 'needs_permission' && (
        <div className="setting-control">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={async () => {
              await Notification.requestPermission().catch(() => {});
              setStatus(await getPushStatus());
            }}
          >
            Allow
          </button>
        </div>
      )}
      {status === 'ready' && settings.notifications && (
        <div className="setting-control">
          <button type="button" className="btn btn-ghost btn-sm" onClick={test}>Test</button>
        </div>
      )}
    </div>
  );
}
