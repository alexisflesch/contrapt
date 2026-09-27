import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { createConstructionAttempt } from '../application/construction/construction-attempt';
import {
  createEditorSession,
  currentEditorAttempt,
} from '../application/editor-session/editor-session';
import type { EditorSession } from '../application/editor-session/editor-session';
import type { LevelDocument } from '../domain/level-document';
import type { AttemptOutcome } from '../domain/attempt-failure-evaluator';
import type { ConstructionAttempt } from '../application/construction';
import { AppFrame } from '../ui/AppFrame';
import { BoardView } from '../ui/BoardView';
import { ContextPanel } from '../ui/ContextPanel';
import { LevelResult } from '../ui/LevelResult';
import { InspectorDrawer } from '../ui/InspectorDrawer';
import { ObjectDrawer } from '../ui/ObjectDrawer';
import { Dialog } from '../ui/Dialog';
import { SimulationControls } from '../ui/SimulationControls';
import { useBoardCamera } from './use-board-camera';
import { useBoardPointers } from './use-board-pointers';
import { LevelExportDialog } from './LevelExportDialog';
import { useWiringTool } from './use-wiring-tool';
import { useEditorSession } from './use-editor-session';
import { useIsSideLayout } from './use-side-layout';
import { useSimulationRunner } from './use-simulation-runner';

interface BoardShellProps {
  readonly initialDocument: LevelDocument;
  readonly mode: EditorSession['mode'];
  readonly title: string;
  readonly subtitle: string;
  readonly onSimulationLaunched?: (attempt: ConstructionAttempt) => void;
  readonly onSimulationCompleted?: (outcome: AttemptOutcome) => void;
}

/**
 * The shared plateau screen: header, catalogue drawer, board and
 * inspector/result slot. `PlayLevelPage` and `EditorPage` (ADR 0008) mount
 * this with a `key` tied to the route, so a level or workshop change remounts
 * it with a fresh `EditorSession` instead of this component reacting to a
 * changed `initialDocument` prop mid-life.
 */
