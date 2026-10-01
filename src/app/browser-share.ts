export type DownloadFile = (fileName: string, mimeType: string, fileText: string) => void;
export type WriteClipboard = (text: string) => Promise<void>;

/** Downloads a text file through a temporary link (U16). */
export const downloadWithTemporaryLink: DownloadFile = (fileName, mimeType, fileText) => {
  const url = URL.createObjectURL(new Blob([fileText], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after the click has been handled by the browser.
  const revokeObjectUrl = URL.revokeObjectURL.bind(URL);
  window.setTimeout(() => {
    revokeObjectUrl(url);
  }, 0);
};

export const browserClipboard = (): WriteClipboard | undefined => {
  // Absent outside secure contexts, even though the DOM typings declare it.
  if (typeof navigator === 'undefined' || !('clipboard' in navigator)) return undefined;
  const clipboard = navigator.clipboard;
  return (text) => clipboard.writeText(text);
};
