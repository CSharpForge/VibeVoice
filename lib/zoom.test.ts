import { describe, expect, it } from "vitest";

import { clampZoom, INITIAL_ZOOM, MAX_ZOOM, zoomAt } from "./zoom";

describe("zoom", () => {
  it("keeps the point under the cursor fixed", () => {
    const next = zoomAt(INITIAL_ZOOM, 2, 600, 300, 800, 600);
    // content point under cursor = (cursor - translate) / scale
    expect((600 - next.x) / next.scale).toBeCloseTo(600);
    expect((300 - next.y) / next.scale).toBeCloseTo(300);
  });

  it("never zooms out below 1x and resets the offset", () => {
    const zoomed = zoomAt(INITIAL_ZOOM, 3, 100, 100, 800, 600);
    expect(zoomAt(zoomed, 0.01, 100, 100, 800, 600)).toEqual(INITIAL_ZOOM);
  });

  it("caps the zoom level", () => {
    expect(zoomAt(INITIAL_ZOOM, 1000, 0, 0, 800, 600).scale).toBe(MAX_ZOOM);
  });

  it("clamps panning so content always covers the viewport", () => {
    const clamped = clampZoom({ scale: 2, x: 500, y: -5000 }, 800, 600);
    expect(clamped).toEqual({ scale: 2, x: 0, y: -600 });
  });
});
