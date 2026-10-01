import { useId, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CircleCheck,
  CircleDashed,
  Copy,
  FilePlus2,
  FileUp,
  LockKeyhole,
  Pencil,
  Play,
  Share2,
  Trash2,
} from 'lucide-react';

import { createConstructionAttempt, type ConstructionAttempt } from '../application/construction';
import { campaignDraftId } from '../application/drafts/campaign-draft';
import type { DraftCreation } from '../application/drafts/draft-repository';
import { duplicateCreation } from '../application/drafts/duplicate-creation';
import { listCreations } from '../application/drafts/list-creations';
import { saveCreationFromLevel } from '../application/drafts/save-creation-from-level';
import type { Command } from '../application/history';
import { puzzleFromWorkshop } from '../application/puzzle/puzzle-workshop';
import { listReceivedLevels } from '../application/received/list-received-levels';
import { receiveLevel } from '../application/received/receive-level';
import type { ReceivedLevel } from '../application/received/received-level-repository';
import { embeddedLevels } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { AppFrame } from '../ui/AppFrame';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Panel } from '../ui/Panel';
import { useDraftRepository } from './draft-repository-context';
import { fingerprintOf } from './fingerprint-of';
import { attributionParts } from './level-attribution';
import { LevelExportDialog } from './LevelExportDialog';
import { notKeptNotice } from './not-kept-notice';
import { randomIdPart } from './random-id-part';
import { readLevelFile } from './read-level-file';
import { ReceivedLevelBoard } from './ReceivedLevelBoard';
import { ReceivedLevelShareDialog } from './ReceivedLevelShareDialog';
import { useReceivedLevelRepository } from './received-level-repository-context';
import { useCampaignProgress } from './use-campaign-progress';

/** Composition point: the real clock stamps `receivedAt`, as on `/shared`. */
const systemClock = (): Date => new Date();

type PendingDeletion =
  | { readonly kind: 'creation'; readonly id: string; readonly title: string }
  | { readonly kind: 'received'; readonly id: string; readonly title: string };

type Sharing =
  | { readonly kind: 'creation'; readonly creation: DraftCreation }
  | { readonly kind: 'received'; readonly document: LevelDocument };

type Notice = { readonly tone: 'status' | 'alert'; readonly message: string } | null;

const storageMessage = (code: string): string =>
  code === 'quota-exceeded'
    ? 'L’espace de stockage de cet appareil est plein.'
    : 'Le stockage local de cet appareil est indisponible.';

/** ADR 0015: the campaign level a `<id>-brouillon` creation comes from, if any. */
const campaignLevelOf = (creationId: string): LevelDocument | undefined =>
  embeddedLevels.find((level) => campaignDraftId(level) === creationId);

/** ADR 0016 § Affichage: author and first source, always rendered as plain text. */
function Attribution({ metadata }: { readonly metadata: LevelDocument['metadata'] }) {
  const parts = attributionParts(metadata);
  if (parts.length === 0) return null;
  return (
    <p className="my-level-attribution">
      {parts.map((part) => (
        <span key={part}>{part}</span>
      ))}
    </p>
  );
}

function ReceivedStatus({ level }: { readonly level: ReceivedLevel }) {
  if (!level.solved) {
    return (
      <p className="level-card-status my-level-status-unsolved">
        <CircleDashed size={18} aria-hidden="true" /> Pas encore résolu
      </p>
    );
  }
  return (
    <>
      <p className="level-card-status level-card-status-resolved">
        <CircleCheck size={18} aria-hidden="true" /> Résolu
      </p>
      {level.bestObjectCount !== undefined && (
        <p className="my-level-record">
          Record : {level.bestObjectCount} objet{level.bestObjectCount > 1 ? 's' : ''}
        </p>
      )}
    </>
  );
}

/**
 * `/my-levels` (ADR 0008 amended, ADR 0015 § Page « Mes niveaux »): the
 * player's creations and the levels received by link or file, most recent
 * first. Every action is a plain button, usable by touch alone.
 */
