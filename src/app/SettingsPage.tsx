import { AppFrame } from '../ui/AppFrame';
import { Panel } from '../ui/Panel';

/**
 * `/settings` (ADR 0008): route reserved for the future settings screen.
 * No setting exists yet, so this stays a minimal placeholder rather than
 * inventing behaviour ahead of a real need.
 */
export function SettingsPage() {
  return (
    <AppFrame title="Paramètres" subtitle="Réglages de l’application" variant="page">
      <div className="page-content">
        <Panel label="Paramètres" title="Paramètres">
          <p className="panel-note">Réglages à venir.</p>
        </Panel>
      </div>
    </AppFrame>
  );
}
