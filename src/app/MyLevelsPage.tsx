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

import { campaignDraftId } from '../application/drafts/campaign-draft';
import type { DraftCreation } from '../application/drafts/draft-repository';
import { duplicateCreation } from '../application/drafts/duplicate-creation';
import { listCreations } from '../application/drafts/list-creations';
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
import { LevelExportDialog } from './LevelExportDialog';
import { readLevelFile } from './read-level-file';
import { ReceivedLevelShareDialog } from './ReceivedLevelShareDialog';
import { useReceivedLevelRepository } from './received-level-repository-context';
import { useCampaignProgress } from './use-campaign-progress';

/** Composition point: the real clock stamps `receivedAt`, as on `/shared`. */
const systemClock = (): Date => new Date();

/** Composition point: the random part of `creation-<aléa>` (ADR 0015 § Identifiants). */
const randomIdPart = (): string => {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

type PendingDeletion =
  | { readonly kind: 'creation'; readonly id: string; readonly title: string }
  | { readonly kind: 'received'; readonly id: string; readonly title: string };

type Sharing =
  | { readonly kind: 'creation'; readonly document: LevelDocument }
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
  const firstSource = metadata.basedOn?.[0];
  if (metadata.author === undefined && firstSource === undefined) return null;
  return (
    <p className="my-level-attribution">
      {metadata.author !== undefined && <span>par {metadata.author}</span>}
      {firstSource !== undefined && (
        <span>
          {firstSource.author === undefined
            ? `d’après ${firstSource.title}`
            : `d’après ${firstSource.title} (par ${firstSource.author})`}
        </span>
      )}
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
    setNotice(
      result.status === 'ok'
        ? null
        : { tone: 'alert', message: `${storageMessage(result.code)} Rien n’a été supprimé.` },
    );
    setPendingDeletion(null);
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

  const importFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (file === undefined) return;

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
                setSharing({ kind: 'creation', document: creation.document });
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
          document={sharing.document}
          onClose={() => {
            setSharing(null);
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
