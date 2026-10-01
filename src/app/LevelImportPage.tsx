import { useRef, useState, type ChangeEvent } from 'react';
import { ArrowRight, FileUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { importLevelAsDraft } from '../application/drafts/import-level-draft';
import type { LevelDocument } from '../domain/level-document';
import {
  decodeLevelFile,
  MAX_LEVEL_FILE_SIZE_BYTES,
} from '../infrastructure/level-file/level-file-codec';
import { AppFrame } from '../ui/AppFrame';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useDraftRepository } from './draft-repository-context';

type ImportStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'reading' }
  | { readonly kind: 'ready'; readonly document: LevelDocument }
  | { readonly kind: 'error'; readonly message: string };

const levelFileErrorMessage = (
  code: Extract<ReturnType<typeof decodeLevelFile>, { readonly status: 'error' }>['code'],
): string => {
  switch (code) {
    case 'too-large':
      return 'Ce fichier dépasse la taille maximale de 256 Kio.';
    case 'invalid-json':
      return 'Le fichier ne contient pas un JSON valide.';
    case 'unsupported-version':
      return 'La version de ce document n’est pas prise en charge.';
    case 'invalid-document':
      return 'Le JSON ne décrit pas un niveau valide.';
  }
};

const createImportId = (): string => {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const draftErrorMessage = (
  code: 'storage-unavailable' | 'quota-exceeded' | 'invalid-draft',
): string => {
  switch (code) {
    case 'storage-unavailable':
      return 'Le stockage local est indisponible. Le brouillon importé n’a pas été enregistré.';
    case 'quota-exceeded':
      return 'L’espace de stockage est plein. Le brouillon importé n’a pas été enregistré.';
    case 'invalid-draft':
      return 'Ce niveau ne peut pas être enregistré comme brouillon.';
  }
};

/** `/import`: decode a level outside the board and save it as a separate draft. */
export function LevelImportPage() {
  const drafts = useDraftRepository();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ImportStatus>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (file === undefined) return;

    setStatus({ kind: 'reading' });
    if (file.size > MAX_LEVEL_FILE_SIZE_BYTES) {
      setStatus({ kind: 'error', message: levelFileErrorMessage('too-large') });
      return;
    }

    try {
      const result = decodeLevelFile(await file.text());
      setStatus(
        result.status === 'ok'
          ? { kind: 'ready', document: result.document }
          : { kind: 'error', message: levelFileErrorMessage(result.code) },
      );
    } catch {
      setStatus({ kind: 'error', message: 'Impossible de lire ce fichier.' });
    }
  };

  const importDocument = (): void => {
    if (status.kind !== 'ready') return;
    const result = importLevelAsDraft(drafts, status.document, createImportId);
    if (result.status === 'error') {
      setStatus({ kind: 'error', message: draftErrorMessage(result.code) });
      return;
    }
    void navigate(`/editor?draft=${encodeURIComponent(result.draftId)}`);
  };

  return (
    <AppFrame title="Importer" subtitle="Mode éditeur" variant="page">
      <div className="page-content">
        <Panel label="Importer un niveau JSON" title="Importer un niveau">
          <p className="panel-note">
            Choisis un fichier JSON de niveau TinkerBolt (256 Kio maximum). L’import crée un nouveau
            brouillon et conserve les brouillons déjà enregistrés.
          </p>
          <Button
            onClick={() => {
              fileInputRef.current?.click();
            }}
          >
            <FileUp size={18} aria-hidden="true" />
            Choisir un fichier JSON
          </Button>
          <input
            ref={fileInputRef}
            id="level-json-file"
            type="file"
            accept=".json,application/json"
            aria-label="Fichier JSON"
            hidden
            onChange={(event) => {
              void readFile(event);
            }}
          />
          {status.kind === 'reading' && (
            <p className="export-status" role="status">
              Lecture du fichier…
            </p>
          )}
          {status.kind === 'ready' && (
            <>
              <p className="export-status" role="status">
                « {status.document.metadata.title} » est valide et prêt à être importé.
              </p>
              <Button tone="go" onClick={importDocument}>
                <FileUp size={18} aria-hidden="true" />
                Importer dans un nouveau brouillon
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </>
          )}
          {status.kind === 'error' && (
            <p className="export-status" role="alert">
              {status.message}
            </p>
          )}
        </Panel>
      </div>
    </AppFrame>
  );
}
