/**
 * Sent on window the first time the 3D scene is pressed, so the hero can put its "drag ·
 * click" hint away. Its own module: the scene is a lazy chunk, and importing anything from
 * it here would pull three.js into the initial bundle.
 */
export const SCENE_TOUCHED_EVENT = 'portfolio:scene-touched';
