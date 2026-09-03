import type { EditorSession } from '../application/editor-session/editor-session';

interface AppHeaderProps {
  readonly sessionMode: EditorSession['mode'];
  readonly isMenuOpen: boolean;
  readonly onToggleMenu: () => void;
}

/** The app's brand lockup, current level/mode label, and the menu toggle. */
export function AppHeader({ sessionMode, isMenuOpen, onToggleMenu }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          +
        </span>
        <h1>Contrapt!</h1>
      </div>
      <p className="level-label">
        <span>
          {sessionMode === 'creation' ? 'Éditeur de niveaux' : 'Niveau 1 · Laisser tomber'}
        </span>
        <span className="level-mode">
          {sessionMode === 'creation' ? 'Mode éditeur' : 'Mode joueur'}
        </span>
      </p>
      <button
        className="icon-button"
        type="button"
        aria-label="Ouvrir le menu"
        aria-expanded={isMenuOpen}
        onClick={onToggleMenu}
      >
        <span aria-hidden="true">☰</span>
      </button>
    </header>
  );
}
