import type { ReactNode, Ref } from 'react';

interface PanelProps {
  /** Accessible name of the landmark; tests and assistive technology find the panel by it. */
  readonly label: string;
  /** Short visible heading shown in the panel's title bar. */
  readonly title: ReactNode;
  /** Optional control placed at the end of the title bar (e.g. a close button). */
  readonly headerAction?: ReactNode;
  readonly className?: string;
  /** Renders the panel as a modal dialog (`role="dialog"`, `aria-modal`); see `Dialog.tsx`. */
  readonly isModalDialog?: boolean;
  readonly ref?: Ref<HTMLElement>;
  readonly children: ReactNode;
}

/**
 * The titled card used for every side-rail and page block — properties,
 * result, level cards, settings, dialogs — so they all read as one product:
 * dark title bar, light body (`styles.css` § Panneaux).
 */
export function Panel({
  label,
  title,
  headerAction,
  className,
  isModalDialog = false,
  ref,
  children,
}: PanelProps) {
  return (
    <section
      ref={ref}
      className={`panel${className === undefined ? '' : ` ${className}`}`}
      aria-label={label}
      {...(isModalDialog ? { role: 'dialog', 'aria-modal': true } : {})}
    >
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
        {headerAction}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
