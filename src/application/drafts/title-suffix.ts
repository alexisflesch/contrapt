import { MAX_TITLE_LENGTH } from '../../domain/level-document';

/**
 * « <titre> (remix) », « <titre> (copie) »: the original title is shortened
 * so that the suffix always stays whole within the title limit (M6b).
 */
export const withTitleSuffix = (title: string, suffix: string): string =>
  `${title.slice(0, MAX_TITLE_LENGTH - suffix.length)}${suffix}`;
