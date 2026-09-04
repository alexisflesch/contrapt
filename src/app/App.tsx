import { useState } from 'react';

import { createConstructionAttempt } from '../application/construction/construction-attempt';
import {
  createEditorSession,
  currentEditorAttempt,
} from '../application/editor-session/editor-session';
import { embeddedLevels, embeddedWorkshopDocument } from '../content/embedded-levels';
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

  // B1 (plan-remise-en-jeu.md § 4, `initial-progression.md` § Niveau 1):
  // level 1 declares `inventory: []`, so the catalogue drawer must not
  // appear at all — not collapsed, not empty — for it. Read from the
  // current attempt rather than special-casing the level id, so this stays
  // correct for any future level that also ships without an inventory.
  const hasInventory = currentEditorAttempt(session).document.inventory.length > 0;

  // D4 (plan-remise-en-jeu.md § 6): the board keeps the level's own scene
  // ratio instead of stretching into whatever box the surrounding chrome
  // leaves behind — see `.board-scene-row`/`.scene-frame` in styles.css.
  const scene = currentEditorAttempt(session).document.scene;
  const sceneAspectRatio = (scene.max.x - scene.min.x) / (scene.max.y - scene.min.y);

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
    simulation.clearAttemptOutcome();
    setIsMenuOpen(false);
    setIsLevelListOpen(false);
    boardCamera.fitCameraToCurrentScene();
  };

  const loadWorkshop = (): void => {
    simulation.disposeSimulationSession();
    updateSession(
      createEditorSession('creation', createConstructionAttempt(embeddedWorkshopDocument)),
    );
    pointers.clearPlacementTool();
    pointers.clearPlacementPreview();
    simulation.clearAttemptOutcome();
    setIsMenuOpen(false);
    setIsLevelListOpen(false);
    boardCamera.fitCameraToCurrentScene();
  };

  const returnToLevels = (): void => {
    simulation.disposeSimulationSession();
    simulation.clearAttemptOutcome();
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
          onOpenWorkshop={loadWorkshop}
        />
        {hasInventory && (
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
        )}
        <section
          className={`workspace${hasInventory ? '' : ' workspace-no-drawer'}`}
          aria-label="Espace de construction"
        >
          <p className="landscape-hint" role="note">
            Astuce : tournez votre téléphone pour un plateau plus grand.
          </p>
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
            sceneAspectRatio={sceneAspectRatio}
            onZoomIn={boardCamera.zoomIn}
            onZoomOut={boardCamera.zoomOut}
            onFitToScene={boardCamera.fitCameraToCurrentScene}
          />
          {/*
            Non-modal and in normal document flow (plan-remise-en-jeu.md § 4,
            B1): whichever of the two below renders content appears after the
            board in the DOM instead of as an absolutely-positioned overlay,
            so it never covers the scene the player just watched play out.

            B5 (plan-remise-en-jeu.md § 4 bis) reserved a fixed-height slot so
            the result banner's appearance never resizes `.scene-frame` (a
            first version only reserved it outside `'construction'`, which
            still moved the resize, just earlier — confirmed by playing it).
            The same fix was then applied to `ContextPanel` on its own
            `.context-panel-slot` — which meant *two* always-mounted,
            independently reserved blocks stacked under the board at once,
            even though `LevelResult` only ever has content during `'result'`
            and `ContextPanel` only during `'construction'`: never both at
            the same time. On a level with nothing to select (level 1's empty
            inventory), `ContextPanel`'s reservation was 100% permanent dead
            space. Confirmed live on a 1920 × 869 viewport: the board was
            170px tall with ~392px of empty reserved space beneath it.

            Fixed by sharing one `.status-slot` between both: each component
            renders its content or `null`, and this wrapper — never
            conditionally rendered — is what actually reserves the height,
            once, sized to the larger of the two, not their sum.

            Mise en page (plan-remise-en-jeu.md § 6, D4) : sur grand écran,
            `.status-slot` quitte la colonne du plateau — la grille de
            `.workspace` le place dans la colonne latérale droite, aux côtés
            de `.level-objective`, pour que son contenu ne partage plus jamais
            l'espace vertical du plateau. Sur petit écran, il reste en flux
            normal sous le plateau, comme avant.
          */}
          <div className="status-slot">
            <LevelResult
              outcome={simulation.attemptOutcome}
              onReplay={loadLevelOne}
              onReset={simulation.restoreConstruction}
              onReturnToLevels={returnToLevels}
            />
            <ContextPanel
              session={session}
              moveHandlers={pointers.moveHandlers}
              onExecuteCommand={executeCommand}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
