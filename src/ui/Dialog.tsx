import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

import { Panel } from './Panel';

interface DialogProps {
  /** Accessible name of the dialog; when omitted, the visible title names it (`aria-labelledby`). */
  readonly label?: string;
  readonly title: ReactNode;
  /** Extra class on the panel, for a dialog with its own layout (U4b's victory). */
  readonly className?: string;
  /** `data-*` attributes exposing state to tests and styles. */
  readonly dataAttributes?: Readonly<Record<`data-${string}`, string>>;
  /** Accessible name of the explicit close control. */
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  /** Optional first focus target; the close control remains the fallback. */
  readonly initialFocusRef?: RefObject<HTMLButtonElement | null>;
}

const focusableSelector =
  'button:not([disabled]), [href], select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog built on `Panel` and the same scrim convention as the
 * compact sheets (`styles.css` § Voiles). Mounted only while open.
 *
 * Tap-first (`AGENTS.md` § Mobile-first): an explicit close control in the
 * title bar and a tap on the backdrop both close it; Escape does too for
 * keyboards. On open, focus moves to the requested initial control, or the
 * close control when none is supplied; Tab stays inside the dialog. On close,
 * focus returns to whatever opened it. The backdrop is
 * hidden from assistive technology and out of the tab order — the close
 * control is the accessible way out, so it is not announced twice.
 */
export function Dialog({
  label,
  title,
  className,
  dataAttributes,
  closeLabel,
  onClose,
  initialFocusRef,
  children,
}: DialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initialFocus = initialFocusRef?.current ?? closeRef.current;
    initialFocus?.focus();

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
  }, [initialFocusRef]);

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
        className={`dialog${className === undefined ? '' : ` ${className}`}`}
        {...(label === undefined ? {} : { label })}
        title={title}
        isModalDialog
        {...(dataAttributes === undefined ? {} : { dataAttributes })}
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