export function BoardShell({
  initialDocument,
  mode,
  title,
  subtitle,
  onSimulationLaunched,
  onSimulationCompleted,
}: BoardShellProps) {
  const navigate = useNavigate();
  const {
    session,
    sessionRef,
    feedback,
    setFeedback,
    updateSession,
    reportRefusal,
    currentScene,
    undo,
    redo,
    executeCommand,
  } = useEditorSession(() => createEditorSession(mode, createConstructionAttempt(initialDocument)));
  const boardCamera = useBoardCamera(currentScene);
  const wiring = useWiringTool({ sessionRef, executeCommand, setFeedback });
  const pointers = useBoardPointers({
    sessionRef,
    updateSession,
    setFeedback,
    reportRefusal,
    currentScene,
    cameraRef: boardCamera.cameraRef,
    updateCamera: boardCamera.updateCamera,
    readCanvasRect: boardCamera.readCanvasRect,
    readCanvasSizeInCss: boardCamera.readCanvasSizeInCss,
    wiringSourceRef: wiring.wiringSourceRef,
    onWiringTap: wiring.completeWiring,
  });
  const simulation = useSimulationRunner({
    sessionRef,
    updateSession,
    setFeedback,
    pointers,
    ...(onSimulationLaunched === undefined ? {} : { onSimulationLaunched }),
    ...(onSimulationCompleted === undefined ? {} : { onSimulationCompleted }),
  });
  const isSideLayout = useIsSideLayout();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isObjectiveOpen, setIsObjectiveOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // B1 (plan-remise-en-jeu.md § 4, `initial-progression.md` § Niveau 1):
  // level 1 declares `inventory: []`, so the catalogue drawer must not
  // appear at all — not collapsed, not empty — for it. Read from the
  // current attempt rather than special-casing the level id, so this stays
  // correct for any future level that also ships without an inventory.
  const hasInventory = currentEditorAttempt(session).document.inventory.length > 0;

  const hasSelection = session.selectedPlacementId !== null && session.phase === 'construction';

  useEffect(() => {
    if (hasSelection) setIsInspectorOpen(true);
  }, [hasSelection]);

  const resetToInitialAttempt = (): void => {
    simulation.disposeSimulationSession();
    updateSession(createEditorSession(mode, createConstructionAttempt(initialDocument)));
    pointers.clearPlacementTool();
    pointers.clearPlacementPreview();
    simulation.clearAttemptOutcome();
    boardCamera.fitCameraToCurrentScene();
  };

  const returnToLevels = (): void => {
    void navigate('/levels');
  };

  return (
    <AppFrame
      title={title}
      subtitle={subtitle}
      variant="board"
      headerAction={
        <>
          {mode === 'creation' && (
            // U16: exporting is an author command, absent from player screens.
            <button
              className="icon-button objective-button export-button"
              type="button"
              aria-label="Exporter le niveau"
              aria-haspopup="dialog"
              onClick={() => {
                setIsExportOpen(true);
              }}
            >
              <span className="objective-button-glyph" aria-hidden="true">
                ⤴
              </span>
              <span className="objective-button-label" aria-hidden="true">
                Exporter
              </span>
            </button>
          )}
          {/* The objective is reachable on demand rather than permanently on
          screen (`mobile-editor-interactions.md` § Organisation de l'écran:
          « un accès à l'objectif »), so the board keeps all remaining space. */}
          <button
            className="icon-button objective-button"
            type="button"
            aria-label="Voir l’objectif"
            aria-haspopup="dialog"
            onClick={() => {
              setIsObjectiveOpen(true);
            }}
          >
            <span className="objective-button-glyph" aria-hidden="true">
              ?
            </span>
            <span className="objective-button-label" aria-hidden="true">
              Objectif
            </span>
          </button>
        </>
      }
    >
      {hasInventory && (
        <ObjectDrawer
          session={session}
          selectedObject={pointers.placementTool?.kind}
          selectedInventoryEntryId={pointers.placementTool?.inventoryEntryId}
          isDrawerOpen={isDrawerOpen}
          isSideLayout={isSideLayout}
          isPlacementActive={pointers.placementTool !== null}
          onToggleDrawer={() => {
            setIsDrawerOpen((current) => !current);
          }}
          onCloseDrawer={() => {
            setIsDrawerOpen(false);
          }}
          onSelectKind={(kind, inventoryEntryId) => {
            pointers.activatePlacement(kind, inventoryEntryId);
            setIsDrawerOpen(false);
          }}
        />
      )}
      <section
        className={`workspace${hasInventory ? '' : ' workspace-no-drawer'}`}
        aria-label="Espace de construction"
      >
        <SimulationControls
          session={session}
          feedback={feedback}
          activePlacementKind={pointers.placementTool?.kind ?? null}
          onUndo={undo}
          onRedo={redo}
          onCancelPlacement={pointers.cancelPlacement}
          onLaunchSimulation={simulation.launchSimulation}
          onPause={simulation.pauseCurrentSimulation}
          onResume={simulation.resumeCurrentSimulation}
          onRestoreConstruction={simulation.restoreConstruction}
        />
        <BoardView
          session={session}
          simulationState={simulation.simulationState}
          camera={boardCamera.camera}
          sessionRef={sessionRef}
          simulationStateRef={simulation.simulationStateRef}
          cameraRef={boardCamera.cameraRef}
          boardCanvasRef={boardCamera.boardCanvasRef}
          placementPreview={pointers.placementPreview}
          boardPointerHandlers={pointers.boardPointerHandlers}
          onZoomIn={boardCamera.zoomIn}
          onZoomOut={boardCamera.zoomOut}
          onFitToScene={boardCamera.fitCameraToCurrentScene}
        />
        <div className="status-slot">
          <InspectorDrawer
            isWideLayout={isSideLayout}
            isPropertiesOpen={isInspectorOpen}
            onOpenProperties={() => {
              setIsInspectorOpen(true);
            }}
            onCloseProperties={() => {
              setIsInspectorOpen(false);
            }}
            properties={
              hasSelection ? (
                <ContextPanel
                  session={session}
                  onExecuteCommand={executeCommand}
                  wiringSourceId={wiring.wiringSourceId}
                  onStartWiring={wiring.startWiring}
                  onCancelWiring={wiring.cancelWiring}
                  {...(!isSideLayout
                    ? {
                        onClose: () => {
                          setIsInspectorOpen(false);
                        },
                      }
                    : {})}
                />
              ) : null
            }
            result={
              <LevelResult
                outcome={simulation.attemptOutcome}
                onReplay={resetToInitialAttempt}
                onReset={simulation.restoreConstruction}
                onReturnToLevels={returnToLevels}
              />
            }
          />
        </div>
      </section>
      {isObjectiveOpen && (
        <Dialog
          label="Objectif du niveau"
          title="Objectif"
          closeLabel="Fermer l’objectif"
          onClose={() => {
            setIsObjectiveOpen(false);
          }}
        >
          <p className="dialog-text">Faire entrer la balle dans le panier</p>
        </Dialog>
      )}
      {isExportOpen && (
        <LevelExportDialog
          // The committed history state is the author's document: a running
          // simulation works on its own snapshot and a gesture on a preview.
          document={session.history.state.document}
          onClose={() => {
            setIsExportOpen(false);
          }}
        />
      )}
    </AppFrame>
  );
}
