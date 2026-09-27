import type { ReactNode } from 'react';

import { AppHeader } from './AppHeader';

interface AppFrameProps {
  readonly title: string;
  readonly subtitle: string;
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
export function AppFrame({ title, subtitle, variant, headerAction, children }: AppFrameProps) {
  return (
    <div className={`app-shell app-shell-${variant}`}>
      <AppHeader title={title} subtitle={subtitle} action={headerAction} />
      <main className="app-main">{children}</main>
    </div>
  );
}
