import { describe, expect, it } from 'vitest';

import {
  CAMERA_MIN_PIXELS_PER_WORLD_UNIT,
  CAMERA_ZOOM_MAX_RATIO,
  CAMERA_ZOOM_MIN_RATIO,
  SCENE_FIT_MARGIN_RATIO,
  clampCamera,
  computeCameraZoomBounds,
  fitCameraToScene,
  panCamera,
  zoomCameraAt,
  type Camera,
  type SceneRect,
} from './board-camera';
import { worldToPixels } from './board-renderer';

const chapterOneScene: SceneRect = { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } };
const wideScene: SceneRect = { min: { x: 0, y: 0 }, max: { x: 16, y: 9 } };

describe('board-camera (module pur, sans DOM)', () => {
  it('ajuste une scène 8 × 5,5 dans un canvas 320 × 240 avec la marge de 4 %, un plancher de zoom et un centrage', () => {
    const canvasSize = { width: 320, height: 240 };

    const camera = fitCameraToScene(chapterOneScene, canvasSize);

    expect(camera.pixelsPerWorldUnit).toBeGreaterThanOrEqual(CAMERA_MIN_PIXELS_PER_WORLD_UNIT);
    // 320 / 8 = 40 px/unit is the limiting dimension (240 / 5,5 ≈ 43,6 would
    // allow more), so the fit is that ratio minus the ADR 0007 margin.
    const expectedZoom = (canvasSize.width / 8) * (1 - SCENE_FIT_MARGIN_RATIO);
    expect(camera.pixelsPerWorldUnit).toBeCloseTo(expectedZoom, 9);

    const canvasCenterWorld = {
      x: camera.origin.x + canvasSize.width / 2 / camera.pixelsPerWorldUnit,
      y: camera.origin.y + canvasSize.height / 2 / camera.pixelsPerWorldUnit,
    };
    const sceneCenter = { x: 4, y: 2.75 };
    expect(canvasCenterWorld.x).toBeCloseTo(sceneCenter.x, 9);
    expect(canvasCenterWorld.y).toBeCloseTo(sceneCenter.y, 9);
  });

  it('applique le plancher absolu de 24 px/unité même pour un canvas minuscule ou nul', () => {
    const tiny = fitCameraToScene(wideScene, { width: 1, height: 1 });
    expect(tiny.pixelsPerWorldUnit).toBe(CAMERA_MIN_PIXELS_PER_WORLD_UNIT);

    const zero = fitCameraToScene(wideScene, { width: 0, height: 0 });
    expect(zero.pixelsPerWorldUnit).toBe(CAMERA_MIN_PIXELS_PER_WORLD_UNIT);
    expect(zero.origin.x).toBeCloseTo(8, 9);
    expect(zero.origin.y).toBeCloseTo(4.5, 9);
  });

  it('borne le zoom aux deux extrémités (facteur énorme et facteur minuscule)', () => {
    const canvasSize = { width: 640, height: 360 };
    const camera = fitCameraToScene(wideScene, canvasSize);
    const bounds = computeCameraZoomBounds(wideScene, canvasSize);
    const anchor = { x: canvasSize.width / 2, y: canvasSize.height / 2 };

    const zoomedInHuge = zoomCameraAt(camera, 1_000_000, anchor, wideScene, canvasSize);
    expect(zoomedInHuge.pixelsPerWorldUnit).toBeCloseTo(bounds.max, 6);

    const zoomedOutTiny = zoomCameraAt(camera, 1 / 1_000_000, anchor, wideScene, canvasSize);
    expect(zoomedOutTiny.pixelsPerWorldUnit).toBeCloseTo(bounds.min, 6);

    // The ADR ratios apply relative to the fit, and the absolute floor always wins.
    expect(bounds.min).toBeGreaterThanOrEqual(CAMERA_MIN_PIXELS_PER_WORLD_UNIT);
    expect(bounds.max).toBeCloseTo(camera.pixelsPerWorldUnit * CAMERA_ZOOM_MAX_RATIO, 6);
  });

  it('respecte les bornes relatives [0,6×, 4×] autour du zoom ajusté quand elles dominent le plancher', () => {
    // A large canvas keeps the fitted zoom comfortably above the absolute
    // floor (0.6× the fit stays above 24), so the relative ADR ratios are
    // the ones actually observed rather than the absolute floor.
    const canvasSize = { width: 1280, height: 720 };
    const bounds = computeCameraZoomBounds(wideScene, canvasSize);
    const fitted = fitCameraToScene(wideScene, canvasSize).pixelsPerWorldUnit;

    expect(bounds.min).toBeCloseTo(fitted * CAMERA_ZOOM_MIN_RATIO, 6);
    expect(bounds.max).toBeCloseTo(fitted * CAMERA_ZOOM_MAX_RATIO, 6);
  });

  it('garde immobile le point monde situé sous l’ancre lors d’un zoom', () => {
    const canvasSize = { width: 640, height: 360 };
    const camera = fitCameraToScene(wideScene, canvasSize);
    const anchor = { x: 200, y: 150 };
    const worldUnderAnchor = (view: Camera) => ({
      x: view.origin.x + anchor.x / view.pixelsPerWorldUnit,
      y: view.origin.y + anchor.y / view.pixelsPerWorldUnit,
    });

    const before = worldUnderAnchor(camera);
    const zoomedIn = zoomCameraAt(camera, 1.5, anchor, wideScene, canvasSize);
    const afterZoomIn = worldUnderAnchor(zoomedIn);
    expect(afterZoomIn.x).toBeCloseTo(before.x, 9);
    expect(afterZoomIn.y).toBeCloseTo(before.y, 9);

    const zoomedOut = zoomCameraAt(zoomedIn, 1 / 1.2, anchor, wideScene, canvasSize);
    const afterZoomOut = worldUnderAnchor(zoomedOut);
    expect(afterZoomOut.x).toBeCloseTo(before.x, 9);
    expect(afterZoomOut.y).toBeCloseTo(before.y, 9);
  });

  it('ne peut pas faire sortir la scène du canvas avec panCamera', () => {
    const canvasSize = { width: 640, height: 360 };
    const camera = fitCameraToScene(wideScene, canvasSize);

    const pannedFarNegative = panCamera(
      camera,
      { x: -1_000_000, y: -1_000_000 },
      wideScene,
      canvasSize,
    );
    const sceneRightPx =
      (wideScene.max.x - pannedFarNegative.origin.x) * pannedFarNegative.pixelsPerWorldUnit;
    const sceneBottomPx =
      (wideScene.max.y - pannedFarNegative.origin.y) * pannedFarNegative.pixelsPerWorldUnit;
    expect(sceneRightPx).toBeGreaterThanOrEqual(0);
    expect(sceneBottomPx).toBeGreaterThanOrEqual(0);

    const pannedFarPositive = panCamera(
      camera,
      { x: 1_000_000, y: 1_000_000 },
      wideScene,
      canvasSize,
    );
    const sceneLeftPx =
      (wideScene.min.x - pannedFarPositive.origin.x) * pannedFarPositive.pixelsPerWorldUnit;
    const sceneTopPx =
      (wideScene.min.y - pannedFarPositive.origin.y) * pannedFarPositive.pixelsPerWorldUnit;
    expect(sceneLeftPx).toBeLessThanOrEqual(canvasSize.width);
    expect(sceneTopPx).toBeLessThanOrEqual(canvasSize.height);
  });

  it('déplace la caméra d’un panoramique modeste proportionnellement au zoom courant', () => {
    const canvasSize = { width: 640, height: 360 };
    const camera = fitCameraToScene(wideScene, canvasSize);

    const panned = panCamera(camera, { x: 24, y: -12 }, wideScene, canvasSize);

    expect(panned.pixelsPerWorldUnit).toBe(camera.pixelsPerWorldUnit);
    expect(panned.origin.x).toBeCloseTo(camera.origin.x - 24 / camera.pixelsPerWorldUnit, 9);
    expect(panned.origin.y).toBeCloseTo(camera.origin.y + 12 / camera.pixelsPerWorldUnit, 9);
  });

  it('clampCamera ramène une origine hors bornes sans changer le zoom', () => {
    const canvasSize = { width: 640, height: 360 };
    const camera = fitCameraToScene(wideScene, canvasSize);

    const runaway: Camera = {
      origin: { x: 1e6, y: -1e6 },
      pixelsPerWorldUnit: camera.pixelsPerWorldUnit,
    };
    const clamped = clampCamera(runaway, wideScene, canvasSize);

    expect(clamped.pixelsPerWorldUnit).toBe(camera.pixelsPerWorldUnit);
    const sceneLeftPx = (wideScene.min.x - clamped.origin.x) * clamped.pixelsPerWorldUnit;
    expect(sceneLeftPx).toBeLessThanOrEqual(canvasSize.width);
    const sceneBottomPx = (wideScene.max.y - clamped.origin.y) * clamped.pixelsPerWorldUnit;
    expect(sceneBottomPx).toBeGreaterThanOrEqual(0);
  });

  it('reconvertit un point écran au centre du canvas au centre de la scène, aller-retour', () => {
    const canvasSize = { width: 640, height: 360 };
    const camera = fitCameraToScene(wideScene, canvasSize);
    const canvasCenter = { x: canvasSize.width / 2, y: canvasSize.height / 2 };

    const worldAtCenter = {
      x: camera.origin.x + canvasCenter.x / camera.pixelsPerWorldUnit,
      y: camera.origin.y + canvasCenter.y / camera.pixelsPerWorldUnit,
    };
    const sceneCenter = {
      x: (wideScene.min.x + wideScene.max.x) / 2,
      y: (wideScene.min.y + wideScene.max.y) / 2,
    };
    expect(worldAtCenter.x).toBeCloseTo(sceneCenter.x, 9);
    expect(worldAtCenter.y).toBeCloseTo(sceneCenter.y, 9);

    const screenBack = worldToPixels(worldAtCenter, {
      cssWidth: canvasSize.width,
      cssHeight: canvasSize.height,
      origin: camera.origin,
      pixelsPerWorldUnit: camera.pixelsPerWorldUnit,
      devicePixelRatio: 1,
    });
    expect(screenBack.x).toBeCloseTo(canvasCenter.x, 9);
    expect(screenBack.y).toBeCloseTo(canvasCenter.y, 9);
  });
});
