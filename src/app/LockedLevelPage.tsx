import { Link } from 'react-router-dom';

import { AppFrame } from '../ui/AppFrame';
import { Panel } from '../ui/Panel';

/**
 * A locked campaign level reached by its URL (U5b), to play it or to modify
 * its creation (ADR 0015): a simple screen back to the list instead of the
 * board, so the URL is never a bypass of the disabled buttons.
 */
export function LockedLevelPage({ title }: { readonly title: string }) {
  return (
    <AppFrame title={title} subtitle="Niveau verrouillé" variant="page">
      <div className="page-content">
        <Panel label="Niveau verrouillé" title="Niveau verrouillé">
          <p className="panel-note" role="status">
            Ce niveau est encore verrouillé.
          </p>
          <Link className="btn btn-neutral" to="/levels">
            Liste des niveaux
          </Link>
        </Panel>
      </div>
    </AppFrame>
  );
}
