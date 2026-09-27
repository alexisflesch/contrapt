import { useId, type ReactNode, type Ref } from 'react';

interface PanelProps {
  /**
   * Accessible name of the landmark; tests and assistive technology find the
   * panel by it. When omitted, the panel is named by its visible title
   * through `aria-labelledby` (U4b's victory dialog).
   */
  readonly label?: string;
  /** Short visible heading shown in the panel's title bar. */
  readonly title: ReactNode;
  /** Optional control placed at the end of the title bar (e.g. a close button). */
  readonly headerAction?: ReactNode;
  readonly className?: string;
  /** Renders the panel as a modal dialog (`role="dialog"`, `aria-modal`); see `Dialog.tsx`. */
  readonly isModalDialog?: boolean;
  readonly ref?: Ref<HTMLElement>;
  /** `data-*` attributes exposing state to tests and styles (e.g. `data-level-tier`). */
  readonly dataAttributes?: Readonly<Record<`data-${string}`, string>>;
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
  dataAttributes,
  children,
}: PanelProps) {
  const titleId = useId();
  return (
    <section
      ref={ref}
      className={`panel${className === undefined ? '' : ` ${className}`}`}
      {...(label === undefined ? { 'aria-labelledby': titleId } : { 'aria-label': label })}
      {...(isModalDialog ? { role: 'dialog', 'aria-modal': true } : {})}
      {...dataAttributes}
    >
      <div className="panel-header">
        <h2 id={titleId} className="panel-title">
          {title}
        </h2>
        {headerAction}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
