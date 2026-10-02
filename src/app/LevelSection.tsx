import { useId, type ReactNode } from 'react';

type LevelSectionProps = Readonly<{
  /** The section's heading, which also names the region. */
  title: string;
  /** What is counted, on the right of the heading (« 2 », « 2 / 5 résolus »). */
  count: string;
  children: ReactNode;
}>;

/**
 * A titled group of level cards (V6): a chapter of the campaign, « Mes
 * créations », « Niveaux reçus ». The heading names the region and the count
 * sits at its right, as in the V4 mock-ups.
 */
export function LevelSection({ title, count, children }: LevelSectionProps) {
  const titleId = useId();
  return (
    <section className="level-section" aria-labelledby={titleId}>
      <div className="level-section-head">
        <h2 id={titleId}>{title}</h2>
        <span className="level-section-count">{count}</span>
      </div>
      {children}
    </section>
  );
}
