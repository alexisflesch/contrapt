import { useRef, type ReactNode } from 'react';

import { Button } from './Button';

interface InspectorDrawerProps {
  readonly isWideLayout: boolean;
  /** Whether the compact properties sheet is open; ignored on the wide layout, where the rail always shows it. */
  readonly isPropertiesOpen: boolean;
  readonly onOpenProperties: () => void;
  readonly onCloseProperties: () => void;
  /** The selected object's panel, or `null` when nothing is selected. */
  readonly properties: ReactNode;
  /** The attempt result banner (renders nothing until an attempt concludes). */
  readonly result: ReactNode;
}

/**
 * The home of the selected object's properties and of the attempt result
 * (plan-remise-en-jeu.md § 2.6 and D4). The objective is not here: it opens
 * on demand in a dialog from the header (`BoardShell`), so it never takes
 * board space.
 *
 * - Wide layout: one right rail, properties then result.
 * - Compact layouts: the result stays in the page flow, in the fixed-size
 *   `.status-slot` *after* the board — never over it, never resizing it (B5)
 *   — and the properties become an overlay sheet with its own scrim.
 *
 * The compact scrim sits under the construction toolbar (see the z-index
 * scale in `styles.css`): selecting or placing an object opens the sheet
 * automatically, and `mobile-editor-interactions.md` § Sélection requires
 * « Annuler » to stay reachable right after such an action.
 */
export function InspectorDrawer({
  isWideLayout,
  isPropertiesOpen,
  onOpenProperties,
  onCloseProperties,
  properties,
  result,
}: InspectorDrawerProps) {
  const hasSelection = properties !== null;
  const showsPropertiesInline = isWideLayout && hasSelection;
  const showsPropertiesSheet = !isWideLayout && hasSelection && isPropertiesOpen;

  return (
    <>
      <aside
        className="inspector"
        aria-label={hasSelection ? 'Inspecteur des propriétés' : 'Inspecteur du niveau'}
      >
        {showsPropertiesInline && properties}
        {!isWideLayout && hasSelection && !isPropertiesOpen && (
          <Button className="inspector-open" onClick={onOpenProperties}>
            Ouvrir les propriétés
          </Button>
        )}
        {result}
      </aside>
      {showsPropertiesSheet && (
        <>
          <InspectorScrim onClose={onCloseProperties} />
          {properties}
        </>
      )}
    </>
  );
}

/**
 * Selecting an object opens the compact sheet during the press itself, so the
 * scrim can appear under the finger: the click the browser sends at the end
 * of that tap then lands here although the press began on the board (G2).
 * Only a press that started on the scrim — or a keyboard activation, whose
 * click has `detail === 0` — closes the sheet. The scrim is remounted at each
 * opening, so a press never carries over from a previous one.
 */
function InspectorScrim({ onClose }: { readonly onClose: () => void }) {
  const pressStartedHereRef = useRef(false);

  return (
    <button
      className="inspector-scrim"
      type="button"
      aria-label="Fermer"
      onPointerDown={() => {
        pressStartedHereRef.current = true;
      }}
      onClick={(event) => {
        const pressStartedHere = pressStartedHereRef.current;
        pressStartedHereRef.current = false;
        if (pressStartedHere || event.detail === 0) onClose();
      }}
    />
  );
}
