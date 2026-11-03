/* Where each company stands on static/world/world.webp (2880 x 1620), measured on the image itself at 5x with a 0.5% grid.
   Fractions of the map. `dot` is the white dot on the roof, `box` the building. */
import type { ProjectId } from '../types';

export interface Place {
  dot: { x: number; y: number };
  box: { x0: number; y0: number; x1: number; y1: number };
}

export const PLACES: Record<ProjectId, Place> = {
  /* the green wave building, Spotify disc and wordmark on its roof. The dot sits on the pale roof just above the wordmark. */
  spotify: { dot: { x: 0.6355, y: 0.558 }, box: { x0: 0.62, y0: 0.552, x1: 0.657, y1: 0.602 } },
  /* the copper arch with the Amazon smile on its roof and the wordmark on its face. The dot sits on the top of the arch. */
  amazon: { dot: { x: 0.378, y: 0.424 }, box: { x0: 0.353, y0: 0.416, x1: 0.413, y1: 0.485 } },
};
