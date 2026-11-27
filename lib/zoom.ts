export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;

export type ZoomState = { scale: number; x: number; y: number };

export const INITIAL_ZOOM: ZoomState = { scale: MIN_ZOOM, x: 0, y: 0 };

/** Keep the zoomed content covering the viewport (no empty gaps). */
export function clampZoom(
  state: ZoomState,
  width: number,
  height: number,
): ZoomState {
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.scale));
  if (scale === MIN_ZOOM) {
    return INITIAL_ZOOM;
  }
  return {
    scale,
    x: Math.min(0, Math.max(width * (1 - scale), state.x)),
    y: Math.min(0, Math.max(height * (1 - scale), state.y)),
  };
}

/**
 * Zoom by `factor`, keeping the point under the cursor (px, py, relative to
 * the viewport's top-left) stationary. The content's transform origin is 0 0.
 */
export function zoomAt(
  state: ZoomState,
  factor: number,
  px: number,
  py: number,
  width: number,
  height: number,
): ZoomState {
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.scale * factor));
  const ratio = scale / state.scale;
  return clampZoom(
    {
      scale,
      x: px - (px - state.x) * ratio,
      y: py - (py - state.y) * ratio,
    },
    width,
    height,
  );
}
