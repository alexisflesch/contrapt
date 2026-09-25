import { embeddedWorkshopDocument } from '../content/embedded-levels';
import { BoardShell } from './BoardShell';

/** `/editor` (ADR 0008): the free-creation workshop. */
export function EditorPage() {
  return (
    <BoardShell
      initialDocument={embeddedWorkshopDocument}
      mode="creation"
      title="Éditeur de niveaux"
      subtitle="Mode éditeur"
    />
  );
}
