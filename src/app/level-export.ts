import { levelDocumentSchema, type LevelDocument } from '../domain/level-document';
import { encodeLevelFile } from '../infrastructure/level-file/level-file-codec';
import { encodeShareFragment } from '../infrastructure/level-share/level-share-codec';

type LevelExportPreparation =
  | {
      readonly status: 'ready';
      readonly fileName: string;
      readonly mimeType: string;
      readonly fileText: string;
    }
  | { readonly status: 'invalid'; readonly reasons: readonly string[] };

/**
 * U16: validates the author's committed document before any export. The
 * schema messages are already written for people, so they are shown as-is,
 * without duplicates.
 */
export const prepareLevelExport = (document: LevelDocument): LevelExportPreparation => {
  const validation = levelDocumentSchema.safeParse(document);
  if (!validation.success) {
    return {
      status: 'invalid',
      reasons: [...new Set(validation.error.issues.map(({ message }) => message))],
    };
  }

  return {
    status: 'ready',
    fileName: `${validation.data.id}.json`,
    mimeType: 'application/json',
    fileText: encodeLevelFile(validation.data),
  };
};

/** `/shared` under the app's base path (ADR 0008 amendment), followed by the L23 fragment. */
export const buildShareUrl = (fragment: string, origin: string, basePath: string): string =>
  `${origin}${basePath.endsWith('/') ? basePath : `${basePath}/`}shared${fragment}`;

/** Encodes a level with the L23 codec and returns its absolute share link. */
export const createShareLink = async (
  document: LevelDocument,
  origin: string,
  basePath: string,
): Promise<string> => buildShareUrl(await encodeShareFragment(document), origin, basePath);
