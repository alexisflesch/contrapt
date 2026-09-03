interface LevelResultProps {
  readonly isVisible: boolean;
  readonly onReplay: () => void;
  readonly onReturnToLevels: () => void;
}

/** The victory panel shown once a level's simulation reaches its goal. */
export function LevelResult({ isVisible, onReplay, onReturnToLevels }: LevelResultProps) {
  if (!isVisible) return null;

  return (
    <section className="level-result" aria-label="Résultat du niveau">
      <strong>Victoire</strong>
      <button className="primary-button" type="button" onClick={onReplay}>
        Rejouer le niveau
      </button>
      <button className="context-action" type="button" onClick={onReturnToLevels}>
        Retour aux niveaux
      </button>
    </section>
  );
}
