import { useApp } from '../context/AppContext';
import { useToast } from './Toast';
import Icon from './Icon';
import { downloadJSON, exportAllData } from '../utils/storage';
import { todayKey } from '../utils/date';

const DAY = 86400000;
const REMIND_EVERY_DAYS = 7;

/** Reminds the user to export a backup — the only protection against a lost or wiped phone. */
export function useBackupDue() {
  const { settings } = useApp();
  const now = Date.now();
  if (settings.backupSnoozedUntil && new Date(settings.backupSnoozedUntil).getTime() > now) return false;
  const since = settings.lastBackupAt || settings.onboardedAt;
  if (!since) return false;
  return now - new Date(since).getTime() > REMIND_EVERY_DAYS * DAY;
}

export function exportBackup(updateSettings) {
  downloadJSON(exportAllData(), `life-os-backup-${todayKey()}.json`);
  updateSettings({ lastBackupAt: new Date().toISOString(), backupSnoozedUntil: null });
}

export default function BackupBanner() {
  const { settings, updateSettings } = useApp();
  const toast = useToast();
  const due = useBackupDue();
  if (!due) return null;

  const days = settings.lastBackupAt
    ? Math.floor((Date.now() - new Date(settings.lastBackupAt).getTime()) / DAY)
    : null;

  return (
    <section className="card backup-banner" aria-label="Backup reminder">
      <span className="stat-icon tone-orange"><Icon name="download" size={18} /></span>
      <div className="backup-banner-text">
        <p className="strong">Time for a backup</p>
        <p className="muted small">
          {days ? `Last backup was ${days} days ago.` : 'You have never backed up your data.'} Your data lives only on this device.
        </p>
      </div>
      <div className="backup-banner-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => updateSettings({ backupSnoozedUntil: new Date(Date.now() + 3 * DAY).toISOString() })}
        >
          Later
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            exportBackup(updateSettings);
            toast('Backup downloaded — keep it in Google Drive or Telegram Saved Messages.');
          }}
        >
          Back up now
        </button>
      </div>
    </section>
  );
}
