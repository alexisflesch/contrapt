import type { ButtonHTMLAttributes, Ref } from 'react';

/**
 * The visual intent of a button, shared by every page (design tokens in
 * `styles.css` § Boutons):
 *
 * - `go` — launches or moves the player forward (Lancer, Reprendre, Recommencer);
 * - `pause` — suspends without losing anything (Mettre en pause);
 * - `reset` — returns to construction or opens a destructive reset (Recommencer, Ràz atelier, Recommencer le niveau);
 * - `neutral` — every other action (navigation, undo/redo, properties).
 */
type ButtonTone = 'go' | 'pause' | 'reset' | 'neutral';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  readonly tone?: ButtonTone;
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * The app's single button primitive: always `type="button"` (no form ever
 * submits in this shell) and always at least 44 × 44 CSS px via `.btn`, the
 * touch-target floor `AGENTS.md` § Mobile-first requires. Extra classes are
 * appended, so a component can keep a behaviour-specific hook class
 * (e.g. `placement-cancel`) alongside the shared look.
 */
export function Button({ tone = 'neutral', className, ref, ...buttonProps }: ButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn-${tone}${className === undefined ? '' : ` ${className}`}`}
      {...buttonProps}
      ref={ref}
    />
  );
}
