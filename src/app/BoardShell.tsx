import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CircleQuestionMark, Gamepad2, Upload } from 'lucide-react';

import { createConstructionAttempt } from '../application/construction/construction-attempt';
import {
  createEditorSession,
  currentEditorAttempt,
  selectEditorPlacement,
} from '../application/editor-session/editor-session';
import type { EditorSession } from '../application/editor-session/editor-session';
import { puzzleFromWorkshop } from '../application/puzzle/puzzle-workshop';
import type { LevelDocument } from '../domain/level-document';
import type { AttemptOutcome } from '../domain/attempt-failure-evaluator';
import type { ConstructionAttempt } from '../application/construction';
import { AppFrame } from '../ui/AppFrame';
import { BoardView } from '../ui/BoardView';
import { ContextPanel } from '../ui/ContextPanel';
import { CampaignVictoryDialog, type CampaignVictory } from '../ui/CampaignVictoryDialog';
import { LevelResult } from '../ui/LevelResult';
import { InspectorDrawer } from '../ui/InspectorDrawer';
import { Button } from '../ui/Button';
import { ObjectDrawer } from '../ui/ObjectDrawer';
import { Dialog } from '../ui/Dialog';
import { SimulationControls } from '../ui/SimulationControls';
import { CalibrationGuide } from '../ui/CalibrationGuide';
import { useBoardCamera } from './use-board-camera';
import { placementSourceKey, useBoardPointers } from './use-board-pointers';
import { LevelExportDialog } from './LevelExportDialog';
import { puzzleRefusalMessage } from './level-export';
import { useWiringTool, wiringGuide } from './use-wiring-tool';
import { useEditorSession } from './use-editor-session';
import { useIsSideLayout } from './use-side-layout';
import { useVictoryDialog } from './use-victory-dialog';
import { useSimulationRunner } from './use-simulation-runner';

