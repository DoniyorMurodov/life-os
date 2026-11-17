import { Component } from 'react';
import { downloadJSON, exportAllData } from '../utils/storage';

/** Prevents a white screen: shows a recovery screen and lets the user back up data. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Life OS] crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash-screen">
        <div className="card crash-card">
          <h1 className="page-title">Something went wrong</h1>
          <p className="muted">Your data is still saved on this device. Try reloading the app.</p>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => downloadJSON(exportAllData(), 'life-os-backup.json')}>
              Download backup
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
