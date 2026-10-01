import type { LevelDocument } from '../domain/level-document';

/**
 * ADR 0016 § Affichage: « par <auteur> » and « d’après <titre> (par
 * <auteur>) » for the first source, each absent with its field. Strings, so
 * React renders them as plain text.
 */
export const attributionParts = (metadata: LevelDocument['metadata']): readonly string[] => {
  const firstSource = metadata.basedOn?.[0];
  return [
    ...(metadata.author === undefined ? [] : [`par ${metadata.author}`]),
    ...(firstSource === undefined
      ? []
      : [
          firstSource.author === undefined
            ? `d’après ${firstSource.title}`
            : `d’après ${firstSource.title} (par ${firstSource.author})`,
        ]),
  ];
};

/** The same attribution on one line, for the game header; `undefined` without any. */
export const attributionLine = (metadata: LevelDocument['metadata']): string | undefined => {
  const parts = attributionParts(metadata);
  return parts.length === 0 ? undefined : parts.join(' · ');
};
