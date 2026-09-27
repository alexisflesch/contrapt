import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import type { LevelDocument } from '../domain/level-document';
import { decodeShareFragment } from '../infrastructure/level-share/level-share-codec';
import { AppFrame } from '../ui/AppFrame';
import { Panel } from '../ui/Panel';
import { BoardShell } from './BoardShell';

type SharedLevelState =
  | { readonly status: 'loading' }
  | { readonly status: 'invalid' }
  | { readonly status: 'loaded'; readonly document: LevelDocument };

/** `/shared` (ADR 0008 + 0011): an ephemeral player session decoded from the URL hash. */
export function SharedLevelPage() {
  const { hash } = useLocation();
  const [state, setState] = useState<SharedLevelState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    void decodeShareFragment(hash)
      .then((result) => {
        if (!active) return;
        setState(
          result.status === 'ok'
            ? { status: 'loaded', document: result.document }
            : { status: 'invalid' },
        );
      })
      .catch(() => {
        if (active) setState({ status: 'invalid' });
      });

    return () => {
      active = false;
    };
  }, [hash]);

  if (state.status === 'loaded') {
    return (
      <BoardShell
        key={hash}
        initialDocument={state.document}
        mode="resolution"
        title={`Partage · ${state.document.metadata.title}`}
        subtitle="Mode joueur"
      />
    );
  }

  return (
    <AppFrame title="Niveau partagé" subtitle="Mode joueur" variant="page">
      <div className="page-content">
        <Panel
          label="Niveau partagé"
          title={state.status === 'loading' ? 'Ouverture du niveau partagé' : 'Lien invalide'}
        >
          {state.status === 'loading' ? (
            <p className="panel-note" role="status">
              Chargement du niveau partagé…
            </p>
          ) : (
            <>
              <p className="panel-note" role="alert">
                Ce lien de partage est invalide ou ne peut plus être ouvert.
              </p>
              <Link className="btn btn-neutral" to="/levels">
                Liste des niveaux
              </Link>
            </>
          )}
        </Panel>
      </div>
    </AppFrame>
  );
}
