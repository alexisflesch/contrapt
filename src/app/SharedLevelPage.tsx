import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { receiveLevel, type LevelFingerprintResult } from '../application/received/receive-level';
import type { LevelDocument } from '../domain/level-document';
import { levelFingerprint } from '../infrastructure/level-file/level-fingerprint';
import { decodeShareFragment } from '../infrastructure/level-share/level-share-codec';
import { AppFrame } from '../ui/AppFrame';
import { Panel } from '../ui/Panel';
import { BoardShell } from './BoardShell';
import { useReceivedLevelRepository } from './received-level-repository-context';

type SharedLevelState =
  | { readonly status: 'loading' }
  | { readonly status: 'invalid' }
  | { readonly status: 'workshop' }
  | { readonly status: 'loaded'; readonly document: LevelDocument; readonly kept: boolean };

/** Composition point: the real clock stamps `receivedAt`, as `App` does for drafts. */
const systemClock = (): Date => new Date();

/** `crypto.subtle` is missing outside a secure context (HTTP on a local IP): not kept, still played. */
const fingerprintOf = async (document: LevelDocument): Promise<LevelFingerprintResult> => {
  try {
    return { status: 'ok', fingerprint: await levelFingerprint(document) };
  } catch {
    return { status: 'unavailable' };
  }
};

/**
 * `/shared` (ADR 0008, 0011, 0015 § Réception): the level decoded from the URL
 * hash is stored as a received level, then played; a storage failure only
 * shows a discreet status.
 */
export function SharedLevelPage() {
  const { hash } = useLocation();
  const repository = useReceivedLevelRepository();
  const [state, setState] = useState<SharedLevelState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    const open = async (): Promise<SharedLevelState> => {
      const decoded = await decodeShareFragment(hash);
      if (decoded.status !== 'ok') return { status: 'invalid' };
      const fingerprint = await fingerprintOf(decoded.document);
      if (!active) return { status: 'loading' };
      const received = receiveLevel(repository, decoded.document, 'link', fingerprint, systemClock);
      if (received.status === 'refused') return { status: 'workshop' };
      return {
        status: 'loaded',
        document: decoded.document,
        kept: received.status === 'received',
      };
    };

    void open()
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) setState({ status: 'invalid' });
      });

    return () => {
      active = false;
    };
  }, [hash, repository]);

  if (state.status === 'loaded') {
    return (
      <BoardShell
        key={hash}
        initialDocument={state.document}
        mode="resolution"
        title={`Partage · ${state.document.metadata.title}`}
        subtitle="Mode joueur"
        {...(state.kept ? {} : { notice: 'Ce niveau n’a pas été gardé sur cet appareil.' })}
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
                {state.status === 'workshop'
                  ? 'Ce lien est un atelier, pas un niveau à jouer.'
                  : 'Ce lien de partage est invalide ou ne peut plus être ouvert.'}
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
