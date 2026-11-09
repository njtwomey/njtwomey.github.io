import { interpolateColours } from "omai-render/theme";

/** Shared map meaning: cool weak fit, warm strong fit. */
export const SCORE_COLOURS = ["#2859ba", "#8067c9", "#f2af3c", "#cf352d"];
export const scoreColour = (quality: number) => interpolateColours(SCORE_COLOURS, Math.max(0, Math.min(1, quality)));