interface BoardShellProps {
  readonly initialDocument: LevelDocument;
  readonly mode: EditorSession['mode'];
  readonly title: string;
  readonly subtitle: string;
  readonly onSimulationLaunched?: (attempt: ConstructionAttempt) => void;
  readonly onSimulationCompleted?: (outcome: AttemptOutcome) => void;
  /** Called with each newly committed author document (U17 draft autosave). */
  readonly onDocumentCommitted?: (document: LevelDocument) => void;
  /** U4, U4b: tier, object count and next level after a campaign victory, shown in a dialog. */
  readonly campaignVictory?: CampaignVictory | null;
  /** « Remettre à zéro » goes back to it; `initialDocument` when absent. */
  readonly resetDocument?: LevelDocument;
  /** U22, workshop only: plays the puzzle the committed workshop gives. */
  readonly onPlayAsPlayer?: (puzzle: LevelDocument) => void;
  /** U22: replaces « Retour aux niveaux », in the header and the result banner. */
  readonly exit?: { readonly label: string; readonly onExit: () => void };
  /** U28: the pristine campaign document used as the author calibration brief. */
  readonly calibrationDocument?: LevelDocument;
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
  onDocumentCommitted,
  campaignVictory = null,
  resetDocument = initialDocument,
  onPlayAsPlayer,
  exit,
  calibrationDocument,
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
    selectPlacement,
  } = useEditorSession(() => createEditorSession(mode, createConstructionAttempt(initialDocument)));
  const boardCamera = useBoardCamera(currentScene);
  const clearSelection = useCallback((): void => {
    updateSession(selectEditorPlacement(sessionRef.current, null));
  }, [updateSession, sessionRef]);
  const wiring = useWiringTool({
    sessionRef,
    executeCommand,
    setFeedback,
    onFirstChosen: selectPlacement,
    // The first object was only marked for the gesture: the next tap opens an object.
    onWireLaid: clearSelection,
  });
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
    isWiringRef: wiring.isWiringRef,
    onWiringTap: wiring.handleWiringTap,
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

  // Escape drops the active placement tool, like « Annuler le placement ».
  const isPlacementActive = pointers.placementTool !== null;
  const cancelPlacementRef = useRef(pointers.cancelPlacement);
  cancelPlacementRef.current = pointers.cancelPlacement;
  useEffect(() => {
    if (!isPlacementActive) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') cancelPlacementRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isPlacementActive]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isObjectiveOpen, setIsObjectiveOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const resetDialogCancelRef = useRef<HTMLButtonElement>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(calibrationDocument !== undefined);
  const shownCampaignVictory =
    simulation.attemptOutcome?.outcome === 'won' ? campaignVictory : null;
  const victoryDialog = useVictoryDialog(shownCampaignVictory !== null);

  // B1 (plan-remise-en-jeu.md § 4, `initial-progression.md` § Niveau 1):
  // level 1 declares `inventory: []`, so the catalogue drawer must not
  // appear at all — not collapsed, not empty — for it. Read from the
  // current attempt rather than special-casing the level id, so this stays
  // correct for any future level that also ships without an inventory.
  // The author's catalogue does not depend on the inventory: a creation has
  // none (ADR 0015 § Ouvrir dans l'atelier) and still places from it.
  const hasDrawer =
    mode === 'creation' || currentEditorAttempt(session).document.inventory.length > 0;

  const hasSelection = session.selectedPlacementId !== null && session.phase === 'construction';

  const resetDialogCopy =
    mode === 'creation'
      ? {
          label: 'Remise à zéro de l’atelier',
          title: 'Remettre l’atelier à zéro ?',
          closeLabel: 'Fermer la remise à zéro',
          description:
            'Cette action efface tous les objets ajoutés, leurs positions, leurs réglages et leurs fils. L’atelier reviendra à son document de départ.',
          confirmLabel: 'Remettre l’atelier à zéro',
        }
      : {
          label: 'Recommencer le niveau',
          title: 'Recommencer le niveau depuis le début ?',
          closeLabel: 'Fermer le recommencement du niveau',
          description:
            'Cette action efface tous les objets ajoutés, leurs positions, leurs réglages et leurs fils. Le niveau reviendra à son document de départ.',
          confirmLabel: 'Recommencer le niveau',
        };

  // Only committed history states are reported: gesture previews and the
  // simulation snapshot never reach the draft.
  const committedDocument = session.history.state.document;
  const reportedDocumentRef = useRef(committedDocument);
  const onDocumentCommittedRef = useRef(onDocumentCommitted);
  useEffect(() => {
    onDocumentCommittedRef.current = onDocumentCommitted;
  });
  useEffect(() => {
    if (reportedDocumentRef.current === committedDocument) return;
    reportedDocumentRef.current = committedDocument;
    onDocumentCommittedRef.current?.(committedDocument);
  }, [committedDocument]);

  // While wiring, the selection only marks the chosen source: the compact
  // inspector stays shut so the devices remain reachable (U15).
  useEffect(() => {
    if (hasSelection && !wiring.isWiringRef.current) setIsInspectorOpen(true);
  }, [hasSelection, wiring.isWiringRef]);

  const resetToInitialAttempt = (): void => {
    wiring.cancelWiring();
    simulation.disposeSimulationSession();
    updateSession(createEditorSession(mode, createConstructionAttempt(resetDocument)));
    pointers.clearPlacementTool();
    pointers.clearPlacementPreview();
    simulation.clearAttemptOutcome();
    setIsDrawerOpen(false);
    setIsInspectorOpen(false);
    setIsResetDialogOpen(false);
    setFeedback(null);
    boardCamera.fitCameraToCurrentScene();
  };

  const returnToLevels = (): void => {
    if (exit !== undefined) {
      exit.onExit();
      return;
    }
    void navigate('/levels');
  };

  const playAsPlayer = (): void => {
    if (onPlayAsPlayer === undefined) return;
    const conversion = puzzleFromWorkshop(session.history.state.document);
    if (conversion.status === 'refused') {
      setFeedback(puzzleRefusalMessage(conversion.reason));
      return;
    }
    wiring.cancelWiring();
    onPlayAsPlayer(conversion.puzzle);
  };

  return (
    <AppFrame
      title={title}
      subtitle={subtitle}
      variant="board"
      headerAction={
        <>
          {exit !== undefined && (
            <button
              className="icon-button objective-button"
              type="button"
              aria-label={exit.label}
              onClick={exit.onExit}
            >
              <span className="objective-button-glyph" aria-hidden="true">
                <ArrowLeft size={18} />
              </span>
              <span className="objective-button-label" aria-hidden="true">
                Atelier
              </span>
            </button>
          )}
          {onPlayAsPlayer !== undefined && (
            // U22: the author solves the puzzle as the player will. Named apart from « Lancer »,
            // which only runs the machine.
            <button
              className="icon-button objective-button"
              type="button"
              aria-label="Essayer en joueur"
              onClick={playAsPlayer}
            >
              <span className="objective-button-glyph" aria-hidden="true">
                <Gamepad2 size={18} />
              </span>
              <span className="objective-button-label" aria-hidden="true">
                Essayer en joueur
              </span>
            </button>
          )}
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
                <Upload size={18} />
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
              <CircleQuestionMark size={18} />
            </span>
            <span className="objective-button-label" aria-hidden="true">
              Objectif
            </span>
          </button>
        </>
      }
    >
      {hasDrawer && (
        <ObjectDrawer
          session={session}
          selectedObject={pointers.placementTool?.kind}
          selectedEntryKey={
            pointers.placementTool === null
              ? undefined
              : placementSourceKey(pointers.placementTool.source)
          }
          isDrawerOpen={isDrawerOpen}
          isSideLayout={isSideLayout}
          isPlacementActive={pointers.placementTool !== null}
          onToggleDrawer={() => {
            setIsDrawerOpen((current) => !current);
          }}
          onCloseDrawer={() => {
            setIsDrawerOpen(false);
          }}
          onSelectKind={(kind, source) => {
            wiring.cancelWiring();
            // Touching the active card again puts the tool down.
            const activeTool = pointers.placementTool;
            if (
              activeTool !== null &&
              activeTool.kind === kind &&
              placementSourceKey(activeTool.source) === placementSourceKey(source)
            ) {
              pointers.cancelPlacement();
            } else {
              pointers.activatePlacement(kind, source);
            }
            setIsDrawerOpen(false);
          }}
          isWiringActive={wiring.wiringStep !== null}
          onSelectWire={(inventoryEntryId) => {
            // U15: the wire card is a tool like a placement card. It drops
            // the selection so the compact inspector leaves the board clear.
            if (pointers.placementTool !== null) pointers.cancelPlacement();
            updateSession(selectEditorPlacement(sessionRef.current, null));
            wiring.startWiring(inventoryEntryId);
            setIsDrawerOpen(false);
          }}
          {...(calibrationDocument === undefined
            ? {}
            : {
                onOpenCalibration: () => {
                  setIsCalibrationOpen(true);
                },
              })}
        />
      )}
      <section
        className={`workspace${hasDrawer ? '' : ' workspace-no-drawer'}`}
        aria-label="Espace de construction"
      >
        <SimulationControls
          isCreation={mode === 'creation'}
          session={session}
          feedback={feedback}
          activePlacementKind={pointers.placementTool?.kind ?? null}
          wiringGuide={wiring.wiringStep === null ? null : wiringGuide(wiring.wiringStep)}
          onExitWiring={wiring.cancelWiring}
          onUndo={undo}
          onRedo={redo}
          onCancelPlacement={pointers.cancelPlacement}
          onLaunchSimulation={() => {
            wiring.cancelWiring();
            simulation.launchSimulation();
          }}
          onPause={simulation.pauseCurrentSimulation}
          onResume={simulation.resumeCurrentSimulation}
          onRestoreConstruction={simulation.restoreConstruction}
          onResetDocument={() => {
            setIsResetDialogOpen(true);
          }}
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
          onWheelZoom={boardCamera.zoomWithWheel}
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
                isCreation={mode === 'creation'}
                onReplay={resetToInitialAttempt}
                onReset={simulation.restoreConstruction}
                onReturnToLevels={returnToLevels}
                {...(exit === undefined ? {} : { returnLabel: exit.label })}
                {...(shownCampaignVictory === null
                  ? {}
                  : {
                      campaign: {
                        tier: shownCampaignVictory.tier,
                        onOpenResult: victoryDialog.open,
                      },
                    })}
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
      {calibrationDocument !== undefined && isCalibrationOpen && (
        <Dialog
          label="Fiche de calibrage"
          title={<>Calibrage · {calibrationDocument.metadata.title}</>}
          closeLabel="Fermer la fiche de calibrage"
          className="calibration-dialog"
          onClose={() => {
            setIsCalibrationOpen(false);
          }}
        >
          <CalibrationGuide level={calibrationDocument} />
        </Dialog>
      )}
      {isResetDialogOpen && (
        <Dialog
          label={resetDialogCopy.label}
          title={resetDialogCopy.title}
          closeLabel={resetDialogCopy.closeLabel}
          initialFocusRef={resetDialogCancelRef}
          onClose={() => {
            setIsResetDialogOpen(false);
          }}
        >
          <p className="dialog-text">{resetDialogCopy.description}</p>
          <div className="level-result-actions">
            <Button
              ref={resetDialogCancelRef}
              onClick={() => {
                setIsResetDialogOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button tone="reset" onClick={resetToInitialAttempt}>
              {resetDialogCopy.confirmLabel}
            </Button>
          </div>
        </Dialog>
      )}
      {victoryDialog.isOpen && shownCampaignVictory !== null && (
        <CampaignVictoryDialog
          campaign={shownCampaignVictory}
          onReplay={resetToInitialAttempt}
          onClose={victoryDialog.close}
        />
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
