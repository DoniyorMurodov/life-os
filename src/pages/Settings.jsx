import { useEffect, useRef, useState } from 'react';
import { exportBackup } from '../components/BackupBanner';
import { BackgroundAlertsRow, CloudSyncSection } from '../components/SyncPanel';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Segmented from '../components/Segmented';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { CURRENCIES } from '../data/defaultData';
import { importAllData, requestPersistentStorage, resetAllData } from '../utils/storage';
import { relativeDay, toDateKey } from '../utils/date';

function SettingRow({ icon, title, description, children }) {
  return (
    <div className="setting-row">
      <span className="setting-icon"><Icon name={icon} size={18} /></span>
      <div className="setting-text">
        <p className="setting-title">{title}</p>
        {description && <p className="muted small">{description}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { settings, updateSettings } = useApp();
  const toast = useToast();
  const { canInstall, installed, install } = useInstallPrompt();
  const [name, setName] = useState(settings.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const [accessCode, setAccessCode] = useState(settings.aiAccessCode || '');
  const [persisted, setPersisted] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    let alive = true;
    requestPersistentStorage().then((ok) => alive && setPersisted(ok));
    return () => {
      alive = false;
    };
  }, []);

  const saveAccessCode = (e) => {
    e.preventDefault();
    updateSettings({ aiAccessCode: accessCode.trim() });
    toast('AI access code saved');
  };

  const saveName = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast('Name cannot be empty', { type: 'error' });
    updateSettings({ name: trimmed.slice(0, 40) });
    toast('Name updated');
  };

  const toggleNotifications = async () => {
    const next = !settings.notifications;
    if (next && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
    updateSettings({ notifications: next });
    if (next && 'Notification' in window && Notification.permission === 'denied') {
      toast('System notifications are blocked in browser settings. In-app alerts will still show.', { type: 'info' });
    }
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      importAllData(json);
      toast('Data imported — reloading…');
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      toast(error instanceof SyntaxError ? 'Invalid JSON file.' : error.message, { type: 'error' });
    }
  };

  const doReset = () => {
    resetAllData();
    window.location.reload();
  };

  return (
    <>
      <Header title="Settings" subtitle="Personalize Life OS" />

      <section className="card settings-section">
        <h2 className="card-title">Profile</h2>
        <form className="name-form" onSubmit={saveName}>
          <Field label="Your name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />
          </Field>
          <button type="submit" className="btn btn-soft" disabled={name.trim() === settings.name}>Save</button>
        </form>
      </section>

      <CloudSyncSection />

      <section className="card settings-section">
        <h2 className="card-title">Preferences</h2>
        <SettingRow icon="palette" title="Theme" description="Default is dark.">
          <Segmented
            label="Theme"
            options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }]}
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
          />
        </SettingRow>
        <SettingRow icon="bell" title="Notifications" description="Sound and alerts when a focus session ends.">
          <button type="button" className="switch" role="switch" aria-checked={settings.notifications} aria-label="Notifications" onClick={toggleNotifications}>
            <span className="switch-thumb" />
          </button>
        </SettingRow>
        <BackgroundAlertsRow />
        <SettingRow icon="wallet" title="Currency" description="Used in the Money module.">
          <select className="input input-sm" aria-label="Currency" value={settings.currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </SettingRow>
      </section>

      <section className="card settings-section">
        <h2 className="card-title">App</h2>
        <SettingRow
          icon="phone"
          title="Install Life OS"
          description={installed ? 'Installed — you are using the app version.' : canInstall ? 'Add Life OS to your home screen.' : 'Use your browser menu: “Install app” / “Add to Home Screen”.'}
        >
          {canInstall && !installed && (
            <button type="button" className="btn btn-primary btn-sm" onClick={install}>Install</button>
          )}
        </SettingRow>
      </section>

      <section className="card settings-section">
        <h2 className="card-title">AI Assistant</h2>
        <p className="muted small">
          Cloud AI (Claude) works after deploying to Vercel with ANTHROPIC_API_KEY set. If you also set APP_ACCESS_CODE there, enter the same code here.
          Without it, the offline planner is used.
        </p>
        <form className="name-form" onSubmit={saveAccessCode}>
          <Field label="AI access code">
            <input className="input" type="password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} autoComplete="off" maxLength={100} />
          </Field>
          <button type="submit" className="btn btn-soft" disabled={accessCode.trim() === (settings.aiAccessCode || '')}>Save</button>
        </form>
      </section>

      <section className="card settings-section">
        <h2 className="card-title">Data</h2>
        <p className="muted small">All data is stored only on this device. Export regularly to keep a backup.</p>
        <SettingRow
          icon="info"
          title="Storage protection"
          description={
            persisted === null
              ? 'Checking…'
              : persisted
                ? 'Protected — the browser will not auto-delete Life OS data.'
                : 'Not guaranteed by this browser. Install the app to the home screen and keep regular backups.'
          }
        >
          {persisted !== null && <span className={`badge ${persisted ? 'priority-low' : 'priority-high'}`}>{persisted ? 'Protected' : 'Best effort'}</span>}
        </SettingRow>
        <SettingRow
          icon="download"
          title="Export data"
          description={settings.lastBackupAt ? `Last backup: ${relativeDay(toDateKey(settings.lastBackupAt))}.` : 'Never backed up yet.'}
        >
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { exportBackup(updateSettings); toast('Backup downloaded'); }}>
            Export
          </button>
        </SettingRow>
        <SettingRow icon="upload" title="Import data" description="Restore from a Life OS backup file. Replaces current data.">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInput.current?.click()}>Import</button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onImport} />
        </SettingRow>
        <SettingRow icon="trash" title="Reset all data" description="Permanently delete all tasks, notes, goals and history.">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmReset(true)}>Reset</button>
        </SettingRow>
      </section>

      <p className="muted small center">Life OS v1.0 · works offline</p>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?" size="sm">
        <p className="muted">This deletes all your tasks, schedule, study history, transactions, notes, goals and settings from this device. This cannot be undone.</p>
        <p className="muted small">Tip: export a backup first.</p>
        <div className="form-actions">
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={doReset}>Yes, delete everything</button>
        </div>
      </Modal>
    </>
  );
}
