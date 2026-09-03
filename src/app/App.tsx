import { useState } from 'react';

import { createConstructionAttempt } from '../application/construction/construction-attempt';
import { createEditorSession } from '../application/editor-session/editor-session';
import { embeddedLevels } from '../content/embedded-levels';
import { AppHeader } from '../ui/AppHeader';
import { BoardView } from '../ui/BoardView';
import { ContextPanel } from '../ui/ContextPanel';
import { LevelMenu } from '../ui/LevelMenu';
import { LevelResult } from '../ui/LevelResult';
import { ObjectDrawer } from '../ui/ObjectDrawer';
import { SimulationControls } from '../ui/SimulationControls';
import { useBoardCamera } from './use-board-camera';
import { useBoardPointers } from './use-board-pointers';
import { useEditorSession } from './use-editor-session';
import { useIsSideLayout } from './use-side-layout';
import { useSimulationRunner } from './use-simulation-runner';

export function App() {
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
    selectPlacement,
    executeCommand,
  } = useEditorSession();
  const boardCamera = useBoardCamera(currentScene);
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
  });
  const simulation = useSimulationRunner({ sessionRef, updateSession, setFeedback, pointers });
  const isSideLayout = useIsSideLayout();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLevelListOpen, setIsLevelListOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadLevelOne = (): void => {
    const levelOne = embeddedLevels[0];
    if (levelOne === undefined) {
      setFeedback('Le niveau 1 embarqué est indisponible.');
      return;
    }
    simulation.disposeSimulationSession();
    updateSession(createEditorSession('resolution', createConstructionAttempt(levelOne)));
    pointers.clearPlacementTool();
    pointers.clearPlacementPreview();
    simulation.setHasWon(false);
    setIsMenuOpen(false);
    setIsLevelListOpen(false);
    boardCamera.fitCameraToCurrentScene();
  };

  const returnToLevels = (): void => {
    simulation.disposeSimulationSession();
    simulation.setHasWon(false);
    setIsMenuOpen(true);
    setIsLevelListOpen(true);
  };

  return (
    <div className="app-shell">
      <AppHeader
        sessionMode={session.mode}
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => {
          setIsMenuOpen((open) => !open);
          setIsLevelListOpen((open) => !isMenuOpen && !open);
        }}
      />
      <main className="app-main">
        <LevelMenu
          isOpen={isMenuOpen}
          isLevelListOpen={isLevelListOpen}
          onOpenLevelList={() => {
            setIsLevelListOpen(true);
          }}
          onLaunchLevelOne={loadLevelOne}
        />
        <section className="workspace" aria-label="Espace de construction">
          {session.mode === 'resolution' && (
            <section className="level-objective" aria-label="Objectif du niveau">
              Faire entrer la balle dans le panier
            </section>
          )}
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
            onSelectPlacement={selectPlacement}
          />
          <ContextPanel
            session={session}
            moveHandlers={pointers.moveHandlers}
            onExecuteCommand={executeCommand}
          />
        </section>
        <LevelResult
          isVisible={session.phase === 'result' && simulation.hasWon}
          onReplay={loadLevelOne}
          onReturnToLevels={returnToLevels}
        />
        <ObjectDrawer
          session={session}
          selectedObject={pointers.placementTool?.kind}
          isDrawerOpen={isDrawerOpen}
          isSideLayout={isSideLayout}
          isPlacementActive={pointers.placementTool !== null}
          onToggleDrawer={() => {
            setIsDrawerOpen((current) => !current);
          }}
          onCloseDrawer={() => {
            setIsDrawerOpen(false);
          }}
          onSelectKind={(kind) => {
            pointers.activatePlacement(kind);
            setIsDrawerOpen(false);
          }}
        />
      </main>
    </div>
  );
}
