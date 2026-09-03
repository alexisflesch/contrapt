interface LevelMenuProps {
  readonly isOpen: boolean;
  readonly isLevelListOpen: boolean;
  readonly onOpenLevelList: () => void;
  readonly onLaunchLevelOne: () => void;
  readonly onOpenWorkshop: () => void;
}

/**
 * The main menu overlay: the level list (only level 1 is embedded so far)
 * and the entry point back into the free-creation workshop. Since B1
 * (plan-remise-en-jeu.md § 4) the app opens on level 1, not the workshop, so
 * this menu is the workshop's only way back in.
 */
export function LevelMenu({
  isOpen,
  isLevelListOpen,
  onOpenLevelList,
  onLaunchLevelOne,
  onOpenWorkshop,
}: LevelMenuProps) {
  if (!isOpen) return null;

  return (
    <section className="level-menu" aria-label="Menu principal">
      <button type="button" className="context-action" onClick={onOpenLevelList}>
        Liste des niveaux
      </button>
      <button type="button" className="context-action" onClick={onOpenWorkshop}>
        Atelier de construction
      </button>
      {isLevelListOpen && (
        <section className="level-list" aria-label="Liste des niveaux">
          <p>Niveau 1 · Laisser tomber</p>
          <button type="button" className="primary-button" onClick={onLaunchLevelOne}>
            Lancer le niveau 1
          </button>
        </section>
      )}
    </section>
  );
}
