// Lane geometry invariants:
// - 4 two-player lanes, each a 13 x 41 vertical rectangle.
// - Each lane has an 8 x 12 side pocket next to the 13-wide lane.
// - The side pocket is drawn half a cell lower than the integer build grid.
// - The empty cells above/below that side pocket render as spawn-side terrain.
export const BUILD_REGION_MIN_CELLS = 300;
export const BUILD_REGION_MIN_SPAN = 18;
export const BUILD_ROW_MIN_CELLS = 4;
export const BUILD_SPAWN_BAND_WIDTH = 13;
export const BUILD_SPAWN_RUN_ROWS = 14;
export const BUILD_SIDE_POCKET_WIDTH = 8;
export const BUILD_SIDE_POCKET_HEIGHT = 12;
export const BUILD_SIDE_POCKET_Y_OFFSET = 0.5;
export const PLAYER_LANE_WIDTH = 13;
export const PLAYER_SPAWN_RUN_ROWS = 14;
export const PLAYER_LANE_VERTICAL_SPAN = 41;
export const PLAYER_OWN_ROWS_BEFORE_LANE = 11;
export const PLAYER_SHARED_ROWS = 9;
