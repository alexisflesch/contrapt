import type { ReactNode } from 'react';

import { AppHeader } from './AppHeader';

interface AppFrameProps {
  readonly title: string;
  readonly subtitle: string;
  /** ADR 0016 § Affichage: replaces the subtitle line when present. */
  readonly attribution?: string | undefined;
  /** `board` for the plateau screen (fixed viewport, no page scroll); `page` for scrolling content pages. */
  readonly variant: 'board' | 'page';
  /** Optional screen-specific control shown in the header, before the menu. */
  readonly headerAction?: ReactNode;
  readonly children: ReactNode;
}

/**
 * The chrome shared by every route (ADR 0008): the header with its menu
 * and one `<main>`. Pages differ only by what they put inside, so the four
 * screens keep one look without each re-declaring the shell.
 */
export function AppFrame({
  title,
  subtitle,
  attribution,
  variant,
  headerAction,
  children,
}: AppFrameProps) {
  return (
    <div className={`app-shell app-shell-${variant}`}>
      <AppHeader
        title={title}
        subtitle={subtitle}
        attribution={attribution}
        action={headerAction}
      />
      <main className="app-main">{children}</main>
    </div>
  );
}
