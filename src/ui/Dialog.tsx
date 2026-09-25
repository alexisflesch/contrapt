import { useEffect, useRef, type ReactNode } from 'react';

import { Panel } from './Panel';

interface DialogProps {
  /** Accessible name of the dialog. */
  readonly label: string;
  readonly title: ReactNode;
  /** Accessible name of the explicit close control. */
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

const focusableSelector =
  'button:not([disabled]), [href], select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog built on `Panel` and the same scrim convention as the
 * compact sheets (`styles.css` § Voiles). Mounted only while open.
 *
 * Tap-first (`AGENTS.md` § Mobile-first): an explicit close control in the
 * title bar and a tap on the backdrop both close it; Escape does too for
 * keyboards. On open, focus moves to the close control and Tab stays inside
 * the dialog; on close, focus returns to whatever opened it. The backdrop is
 * hidden from assistive technology and out of the tab order — the close
 * control is the accessible way out, so it is not announced twice.
 */
export function Dialog({ label, title, closeLabel, onClose, children }: DialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || dialogRef.current === null) return;

      const focusables = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (first === undefined || last === undefined) return;

      const active = document.activeElement;
      const leavesAtEnd = !event.shiftKey && active === last;
      const leavesAtStart = event.shiftKey && active === first;
      const isOutside = !(active instanceof Node) || !dialogRef.current.contains(active);
      if (leavesAtEnd || leavesAtStart || isOutside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, []);

  return (
    <>
      <button
        className="dialog-scrim"
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <Panel
        ref={dialogRef}
        className="dialog"
        label={label}
        title={title}
        isModalDialog
        headerAction={
          <button
            ref={closeRef}
            className="panel-close"
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        }
      >
        {children}
      </Panel>
    </>
  );
}
