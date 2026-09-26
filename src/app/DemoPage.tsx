import { embeddedDemoDocument } from '../content/embedded-levels';
import { BoardShell } from './BoardShell';

/** `/demo` (ADR 0008): a machine that runs by itself; the visitor only presses « Tester ». */
export function DemoPage() {
  return (
    <BoardShell
      initialDocument={embeddedDemoDocument}
      mode="resolution"
      title="Démonstration"
      subtitle="Appuyez sur Tester et regardez"
    />
  );
}
