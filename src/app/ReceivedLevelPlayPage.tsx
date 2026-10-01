import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { ReceivedLevel } from '../application/received/received-level-repository';
import { AppFrame } from '../ui/AppFrame';
import { Panel } from '../ui/Panel';
import { BoardShell } from './BoardShell';
import { useReceivedLevelRepository } from './received-level-repository-context';

/**
 * `/my-levels/:id/play` (ADR 0008 amended): a received level, played. The id
 * comes from the URL and is untrusted: it only serves one repository read,
 * which validates it. Provisional page (M9): a victory is not recorded yet,
 * and the header does not show the attribution yet (M10).
 */
export function ReceivedLevelPlayPage() {
  const { id = '' } = useParams();
  return <ReceivedLevelPlay key={id} id={id} />;
}

function ReceivedLevelPlay({ id }: { readonly id: string }) {
  const repository = useReceivedLevelRepository();
  const [level] = useState<ReceivedLevel | null>(() => {
    const result = repository.load(id);
    return result.status === 'ok' ? result.level : null;
  });

  if (level === null) {
    return (
      <AppFrame title="Niveau reçu" subtitle="Mode joueur" variant="page">
        <div className="page-content">
          <Panel label="Niveau reçu" title="Niveau introuvable">
            <p className="panel-note" role="alert">
              Ce niveau reçu est introuvable ou ne peut pas être lu sur cet appareil.
            </p>
            <Link className="btn btn-neutral" to="/my-levels">
              Mes niveaux
            </Link>
          </Panel>
        </div>
      </AppFrame>
    );
  }

  return (
    <BoardShell
      initialDocument={level.document}
      mode="resolution"
      title={level.document.metadata.title}
      subtitle="Mode joueur"
    />
  );
}
