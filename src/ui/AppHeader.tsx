import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';

import { Button } from './Button';

interface AppHeaderProps {
  readonly title: string;
  readonly subtitle: string;
  /**
   * ADR 0016 § Affichage: the level's author and first source, plain text.
   * Shown in place of the subtitle, which the header has no room to add.
   */
  readonly attribution?: string | undefined;
  /** Optional screen-specific control placed before the menu button. */
  readonly action?: ReactNode;
  /**
   * Screen-specific commands listed first in the menu (M12: an author command
   * kept out of the action bar). Choosing one closes the menu.
   */
  readonly menuActions?: readonly MenuAction[];
}

export interface MenuAction {
  readonly label: string;
  /** A decorative `lucide-react` icon, `aria-hidden`: the label names the command. */
  readonly icon: ReactNode;
  readonly onSelect: () => void;
}

/**
 * The app's brand lockup, current screen label, and the navigation menu.
 * Every destination is a real route (ADR 0008): selecting one navigates
 * away, which unmounts this component along with its own open/closed state
 * — no explicit "close the menu" step is needed after a selection.
 */
export function AppHeader({
  title,
  subtitle,
  attribution,
  action,
  menuActions = [],
}: AppHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          <Plus size={22} strokeWidth={3} />
        </span>
        <h1 className="brand-name">TinkerBolt</h1>
      </div>
      <p className="level-label">
        <span className="level-title">{title}</span>
        {attribution === undefined ? (
          <span className="level-mode">{subtitle}</span>
        ) : (
          <span className="level-attribution">{attribution}</span>
        )}
      </p>
      <div className="header-actions">
        {action}
        <button
          className="icon-button"
          type="button"
          aria-label="Ouvrir le menu"
          aria-expanded={isMenuOpen}
          onClick={() => {
            setIsMenuOpen((open) => !open);
          }}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>
      {isMenuOpen && (
        <nav className="level-menu" aria-label="Menu principal">
          {menuActions.map(({ label, icon, onSelect }) => (
            <Button
              key={label}
              onClick={() => {
                setIsMenuOpen(false);
                onSelect();
              }}
            >
              {icon}
              {label}
            </Button>
          ))}
          <Button
            onClick={() => {
              void navigate('/');
            }}
          >
            Accueil
          </Button>
          <Button
            onClick={() => {
              void navigate('/levels');
            }}
          >
            Liste des niveaux
          </Button>
          <Button
            onClick={() => {
              void navigate('/my-levels');
            }}
          >
            Mes niveaux
          </Button>
          <Button
            onClick={() => {
              void navigate('/editor');
            }}
          >
            Atelier de construction
          </Button>
          <Button
            onClick={() => {
              void navigate('/settings');
            }}
          >
            Paramètres
          </Button>
        </nav>
      )}
    </header>
  );
}
