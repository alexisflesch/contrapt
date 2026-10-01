/** Composition point: the random part of `creation-<aléa>` (ADR 0015 § Identifiants). */
export const randomIdPart = (): string => {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};