export function MyLevelsPage() {
  const navigate = useNavigate();
  const drafts = useDraftRepository();
  const received = useReceivedLevelRepository();
  const { levels: campaignProgress } = useCampaignProgress();
  const [creations, setCreations] = useState(() => listCreations(drafts));
  const [receivedLevels, setReceivedLevels] = useState(() => listReceivedLevels(received));
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [sharing, setSharing] = useState<Sharing | null>(null);
  const [creationNotice, setCreationNotice] = useState<Notice>(null);
  const [importNotice, setImportNotice] = useState<Notice>(null);
  /** M10: an imported level that could not be kept, still playable once. */
  const [unkeptImport, setUnkeptImport] = useState<LevelDocument | null>(null);
  const [playingUnkept, setPlayingUnkept] = useState<LevelDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelDeletionRef = useRef<HTMLButtonElement>(null);
  const creationsTitleId = useId();
  const receivedTitleId = useId();

  const refresh = (): void => {
    setCreations(listCreations(drafts));
    setReceivedLevels(listReceivedLevels(received));
  };

  const isLocked = (creationId: string): boolean => {
    const level = campaignLevelOf(creationId);
    return level !== undefined && campaignProgress[level.id]?.unlocked !== true;
  };

  const confirmDeletion = (): void => {
    if (pendingDeletion === null) return;
    const result =
      pendingDeletion.kind === 'creation'
        ? drafts.delete(pendingDeletion.id)
        : received.delete(pendingDeletion.id);
    const setNotice = pendingDeletion.kind === 'creation' ? setCreationNotice : setImportNotice;
    if (pendingDeletion.kind === 'received') setUnkeptImport(null);
    setNotice(
      result.status === 'ok'
        ? null
        : { tone: 'alert', message: `${storageMessage(result.code)} Rien n’a été supprimé.` },
    );
    setPendingDeletion(null);
    refresh();
  };

  /**
   * M14: « Partager » outside the workshop records the exported title and
   * pseudonym in the creation, as the workshop would, with its source kept.
   */
  const applyToCreation = (
    creation: DraftCreation,
    commands: readonly Command<ConstructionAttempt>[],
  ): void => {
    let attempt = createConstructionAttempt(creation.document);
    let changed = false;
    for (const command of commands) {
      const outcome = command.execute(attempt);
      if (outcome.status !== 'accepted' || outcome.state === attempt) continue;
      attempt = outcome.state;
      changed = true;
    }
    if (!changed) return;
    const result = drafts.save({
      document: attempt.document,
      ...(creation.source === undefined ? {} : { source: creation.source }),
    });
    setCreationNotice(
      result.status === 'ok'
        ? null
        : {
            tone: 'alert',
            message: `${storageMessage(result.code)} Le titre et le pseudo n’ont pas été enregistrés.`,
          },
    );
    refresh();
  };

  const duplicate = (id: string): void => {
    const result = duplicateCreation(drafts, id, randomIdPart);
    setCreationNotice(
      result.status === 'ok'
        ? null
        : { tone: 'alert', message: `${storageMessage(result.code)} La copie n’a pas été créée.` },
    );
    refresh();
  };

  /** M11: « Modifier » a received level opens a new creation, its winning solution posed if solved. */
  const editReceived = (level: ReceivedLevel): void => {
    const result = saveCreationFromLevel(drafts, level.document, {
      ...(level.solved && level.playerSolution !== undefined
        ? { playerSolution: level.playerSolution }
        : {}),
      createId: randomIdPart,
    });
    if (result.status === 'error') {
      setImportNotice({
        tone: 'alert',
        message: `${storageMessage(result.code)} La création n’a pas été créée.`,
      });
      return;
    }
    void navigate(`/editor?draft=${encodeURIComponent(result.draftId)}`);
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (file === undefined) return;

    setUnkeptImport(null);
    setImportNotice({ tone: 'status', message: 'Lecture du fichier…' });
    const read = await readLevelFile(file);
    if (read.status === 'error') {
      setImportNotice({ tone: 'alert', message: read.message });
      return;
    }
    const fingerprint = await fingerprintOf(read.document);
    const result = receiveLevel(received, read.document, 'file', fingerprint, systemClock);
    switch (result.status) {
      case 'received':
        setImportNotice({
          tone: 'status',
          message: `« ${result.level.document.metadata.title} » est dans tes niveaux reçus.`,
        });
        break;
      case 'refused':
        setImportNotice({
          tone: 'alert',
          message: 'Ce fichier est un atelier, pas un niveau à jouer.',
        });
        break;
      case 'not-kept':
        setImportNotice({
          tone: 'alert',
          message:
            result.code === 'fingerprint-unavailable'
              ? 'Ce niveau n’a pas été gardé : cet appareil ne peut pas le reconnaître hors connexion sécurisée.'
              : `Ce niveau n’a pas été gardé. ${storageMessage(result.code)}`,
        });
        // ADR 0015 § Réception: a storage failure never prevents playing.
        setUnkeptImport(read.document);
        break;
    }
    refresh();
  };

  const creationCard = ({ id, creation }: { id: string; creation: DraftCreation }) => {
    const { title } = creation.document.metadata;
    const locked = isLocked(id);
    const deleteButton = (
      <Button
        tone="reset"
        onClick={() => {
          setPendingDeletion({ kind: 'creation', id, title });
        }}
      >
        <Trash2 size={18} aria-hidden="true" />
        Supprimer
      </Button>
    );
    return (
      <Panel
        key={id}
        className={`level-card my-level-card ${locked ? 'level-card-locked' : 'level-card-unlocked'}`}
        label={title}
        title={title}
      >
        {locked ? (
          <>
            <p className="level-card-status level-card-status-locked">
              <LockKeyhole size={18} aria-hidden="true" /> Verrouillé
            </p>
            <div className="my-level-actions">{deleteButton}</div>
          </>
        ) : (
          <div className="my-level-actions">
            <Button
              tone="go"
              onClick={() => {
                void navigate(`/editor?draft=${encodeURIComponent(id)}`);
              }}
            >
              <Pencil size={18} aria-hidden="true" />
              Modifier
            </Button>
            <Button
              disabled={puzzleFromWorkshop(creation.document).status !== 'ok'}
              onClick={() => {
                // U22 « Jouer le puzzle », opened straight away from the workshop.
                void navigate(`/editor?draft=${encodeURIComponent(id)}`, {
                  state: { playPuzzle: true },
                });
              }}
            >
              <Play size={18} aria-hidden="true" />
              Jouer
            </Button>
            <Button
              onClick={() => {
                setSharing({ kind: 'creation', creation });
              }}
            >
              <Share2 size={18} aria-hidden="true" />
              Partager
            </Button>
            <Button
              onClick={() => {
                duplicate(id);
              }}
            >
              <Copy size={18} aria-hidden="true" />
              Dupliquer
            </Button>
            {deleteButton}
          </div>
        )}
      </Panel>
    );
  };

  const receivedCard = (level: ReceivedLevel) => {
    const { title } = level.document.metadata;
    return (
      <Panel key={level.id} className="level-card my-level-card" label={title} title={title}>
        <Attribution metadata={level.document.metadata} />
        <ReceivedStatus level={level} />
        <div className="my-level-actions">
          <Button
            tone="go"
            onClick={() => {
              void navigate(`/my-levels/${encodeURIComponent(level.id)}/play`);
            }}
          >
            <Play size={18} aria-hidden="true" />
            Jouer
          </Button>
          <Button
            onClick={() => {
              editReceived(level);
            }}
          >
            <Pencil size={18} aria-hidden="true" />
            Modifier
          </Button>
          <Button
            onClick={() => {
              setSharing({ kind: 'received', document: level.document });
            }}
          >
            <Share2 size={18} aria-hidden="true" />
            Partager
          </Button>
          <Button
            tone="reset"
            onClick={() => {
              setPendingDeletion({ kind: 'received', id: level.id, title });
            }}
          >
            <Trash2 size={18} aria-hidden="true" />
            Supprimer
          </Button>
        </div>
      </Panel>
    );
  };

  if (playingUnkept !== null) {
    // Played in place, like an unkept `/shared` link: nothing is recorded.
    return (
      <ReceivedLevelBoard
        document={playingUnkept}
        title={playingUnkept.metadata.title}
        entryId={null}
        notice={notKeptNotice}
        exit={{
          label: 'Retour à Mes niveaux',
          shortLabel: 'Mes niveaux',
          onExit: () => {
            setPlayingUnkept(null);
          },
        }}
      />
    );
  }

  return (
    <AppFrame title="Mes niveaux" subtitle="Ta collection" variant="page">
      <div className="page-content page-content-levels my-levels">
        <section className="my-levels-section" aria-labelledby={creationsTitleId}>
          <div className="my-levels-heading">
            <h2 id={creationsTitleId}>Mes créations</h2>
            <Button
              tone="go"
              onClick={() => {
                void navigate('/editor');
              }}
            >
              <FilePlus2 size={18} aria-hidden="true" />
              Nouveau niveau
            </Button>
          </div>
          {creationNotice !== null && (
            <p className="panel-note my-levels-notice" role={creationNotice.tone}>
              {creationNotice.message}
            </p>
          )}
          {creations.status === 'error' ? (
            <p className="panel-note my-levels-notice" role="alert">
              {storageMessage(creations.code)} Tes créations ne peuvent pas être lues.
            </p>
          ) : (
            <>
              {creations.warning !== undefined && (
                <p className="panel-note my-levels-notice" role="status">
                  Une création illisible a été mise de côté.
                </p>
              )}
              {creations.creations.length === 0 ? (
                <p className="my-levels-empty">
                  Tu n’as encore aucune création. Lance-toi avec « Nouveau niveau » !
                </p>
              ) : (
                <div className="level-list">{creations.creations.map(creationCard)}</div>
              )}
            </>
          )}
        </section>

        <section className="my-levels-section" aria-labelledby={receivedTitleId}>
          <div className="my-levels-heading">
            <h2 id={receivedTitleId}>Niveaux reçus</h2>
            <Button
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              <FileUp size={18} aria-hidden="true" />
              Importer un fichier
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              aria-label="Fichier de niveau JSON"
              hidden
              onChange={(event) => {
                void importFile(event);
              }}
            />
          </div>
          {importNotice !== null && (
            <p className="panel-note my-levels-notice" role={importNotice.tone}>
              {importNotice.message}
            </p>
          )}
          {unkeptImport !== null && (
            <Button
              tone="go"
              className="my-levels-play-anyway"
              onClick={() => {
                setPlayingUnkept(unkeptImport);
              }}
            >
              <Play size={18} aria-hidden="true" />
              Jouer quand même
            </Button>
          )}
          {receivedLevels.status === 'error' ? (
            <p className="panel-note my-levels-notice" role="alert">
              {storageMessage(receivedLevels.code)} Les niveaux reçus ne peuvent pas être lus.
            </p>
          ) : (
            <>
              {receivedLevels.warning !== undefined && (
                <p className="panel-note my-levels-notice" role="status">
                  Un niveau reçu illisible a été mis de côté.
                </p>
              )}
              {receivedLevels.levels.length === 0 ? (
                <p className="my-levels-empty">
                  Tu n’as aucun niveau reçu pour l’instant. Ouvre un lien de partage ou importe un
                  fichier.
                </p>
              ) : (
                <div className="level-list">{receivedLevels.levels.map(receivedCard)}</div>
              )}
            </>
          )}
        </section>
      </div>

      {pendingDeletion !== null && (
        <Dialog
          label="Confirmer la suppression"
          title="Supprimer ce niveau ?"
          closeLabel="Fermer sans supprimer"
          initialFocusRef={cancelDeletionRef}
          onClose={() => {
            setPendingDeletion(null);
          }}
        >
          <p className="dialog-text">
            « {pendingDeletion.title} » sera supprimé de cet appareil. Cette action est définitive.
          </p>
          <div className="level-result-actions">
            <Button
              ref={cancelDeletionRef}
              onClick={() => {
                setPendingDeletion(null);
              }}
            >
              Annuler
            </Button>
            <Button tone="reset" onClick={confirmDeletion}>
              <Trash2 size={18} aria-hidden="true" />
              Supprimer
            </Button>
          </div>
        </Dialog>
      )}
      {sharing?.kind === 'creation' && (
        <LevelExportDialog
          document={sharing.creation.document}
          onClose={() => {
            setSharing(null);
          }}
          onApplyAttribution={(commands) => {
            applyToCreation(sharing.creation, commands);
          }}
        />
      )}
      {sharing?.kind === 'received' && (
        <ReceivedLevelShareDialog
          document={sharing.document}
          onClose={() => {
            setSharing(null);
          }}
        />
      )}
    </AppFrame>
  );
}
