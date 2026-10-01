import type { LevelDocument } from '../domain/level-document';
import {
  decodeLevelFile,
  MAX_LEVEL_FILE_SIZE_BYTES,
} from '../infrastructure/level-file/level-file-codec';

type ReadLevelFileResult =
  | { readonly status: 'ok'; readonly document: LevelDocument }
  | { readonly status: 'error'; readonly message: string };

type LevelFileErrorCode = Extract<
  ReturnType<typeof decodeLevelFile>,
  { readonly status: 'error' }
>['code'];

const levelFileErrorMessage = (code: LevelFileErrorCode): string => {
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

/**
 * A chosen file is untrusted (`AGENTS.md`): its size is checked before it is
 * read, then the L22 codec validates and migrates it.
 */
export const readLevelFile = async (file: File): Promise<ReadLevelFileResult> => {
  if (file.size > MAX_LEVEL_FILE_SIZE_BYTES) {
    return { status: 'error', message: levelFileErrorMessage('too-large') };
  }
  try {
    const result = decodeLevelFile(await file.text());
    return result.status === 'ok'
      ? { status: 'ok', document: result.document }
      : { status: 'error', message: levelFileErrorMessage(result.code) };
  } catch {
    return { status: 'error', message: 'Impossible de lire ce fichier.' };
  }
};
