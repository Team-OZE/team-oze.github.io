import {
  BUILD_REGION_MIN_CELLS,
  BUILD_REGION_MIN_SPAN,
  BUILD_ROW_MIN_CELLS,
  BUILD_SIDE_POCKET_HEIGHT,
  BUILD_SIDE_POCKET_WIDTH,
  BUILD_SIDE_POCKET_Y_OFFSET,
  BUILD_SPAWN_BAND_WIDTH,
  BUILD_SPAWN_RUN_ROWS,
  PLAYER_LANE_VERTICAL_SPAN,
  PLAYER_LANE_WIDTH,
  PLAYER_OWN_ROWS_BEFORE_LANE,
  PLAYER_SHARED_ROWS,
  PLAYER_SPAWN_RUN_ROWS,
} from "./geometry-constants.mjs";

const mapData = await fetch("data/map.json").then((response) => response.json());

const board = document.querySelector("#map-board");
const canvas = document.querySelector("#map-canvas");
const context = canvas.getContext("2d", { alpha: false });
const minimap = document.querySelector("#map-minimap");
const minimapContext = minimap.getContext("2d", { alpha: false });
const unitLayer = document.querySelector("#unit-layer");
const playerCornerOverlay = document.querySelector("#player-corner-overlay");
const teamOverlay = document.querySelector("#team-overlay");
const source = document.querySelector("#map-source");
const zoomInput = document.querySelector("#map-zoom");
const zoomOut = document.querySelector("#zoom-out");
const zoomIn = document.querySelector("#zoom-in");
const zoomValue = document.querySelector("#map-zoom-value");
const selectionCard = document.querySelector("#selection-card");
const playerEventsPopover = document.querySelector("#player-events-popover");
const playerProfilePopover = document.querySelector("#player-profile-popover");
const endgameOverlay = document.querySelector("#endgame-overlay");
const waveStatus = document.querySelector("#wave-status");
const wavePhase = document.querySelector("[data-wave-phase]");
const waveTitle = document.querySelector("[data-wave-title]");
const waveTimer = document.querySelector("[data-wave-timer]");
const waveDetail = document.querySelector("[data-wave-detail]");
const levelAnchors = document.querySelector("#level-anchors");
const replayControls = document.querySelector(".replay-controls");
const replayTime = document.querySelector("#replay-time");
const replayCurrentTime = document.querySelector("#replay-current-time");
const replayDuration = document.querySelector("#replay-duration");
const replayPlay = document.querySelector("#replay-play");
const replaySpeedDown = document.querySelector("#replay-speed-down");
const replaySpeedUp = document.querySelector("#replay-speed-up");
const replaySpeedValue = document.querySelector("#replay-speed-value");
const loadStateControls = document.querySelector("#load-state-controls");
const loadStatePlayer = document.querySelector("#load-state-player");
const loadStateDownload = document.querySelector("#load-state-download");
const iconModeButtons = [...document.querySelectorAll("[data-icon-mode]")];
const replayParams = new URLSearchParams(window.location.search);
const selectedReplayId =
  replayParams.get("replayGameId") || replayParams.get("gameId") || replayParams.get("matchId") || replayParams.get("id");
const initialReplaySeekMillis = parseReplaySeekMillis(replayParams.get("s"));

const GREEN_TILES = new Set(["Ygsb", "Yhdg"]);
const STONE_TILES = new Set(["Ysqd", "Ybtl", "Yrtl", "Ywmb"]);
const DARK_TILES = new Set(["Yblm"]);
const WATER_TILES = new Set(["Iice", "Wsng"]);
const TEAM_COLORS = ["#d54a3f", "#3876e8", "#22bfc5", "#8c62d9", "#efca46", "#f09336", "#58bf62", "#d16fc7"];
const BASE_VIEW_HEIGHT = 52;
const ZOOM_INTERNAL_AT_100_PERCENT = 3.4;
const ZOOM_STEP_PERCENT = 5;
const DEFAULT_ZOOM_PERCENT = 100;
const DEFAULT_ZOOM = zoomFromPercent(DEFAULT_ZOOM_PERCENT);
const ZOOM_STEP = zoomFromPercent(DEFAULT_ZOOM_PERCENT + ZOOM_STEP_PERCENT) - DEFAULT_ZOOM;
const MIN_VIEW_HEIGHT = BASE_VIEW_HEIGHT / zoomFromPercent(zoomInput.max);
const GAME_VIEW_ASPECT = 4 / 3;
const PLAYER_MAX_BUILD_ROWS = PLAYER_OWN_ROWS_BEFORE_LANE + PLAYER_SHARED_ROWS;
const GRID_PICK_TOLERANCE = 1.05;
const WORLD_UNITS_PER_CELL = Number(mapData.worldUnitsPerCell || mapData.war3CellSize || mapData.world?.cellSize || 128);
const SPAWN_ENTRY_WALL_UNITS_PER_CORNER = 3;
const CENTER_SEPARATOR_WIDTH = 9;
const SIDE_LANE_SEPARATOR_WIDTH = 1;
const SIDE_LANE_TOP_BROWN_ROWS = 4;
const TEAM_CENTER_BLOCK_HEIGHT_CELLS = 14;
const TEAM_CENTER_BLOCK_GAP_CELLS = 4;
const TEAM_KING_CENTER_OFFSET_CELLS = 10.5;
const TEAM_KING_ROSTER_GAP_PX = 4;
const TEAM_CENTER_GROUP_GAP_PX = 14;
const TEAM_CENTER_VERTICAL_PADDING_PX = 10;
const TEAM_CENTER_COLUMN_MARGIN_PX = 8;
const TEAM_CONTENT_FRAME_PADDING_PX = 6;
const TEAM_SEND_PANEL_GAP_PX = 6;
const TEAM_KING_HUD_GAP_PX = 3;
const TEAM_KING_MIN_SIZE_PX = 24;
const TEAM_KING_MAX_SIZE_PX = 54;
const SPAWN_PLATFORM_MIN_CELLS = 10;
const SPAWN_PLATFORM_PADDING = 1;
const SPAWN_PLATFORM_TOP_PADDING = 4;
const SPAWN_PLATFORM_BOTTOM_PADDING = 4;
const SPAWN_PLATFORM_MERGE_GAP = 2;
const SPAWN_PLATFORM_MIN_Y = 34;
const SPAWN_PLATFORM_MAX_Y = 82;
const PLAYER_BOUNDARY_ROWS = [59];
const KING_TOKEN_SPAN = 4.02;
const UTHER_ICON_PATH = "assets/ui/uther.png";
const BUILD_TOKEN_SPAN = 0.9;
const DEBUG_GRID_LABELS = false;
const DEFAULT_REPLAY_DURATION_MILLIS = 0;
const PLAYBACK_RATES = [1, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64];
const DEFAULT_PLAYBACK_RATE = PLAYBACK_RATES[0];
const DEFAULT_KING_HEALTH_PERCENT = 100;
const DEFAULT_KING_LIVES = 5;
const DEFAULT_ICON_MODE = "classic";
const ICON_MODE_STORAGE_KEY = "legionReplayIconMode:v2";
const ICON_MODE_DIRS = {
  classic: "command-buttons-classic",
  reforged: "command-buttons-reforged",
};
const PLAYER_EVENT_PREVIEW_LIMIT = 3;
const PLAYER_SEND_ICON_LIMIT = 10;
const PLAYER_CORNER_CARD_WIDTH_CELLS = 7.15;
const PLAYER_CORNER_CARD_MAX_HEIGHT_CELLS = 10.75;
const PLAYER_CORNER_CARD_SIDE_SEARCH_CELLS = 22;
const PLAYER_CORNER_CARD_GREY_THRESHOLD = 0.9;
const PLAYER_CORNER_CARD_PIN_PADDING_PX = 4;
const PLAYER_CORNER_CARD_WIDTH_PX = 216;
const PLAYER_CORNER_CARD_MAX_HEIGHT_PX = 360;
const PLAYER_CORNER_CARD_MIN_VISIBLE_WIDTH_PX = 112;
const PLAYER_CORNER_CARD_MIN_VISIBLE_HEIGHT_PX = 96;
const PLAYER_CORNER_CARD_BASE_CONTENT_HEIGHT_PX = 326;
const PLAYER_CORNER_ROLL_ICON_GAP_PX = 3;
const PLAYER_CORNER_ROLL_ICON_MIN_PX = 27;
const PLAYER_CORNER_ROLL_ICON_MAX_PX = 33;
const PLAYER_CORNER_ROLL_ICON_CELL_SCALE = 0.88;
const PLAYER_CORNER_ROLL_ICON_ZOOM_BOOST_PX = 6;
const REPLAY_CONTROLS_BASE_TARGET_WIDTH_PX = 590;
const REPLAY_CONTROLS_FIXED_TRACKS_PX = 410;
const REPLAY_LEVEL_ANCHOR_MIN_WIDTH_PX = 20;
const REPLAY_LEVEL_SEPARATOR_WIDTH_PX = 0;
const REPLAY_LEVEL_OUTCOME_TIME_TOLERANCE_MS = 75;
const REPLAY_RANGE_THUMB_SIZE_PX = 18;
const REPLAY_TIMELINE_RANGE_STEPS = 100000;
const PREP_EVENT_TYPES = new Set(["UNIT_BUILD", "UNIT_UPGRADE", "UNIT_SELL", "LUMBER_WISP", "LUMBER_UPGRADE"]);
// The replay action stream only records trained wisps; every player starts with one.
const BASE_WISP_COUNT = 1;
const DEFAULT_WAVE_CREEP_COUNT = 100;
const BOSS_WAVE_CREEP_COUNT = 12;
const BOSS_WAVE_LEVELS = new Set([10, 20, 30]);
const WAVE_CREEP_COUNT_OVERRIDES = new Map([[35, 2]]);
const PLAYER_CORNER_STATS = [
  ["gold", "Gold"],
  ["lumber", "Lumber"],
  ["wispLumberUp", "Wisps/Lumber Up"],
  ["income", "Income"],
  ["bounty", "Bounty"],
  ["value", "Value"],
  ["builtUnits", "Built"],
  ["upgrades", "Upgrades"],
  ["sends", "Sent (total)"],
  ["leaks", "Leaks (total)"],
  ["leaksCaught", "Leaks caught (total)"],
  ["challenges", "Challenges"],
];
const ENDGAME_SCORE_COLUMNS = [
  ["value", "Value"],
  ["income", "Inc"],
  ["leaks", "Leaks"],
  ["leaksCaught", "Catch"],
  ["sends", "Sent"],
  ["builtUnits", "Built"],
];
const ENDGAME_TEAM_TOTALS = [
  ["value", "Value"],
  ["income", "Income"],
  ["leaks", "Leaks"],
  ["sends", "Sent"],
];
const KING_UPGRADE_KEYS = {
  ATTACK: "attack",
  HP: "hp",
  REGEN: "reg",
};
const KING_SPELL_LABELS = {
  IMMOLATION: "Immolation",
  WAR_STOMP: "War Stomp",
  WAVE: "Wave",
};
const GREEN_RGB_BASE = [56, 132, 52];
const GREEN_RGB_LIGHT = [85, 154, 67];
const GREEN_RGB_DARK = [45, 105, 46];
const GREEN_RGB_DEEP = [22, 64, 27];
// Warcraft build locations are 128-unit grid coordinates. Each player slot has its own townhall-side anchor.
const PLAYER_BUILD_WORLD_ANCHORS = {
  1: { x: -7936, y: 5056 + 128 },
  2: { x: -7936, y: 3072 },
  3: { x: -1152 - 22 * 128, y: 5184 },
  4: { x: -1152 - 22 * 128, y: 3072 },
  5: { x: 1152, y: 5056 + 128 },
  6: { x: 1152, y: 3072 },
  7: { x: 6272 - 9 * 128, y: 5184 },
  8: { x: 6272 - 9 * 128, y: 3072 },
};
const PLAYER_BUILD_WORLD_BOUNDS = [
  { playerIds: [1, 2], x0: -7872, x1: -5440, y0: 2560, y1: 5376 },
  { playerIds: [3, 4], x0: -3840, x1: -1984, y0: 2368, y1: 4736 },
  { playerIds: [5, 6], x0: 2240, x1: 3648, y0: 2368, y1: 4800 },
  { playerIds: [7, 8], x0: 5248, x1: 6976, y0: 2624, y1: 4864 },
];
const MAP_WORLD_BY_SOURCE = {
  "Legion_TD_11.4_prccxmix3_W3C_Team_OZE.w3x": {
    offsetX: -8192,
    offsetY: -6144,
  },
};
const MIN_ZOOM = zoomFromPercent(zoomInput.min);
const MAX_ZOOM = zoomFromPercent(zoomInput.max);
const PLAY_BOUNDS_TOP_TRIM = 38;
const PLAY_BOUNDS_BOTTOM_TRIM = PLAY_BOUNDS_TOP_TRIM;
const PLAY_BOUNDS = {
  x: 3,
  y: PLAY_BOUNDS_TOP_TRIM,
  width: mapData.cellsX - 5,
  height: mapData.cellsY - PLAY_BOUNDS_TOP_TRIM - PLAY_BOUNDS_BOTTOM_TRIM,
};
const MAP_WORLD = mapWorldFromMapData(mapData);
zoomInput.value = String(zoomPercent(DEFAULT_ZOOM));
zoomValue.value = `${zoomPercent(DEFAULT_ZOOM)}%`;
zoomValue.textContent = `${zoomPercent(DEFAULT_ZOOM)}%`;

const state = {
  zoom: DEFAULT_ZOOM,
  frame: undefined,
  drag: undefined,
  minimapDrag: undefined,
  replay: undefined,
  replayIndex: emptyReplayIndex(),
  timeMillis: initialReplaySeekMillis,
  durationMillis: DEFAULT_REPLAY_DURATION_MILLIS,
  playStartMillis: undefined,
  playStartTimeMillis: 0,
  playbackHandle: undefined,
  playbackRate: DEFAULT_PLAYBACK_RATE,
  prepHighlightWaveLevel: undefined,
  playerEventsAnchor: undefined,
  playerProfileRequest: undefined,
  selectedToken: undefined,
  selectedLoadStatePlayerId: undefined,
  endgameDismissed: false,
  endgameOverlayKey: undefined,
  iconMode: initialIconMode(),
  tokens: [],
  miniCache: undefined,
};

window.__legionMap = { mapData, state, draw };

let lastPublishedReplayId;
let lastPublishedSeekParam;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseReplaySeekMillis(value) {
  if (!value) return 0;

  const seconds = Number(value);

  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : 0;
}

function replaySeekParamForMillis(milliseconds, { precise = true } = {}) {
  const millis = Math.max(0, Math.round(Number(milliseconds) || 0));
  if (!precise) return String(Math.floor(millis / 1000));
  if (millis % 1000 === 0) return String(millis / 1000);
  return (millis / 1000)
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

function currentReplayUrlId() {
  return String(state.replay?.replay?.id ?? selectedReplayId ?? "");
}

function publishReplayTime() {
  const replayGameId = currentReplayUrlId();

  if (!replayGameId) return;

  const seekParam = replaySeekParamForMillis(state.timeMillis, { precise: state.playbackHandle === undefined });

  if (replayGameId === lastPublishedReplayId && seekParam === lastPublishedSeekParam) {
    return;
  }

  lastPublishedReplayId = replayGameId;
  lastPublishedSeekParam = seekParam;

  const url = new URL(window.location.href);
  url.searchParams.delete("replayGameId");
  url.searchParams.delete("gameId");
  url.searchParams.delete("matchId");
  url.searchParams.delete("id");
  url.searchParams.delete("s");
  url.searchParams.set("replayGameId", replayGameId);
  url.searchParams.set("s", seekParam);
  window.history.replaceState(window.history.state, "", url);

  if (window.parent && window.parent !== window) {
    const targetOrigin = window.location.origin === "null" ? "*" : window.location.origin;

    window.parent.postMessage(
      {
        type: "legionReplayViewerTime",
        replayGameId,
        timeMillis: state.timeMillis,
      },
      targetOrigin,
    );
  }
}

function emptyReplayIndex() {
  return {
    statsByPlayer: new Map(),
    economyByPlayer: new Map(),
    resourcesByPlayer: new Map(),
    rollsByPlayer: new Map(),
    eventsByPlayer: new Map(),
    kingUpgradesByTeam: new Map(),
    unitSends: [],
    timelineEvents: [],
    waveEvents: [],
  };
}

function validIconMode(mode) {
  return Object.prototype.hasOwnProperty.call(ICON_MODE_DIRS, mode) ? mode : DEFAULT_ICON_MODE;
}

function initialIconMode() {
  const requested = replayParams.get("icons") || replayParams.get("iconMode");
  if (requested) return validIconMode(requested.toLowerCase());

  try {
    return validIconMode(window.localStorage.getItem(ICON_MODE_STORAGE_KEY));
  } catch {
    return DEFAULT_ICON_MODE;
  }
}

function zoomFromPercent(percent) {
  return (Number(percent) / 100) * ZOOM_INTERNAL_AT_100_PERCENT;
}

function zoomPercent(zoom) {
  return Math.round((zoom / ZOOM_INTERNAL_AT_100_PERCENT) * 100);
}

function mapWorldFromMapData(data) {
  const cellSize = data.world?.cellSize || 128;
  const sourceWorld = MAP_WORLD_BY_SOURCE[data.source] || {};
  const offsetX = data.world?.offsetX ?? sourceWorld.offsetX ?? -(data.cellsX * cellSize) / 2;
  const offsetY = data.world?.offsetY ?? sourceWorld.offsetY ?? -(data.cellsY * cellSize) / 2;

  return {
    offsetX,
    offsetY,
    cellSize,
    width: data.world?.width ?? data.cellsX * cellSize,
    height: data.world?.height ?? data.cellsY * cellSize,
    calibrated: Boolean(data.world || MAP_WORLD_BY_SOURCE[data.source]),
  };
}

function sourceY(displayY) {
  return mapData.cellsY - 1 - displayY;
}

function cellIndex(displayX, displayY) {
  const x = clamp(Math.floor(displayX), 0, mapData.cellsX - 1);
  const y = clamp(Math.floor(displayY), 0, mapData.cellsY - 1);
  return sourceY(y) * mapData.cellsX + x;
}

function tileIdAt(displayX, displayY) {
  return mapData.tileIds[parseInt(mapData.cells[cellIndex(displayX, displayY)], 16)] || "Ybtl";
}

function variationAt(displayX, displayY) {
  return parseInt(mapData.variations[cellIndex(displayX, displayY)] || "0", 16);
}

function hasWaterAt(displayX, displayY) {
  return mapData.water[cellIndex(displayX, displayY)] === "1";
}

function terrainKind(tileId) {
  if (GREEN_TILES.has(tileId)) return "green";
  if (STONE_TILES.has(tileId)) return "stone";
  if (DARK_TILES.has(tileId)) return "dark";
  if (WATER_TILES.has(tileId)) return "cold";
  if (tileId === "Jdtr") return "rough";
  if (tileId === "Ydrt" || tileId === "Ydtr") return "dirt";
  return "stone";
}

function isGreenCell(x, y) {
  return GREEN_TILES.has(tileIdAt(x, y));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function longestContiguousRun(rows) {
  const groups = [];
  let current = [];
  for (const row of rows) {
    if (!current.length || row.y === current[current.length - 1].y + 1) {
      current.push(row);
    } else {
      groups.push(current);
      current = [row];
    }
  }
  if (current.length) groups.push(current);
  return groups.sort((a, b) => b.length - a.length)[0] || [];
}

function straightenedBuildRegion(cells, left, right, top, bottom) {
  const original = new Set(cells.map(([x, y]) => `${x},${y}`));
  const rows = [];

  for (let y = top; y <= bottom; y += 1) {
    const xs = [];
    for (let x = left; x <= right; x += 1) {
      if (original.has(`${x},${y}`)) xs.push(x);
    }
    if (xs.length >= BUILD_ROW_MIN_CELLS) {
      rows.push({
        y,
        left: Math.min(...xs),
        right: Math.max(...xs),
        width: xs.length,
      });
    }
  }

  if (!rows.length) return new Set();

  const minWidth = Math.min(...rows.map((row) => row.width));
  const maxWidth = Math.max(...rows.map((row) => row.width));
  const wideThreshold = (minWidth + maxWidth) / 2;
  const wideRows = longestContiguousRun(rows.filter((row) => row.width >= wideThreshold));
  const rawWideTop = wideRows[0]?.y ?? rows[0].y;
  const rawWideBottom = wideRows[wideRows.length - 1]?.y ?? rows[rows.length - 1].y;
  const firstRegionOffset = left <= PLAY_BOUNDS.x + 3 ? 1 : 0;
  const wideTop = Math.min(rawWideTop + 2 + firstRegionOffset, rawWideBottom);
  const originalWideLeft = Math.min(...wideRows.map((row) => row.left));
  const originalWideRight = Math.max(...wideRows.map((row) => row.right));
  const narrowRows = rows.filter((row) => row.y < wideTop || row.y > rawWideBottom);
  const narrowLefts = narrowRows.map((row) => row.left);
  const narrowRights = narrowRows.map((row) => row.right);
  const narrowAnchorsLeft = Math.abs(median(narrowLefts) - originalWideLeft) <= Math.abs(median(narrowRights) - originalWideRight);
  const narrowInnerEdge = narrowAnchorsLeft ? median(narrowRights) : median(narrowLefts);
  const narrowLeft = narrowAnchorsLeft ? narrowInnerEdge - BUILD_SPAWN_BAND_WIDTH + 1 : narrowInnerEdge;
  const narrowRight = narrowAnchorsLeft ? narrowInnerEdge : narrowInnerEdge + BUILD_SPAWN_BAND_WIDTH - 1;
  const pocketLeft = narrowAnchorsLeft ? narrowRight + 1 : Math.max(originalWideLeft, narrowLeft - BUILD_SIDE_POCKET_WIDTH);
  const pocketRight = narrowAnchorsLeft ? Math.min(originalWideRight, narrowRight + BUILD_SIDE_POCKET_WIDTH) : narrowLeft - 1;
  const laneTop = Math.max(PLAY_BOUNDS.y, wideTop - BUILD_SPAWN_RUN_ROWS - 1);
  const laneBottom = laneTop + PLAYER_LANE_VERTICAL_SPAN - 1;
  const pocketTop = laneTop + Math.floor((PLAYER_LANE_VERTICAL_SPAN - BUILD_SIDE_POCKET_HEIGHT) / 2);
  const pocketBottom = pocketTop + BUILD_SIDE_POCKET_HEIGHT - 1;
  const result = new Set();

  for (let y = laneTop; y <= laneBottom; y += 1) {
    for (let x = narrowLeft; x <= narrowRight; x += 1) result.add(`${x},${y}`);
  }

  for (let y = pocketTop; y <= pocketBottom; y += 1) {
    for (let x = pocketLeft; x <= pocketRight; x += 1) result.add(`${x},${y}`);
  }

  return result;
}

function buildBuildGridCells() {
  const visited = new Set();
  const result = new Set();
  const minX = PLAY_BOUNDS.x;
  const maxX = PLAY_BOUNDS.x + PLAY_BOUNDS.width;
  const minY = PLAY_BOUNDS.y;
  const maxY = PLAY_BOUNDS.y + PLAY_BOUNDS.height;

  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const startKey = `${x},${y}`;
      if (visited.has(startKey) || !isGreenCell(x, y)) continue;

      const stack = [[x, y]];
      const cells = [];
      let left = x;
      let right = x;
      let top = y;
      let bottom = y;
      visited.add(startKey);

      while (stack.length) {
        const [cx, cy] = stack.pop();
        cells.push([cx, cy]);
        left = Math.min(left, cx);
        right = Math.max(right, cx);
        top = Math.min(top, cy);
        bottom = Math.max(bottom, cy);

        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const key = `${nx},${ny}`;
          if (nx < minX || nx >= maxX || ny < minY || ny >= maxY || visited.has(key) || !isGreenCell(nx, ny)) continue;
          visited.add(key);
          stack.push([nx, ny]);
        }
      }

      const width = right - left + 1;
      const height = bottom - top + 1;
      if (cells.length >= BUILD_REGION_MIN_CELLS && width >= BUILD_REGION_MIN_SPAN && height >= BUILD_REGION_MIN_SPAN) {
        for (const key of straightenedBuildRegion(cells, left, right, top, bottom)) result.add(key);
      }
    }
  }

  return result;
}

const BUILD_GRID_CELLS = buildBuildGridCells();
window.__legionMap.buildGridCells = BUILD_GRID_CELLS;

function isBuildCell(x, y) {
  return BUILD_GRID_CELLS.has(`${Math.floor(x)},${Math.floor(y)}`);
}

function replayWorldToDisplayCell(worldX, worldY) {
  const left =
    Number(mapData.worldLeft ?? mapData.minWorldX ?? mapData.bounds?.worldLeft ?? Number.NaN) ||
    MAP_WORLD.offsetX ||
    -(mapData.cellsX * WORLD_UNITS_PER_CELL) / 2;
  const bottom =
    Number(mapData.worldBottom ?? mapData.minWorldY ?? mapData.bounds?.worldBottom ?? Number.NaN) ||
    MAP_WORLD.offsetY ||
    -(mapData.cellsY * WORLD_UNITS_PER_CELL) / 2;

  return {
    x: (Number(worldX) - left) / WORLD_UNITS_PER_CELL,
    y: mapData.cellsY - (Number(worldY) - bottom) / WORLD_UNITS_PER_CELL,
  };
}

function firstFiniteNumber(source, keys) {
  for (const key of keys) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

function snapBuildCoordinate(value) {
  return Math.round(Number(value) * 2) / 2;
}

function playerBuildDisplayOffset(playerId) {
  const grid = playerGridForPlayerId(playerId);
  const laneIndex = grid?.laneIndex ?? grid?.lane?.laneIndex;

  return {
    x: laneIndex === undefined || laneIndex === 0 ? 1 : 0,
    y: 0.5,
  };
}

function displayPointToBuildCenter(point, playerId) {
  const offset = playerBuildDisplayOffset(playerId);

  return {
    x: snapBuildCoordinate(point.x + offset.x),
    y: snapBuildCoordinate(point.y + offset.y),
  };
}

function worldToDisplayPoint(worldX, worldY) {
  const cellSize = MAP_WORLD.cellSize || 128;
  const sourceX = (Number(worldX) - MAP_WORLD.offsetX) / cellSize;
  const sourceY = (Number(worldY) - MAP_WORLD.offsetY) / cellSize;

  return {
    x: sourceX,
    y: mapData.cellsY - sourceY,
  };
}

function playerBuildAnchor(playerId) {
  return PLAYER_BUILD_WORLD_ANCHORS[Number(playerId)];
}

function rawBuildPoint(event) {
  const rawPoint = worldToDisplayPoint(event.locationX, event.locationY);
  return displayPointToBuildCenter(rawPoint, event.playerId);
}

function playerBuildBound(event) {
  const playerId = Number(event.playerId);
  const anchor = playerBuildAnchor(playerId);
  const directIndex = PLAYER_BUILD_WORLD_BOUNDS.findIndex((bound) => bound.playerIds.includes(playerId));
  if (directIndex !== -1 && PLAYER_BUILD_COMPONENTS[directIndex]) {
    return {
      bounds: PLAYER_BUILD_WORLD_BOUNDS[directIndex],
      component: PLAYER_BUILD_COMPONENTS[directIndex],
      componentIndex: directIndex,
      anchor,
    };
  }

  const worldX = Number(event.locationX);
  let bestIndex = -1;
  let bestDistance = Infinity;

  for (let index = 0; index < PLAYER_BUILD_WORLD_BOUNDS.length; index += 1) {
    const bound = PLAYER_BUILD_WORLD_BOUNDS[index];
    const centerX = (bound.x0 + bound.x1) / 2;
    const distance = Math.abs(worldX - centerX);

    if (distance < bestDistance && PLAYER_BUILD_COMPONENTS[index]) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  if (bestIndex === -1) return undefined;

  return {
    bounds: PLAYER_BUILD_WORLD_BOUNDS[bestIndex],
    component: PLAYER_BUILD_COMPONENTS[bestIndex],
    componentIndex: bestIndex,
    anchor,
  };
}

function worldToBuildPoint(event) {
  return rawBuildPoint(event);
}

function buildTokenPlacement(event) {
  const point = worldToBuildPoint(event);
  const center = { x: point.x, y: point.y };
  const halfSpan = BUILD_TOKEN_SPAN / 2;

  return {
    cellX: center.x - halfSpan,
    cellY: center.y - halfSpan,
    centerCellX: center.x,
    centerCellY: center.y,
  };
}

function buildGridComponents() {
  const seen = new Set();
  const components = [];

  for (const key of BUILD_GRID_CELLS) {
    if (seen.has(key)) continue;
    const [startX, startY] = key.split(",").map(Number);
    const stack = [[startX, startY]];
    seen.add(key);
    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;
    let count = 0;

    while (stack.length) {
      const [x, y] = stack.pop();
      count += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nextKey = `${x + dx},${y + dy}`;
        if (!BUILD_GRID_CELLS.has(nextKey) || seen.has(nextKey)) continue;
        seen.add(nextKey);
        stack.push([x + dx, y + dy]);
      }
    }

    components.push({ minX, maxX, minY, maxY, count });
  }

  return components.sort((a, b) => a.minX - b.minX);
}

function scoreLaneColumn(component, rows, x0) {
  let score = 0;

  for (const row of rows) {
    for (let x = x0; x < x0 + PLAYER_LANE_WIDTH; x += 1) {
      if (isBuildCell(x, row.y)) score += 1;
    }
  }

  return score;
}

function laneColumnsForComponent(component) {
  const rows = componentBuildRows(component);
  const usableRows = rows
    .filter((row) => row.width >= PLAYER_LANE_WIDTH - 2)
    .sort((a, b) => Math.abs(a.width - PLAYER_LANE_WIDTH) - Math.abs(b.width - PLAYER_LANE_WIDTH));
  const sampleRows = usableRows.slice(0, Math.max(6, Math.ceil(usableRows.length * 0.35)));
  const sample = sampleRows.length ? sampleRows : rows;
  const candidates = new Set();

  for (const row of sample) {
    candidates.add(row.left);
    candidates.add(row.right - PLAYER_LANE_WIDTH + 1);
    candidates.add(Math.round((row.left + row.right + 1 - PLAYER_LANE_WIDTH) / 2));
  }

  let bestX0 = component.minX;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const x0 = clamp(Number(candidate), component.minX, component.maxX - PLAYER_LANE_WIDTH + 1);
    const score = scoreLaneColumn(component, sample, x0);
    if (score > bestScore) {
      bestScore = score;
      bestX0 = x0;
    }
  }

  return {
    x0: bestX0,
    x1: bestX0 + PLAYER_LANE_WIDTH,
  };
}

function boundaryForComponent(component) {
  return (
    PLAYER_BOUNDARY_ROWS.find((y) => y > component.minY + 4 && y < component.maxY - 4) ??
    Math.round((component.minY + component.maxY + 1) / 2)
  );
}

function playerGridSharedStartRow(component, spawnEdge, originY) {
  const sharedRows = componentBuildRows(component).filter((row) => row.width > PLAYER_LANE_WIDTH);
  if (!sharedRows.length) return PLAYER_OWN_ROWS_BEFORE_LANE;

  if (spawnEdge === "top") {
    const firstSharedY = Math.min(...sharedRows.map((row) => row.y));
    return Math.max(0, firstSharedY - originY);
  }

  const lastSharedY = Math.max(...sharedRows.map((row) => row.y));
  return Math.max(0, originY - lastSharedY - 1);
}

function buildPlayerLaneGrids(components) {
  const sorted = [...components].sort((a, b) => a.minX - b.minX || a.minY - b.minY);
  const sideSplit = Math.ceil(sorted.length / 2);

  return sorted.map((component, index) => {
    const columns = laneColumnsForComponent(component);
    const side = index < sideSplit ? "west" : "east";
    const laneIndex = index < sideSplit ? index : index - sideSplit;
    const bound = PLAYER_BUILD_WORLD_BOUNDS[index];
    const lane = {
      id: `${side}-${laneIndex}`,
      side,
      laneIndex,
      componentIndex: index,
      component,
      x0: columns.x0,
      x1: columns.x1,
      y0: component.minY,
      y1: component.maxY + 1,
      boundaryY: boundaryForComponent(component),
      playerIds: bound?.playerIds || [],
    };

    lane.players = (bound?.playerIds || []).map((playerId, playerInLane) => {
      const spawnEdge = playerInLane === 0 ? "top" : "bottom";
      const originY = spawnEdge === "top" ? lane.y0 : lane.y1;
      return {
        id: `${lane.id}-${spawnEdge}`,
        laneId: lane.id,
        side,
        laneIndex,
        componentIndex: index,
        playerId,
        playerInLane,
        spawnEdge,
        originX: lane.x0,
        originY,
        rowDir: spawnEdge === "top" ? 1 : -1,
        sharedStartRow: playerGridSharedStartRow(component, spawnEdge, originY),
        lane,
      };
    });

    return lane;
  });
}

function playerGridMaxRows(grid) {
  const availableRows = grid.rowDir > 0 ? grid.lane.y1 - grid.originY : grid.originY - grid.lane.y0;
  const configuredRows = Math.max(PLAYER_MAX_BUILD_ROWS, Number(grid.sharedStartRow || 0) + PLAYER_SHARED_ROWS);
  return Math.max(0, Math.min(configuredRows, Math.floor(availableRows)));
}

function playerGridCellTopLeft(grid, col, row) {
  return {
    x: grid.originX + col,
    y: grid.rowDir > 0 ? grid.originY + row : grid.originY - row - 1,
  };
}

function playerGridCellY(grid, row) {
  return grid.rowDir > 0 ? grid.originY + row : grid.originY - row - 1;
}

function componentBuildRowAt(component, y) {
  return componentBuildRows(component).find((row) => row.y === y);
}

function playerGridRowBounds(grid, row) {
  const maxRows = playerGridMaxRows(grid);
  const clampedRow = clamp(Math.floor(Number(row) || 0), 0, Math.max(0, maxRows - 1));
  const y = playerGridCellY(grid, clampedRow);
  const componentRow = componentBuildRowAt(grid.lane.component, y);
  const adjacentSharedRow = componentBuildRowAt(grid.lane.component, y + grid.rowDir);
  const sharedRow =
    componentRow && componentRow.width > PLAYER_LANE_WIDTH
      ? componentRow
      : clampedRow >= grid.sharedStartRow && adjacentSharedRow && adjacentSharedRow.width > PLAYER_LANE_WIDTH
        ? adjacentSharedRow
        : undefined;
  const isSharedRow = Boolean(sharedRow);
  const left = isSharedRow ? sharedRow.left : grid.originX;
  const right = isSharedRow ? sharedRow.right + 1 : grid.originX + PLAYER_LANE_WIDTH;

  return {
    y,
    left,
    right,
    minCol: left - grid.originX,
    maxCol: right - grid.originX,
    width: right - left,
    shared: Boolean(isSharedRow),
  };
}

function playerGridForPlayerId(playerId) {
  return PLAYER_GRIDS_BY_PLAYER_ID.get(Number(playerId));
}

function replayRowToDisplayCell(row) {
  const cellX = firstFiniteNumber(row, ["cellX", "cell_x", "mapCellX", "map_cell_x"]);
  const cellY = firstFiniteNumber(row, ["cellY", "cell_y", "mapCellY", "map_cell_y"]);

  if (cellX !== undefined && cellY !== undefined) {
    return { x: cellX, y: cellY };
  }

  const worldX = firstFiniteNumber(row, ["locationX", "location_x", "x", "posX", "pos_x", "worldX", "world_x", "mapX", "map_x"]);
  const worldY = firstFiniteNumber(row, ["locationY", "location_y", "y", "posY", "pos_y", "worldY", "world_y", "mapY", "map_y"]);

  if (worldX === undefined || worldY === undefined) return undefined;
  const point = replayWorldToDisplayCell(worldX, worldY);
  return displayPointToBuildCenter(point, row.playerId ?? row.player_id);
}

function localPointInPlayerGrid(grid, point) {
  return {
    col: point.x - grid.originX,
    row: grid.rowDir > 0 ? point.y - grid.originY : grid.originY - point.y,
  };
}

function outsideGridDistance(grid, local) {
  const maxRows = playerGridMaxRows(grid);
  const rowForBounds = clamp(local.row, 0, Math.max(0, maxRows - 1e-6));
  const bounds = playerGridRowBounds(grid, rowForBounds);
  const dx = Math.max(0, bounds.minCol - local.col, local.col - bounds.maxCol);
  const dy = Math.max(0, -local.row, local.row - maxRows);
  return Math.hypot(dx, dy);
}

function classifyDisplayCell(point, options = {}) {
  const preferredGrid = playerGridForPlayerId(options.playerId);
  const grids = preferredGrid ? [preferredGrid, ...PLAYER_GRIDS.filter((grid) => grid !== preferredGrid)] : PLAYER_GRIDS;
  let best;

  for (const grid of grids) {
    const local = localPointInPlayerGrid(grid, point);
    const outside = outsideGridDistance(grid, local);
    if (outside > GRID_PICK_TOLERANCE) continue;

    const score = outside + (preferredGrid && grid === preferredGrid ? -1000 : 0);
    if (!best || score < best.score) {
      const maxRows = playerGridMaxRows(grid);
      const row = Math.floor(clamp(local.row, 0, maxRows - 1e-6));
      const bounds = playerGridRowBounds(grid, row);
      const col = Math.floor(clamp(local.col, bounds.minCol, bounds.maxCol - 1e-6));
      best = {
        score,
        grid,
        local,
        col,
        row,
        offsetX: local.col - col,
        offsetY: local.row - row,
        rowBounds: bounds,
        cellX: point.x,
        cellY: point.y,
        legal: outside <= 1e-6,
      };
    }
  }

  return best;
}

function classifyReplayRow(row) {
  const point = replayRowToDisplayCell(row);
  if (!point) return undefined;
  return classifyDisplayCell(point, { playerId: row.playerId ?? row.player_id });
}

function classifyBuildEvent(event, point = worldToBuildPoint(event)) {
  return classifyDisplayCell(point, { playerId: event.playerId });
}

function addInferredPlayerGridBuildCells(grids) {
  const sourceBuildCells = new Set(BUILD_GRID_CELLS);

  for (const grid of grids) {
    const rows = playerGridMaxRows(grid);
    for (let row = 0; row < rows; row += 1) {
      const bounds = playerGridRowBounds(grid, row);
      let sourceRowWidth = 0;
      for (let x = grid.lane.component.minX; x <= grid.lane.component.maxX; x += 1) {
        if (sourceBuildCells.has(`${x},${bounds.y}`)) sourceRowWidth += 1;
      }
      if (sourceRowWidth === 0) continue;

      const keepSharedEdgeAsSource = bounds.shared && sourceRowWidth <= PLAYER_LANE_WIDTH;

      for (let x = bounds.left; x < bounds.right; x += 1) {
        const key = `${x},${bounds.y}`;
        if (keepSharedEdgeAsSource && !sourceBuildCells.has(key)) continue;
        if (x >= 0 && x < mapData.cellsX && bounds.y >= 0 && bounds.y < mapData.cellsY) {
          BUILD_GRID_CELLS.add(key);
        }
      }
    }
  }
}

function buildSidePocketGeometries(lanes) {
  const geometries = [];

  for (const lane of lanes) {
    const rows = componentBuildRows(lane.component);
    const pocketRows = rows.filter((row) => row.width > PLAYER_LANE_WIDTH);
    if (!pocketRows.length) continue;

    const pocketTop = Math.min(...pocketRows.map((row) => row.y));
    const pocketBottom = Math.max(...pocketRows.map((row) => row.y));
    const pocketLeft = lane.x0 === lane.component.minX ? lane.x1 : lane.component.minX;
    const pocketRight = lane.x0 === lane.component.minX ? lane.component.maxX : lane.x0 - 1;

    geometries.push({
      laneId: lane.id,
      x0: pocketLeft,
      x1: pocketRight + 1,
      y0: pocketTop,
      y1: pocketBottom + 1,
      visualY0: pocketTop + BUILD_SIDE_POCKET_Y_OFFSET,
      visualY1: pocketTop + BUILD_SIDE_POCKET_Y_OFFSET + BUILD_SIDE_POCKET_HEIGHT,
      componentY0: lane.component.minY,
      componentY1: lane.component.maxY + 1,
    });
  }

  return geometries;
}

function buildSidePocketTerrainCells(geometries) {
  const result = new Set();

  for (const geometry of geometries) {
    for (let y = geometry.componentY0; y < geometry.componentY1; y += 1) {
      if (y >= geometry.y0 && y < geometry.y1) continue;
      for (let x = geometry.x0; x < geometry.x1; x += 1) {
        result.add(`${x},${y}`);
      }
    }
  }

  return result;
}

function buildSidePocketDebugLabels(geometries) {
  const labels = [];

  for (const geometry of geometries) {
    for (let row = 0; row < BUILD_SIDE_POCKET_HEIGHT; row += 1) {
      for (let col = 0; col < BUILD_SIDE_POCKET_WIDTH; col += 1) {
        labels.push({
          x: geometry.x0 + col + 0.5,
          y: geometry.visualY0 + row + 0.5,
          label: `${row + 1},${col + 1}`,
        });
      }
    }
  }

  return labels;
}

function buildGreenTextureIndex() {
  const cells = new Set(BUILD_GRID_CELLS);

  for (const geometry of SIDE_POCKET_GEOMETRIES) {
    for (let row = 0; row < BUILD_SIDE_POCKET_HEIGHT; row += 1) {
      for (let col = 0; col < BUILD_SIDE_POCKET_WIDTH; col += 1) {
        cells.add(`${geometry.x0 + col},${geometry.y0 + row}`);
      }
    }
  }

  const seen = new Set();
  const byCell = new Map();
  const areas = [];

  for (const key of cells) {
    if (seen.has(key)) continue;
    const [startX, startY] = key.split(",").map(Number);
    const stack = [[startX, startY]];
    const areaCells = [];
    seen.add(key);
    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;

    while (stack.length) {
      const [x, y] = stack.pop();
      areaCells.push(`${x},${y}`);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nextKey = `${x + dx},${y + dy}`;
        if (!cells.has(nextKey) || seen.has(nextKey)) continue;
        seen.add(nextKey);
        stack.push([x + dx, y + dy]);
      }
    }

    const area = {
      index: areas.length,
      minX,
      maxX,
      minY,
      maxY,
      count: areaCells.length,
      seed: 97 + areas.length * 53,
    };

    for (const cell of areaCells) byCell.set(cell, area);
    areas.push(area);
  }

  return { areas, byCell };
}

function buildLocalDebugGridLabels(lanes, sidePocketGeometries) {
  const labels = new Map();
  const sidePocketCells = new Set();

  for (const geometry of sidePocketGeometries) {
    for (let y = geometry.y0; y < geometry.y1; y += 1) {
      for (let x = geometry.x0; x < geometry.x1; x += 1) sidePocketCells.add(`${x},${y}`);
    }
  }

  for (const lane of lanes) {
    for (let y = lane.y0; y < lane.y1; y += 1) {
      for (let x = lane.x0; x < lane.x1; x += 1) {
        if (isBuildCell(x, y)) labels.set(`${x},${y}`, `${y - lane.y0 + 1},${x - lane.x0 + 1}`);
      }
    }
  }

  for (const key of sidePocketCells) labels.delete(key);

  return labels;
}

const BUILD_COMPONENTS = buildGridComponents();
const PLAYER_BUILD_COMPONENTS = BUILD_COMPONENTS.slice(0, PLAYER_BUILD_WORLD_BOUNDS.length);
const RENDER_BOUNDS_BOTTOM_Y = PLAYER_BUILD_COMPONENTS.length
  ? Math.min(PLAY_BOUNDS.y + PLAY_BOUNDS.height, Math.max(...PLAYER_BUILD_COMPONENTS.map((component) => component.maxY)) + 1)
  : PLAY_BOUNDS.y + PLAY_BOUNDS.height;
const PLAYER_LANE_GRIDS = buildPlayerLaneGrids(PLAYER_BUILD_COMPONENTS);
const PLAYER_GRIDS = PLAYER_LANE_GRIDS.flatMap((lane) => lane.players);
const PLAYER_GRIDS_BY_PLAYER_ID = new Map(PLAYER_GRIDS.map((grid) => [Number(grid.playerId), grid]));
addInferredPlayerGridBuildCells(PLAYER_GRIDS);
const SIDE_POCKET_GEOMETRIES = buildSidePocketGeometries(PLAYER_LANE_GRIDS);
const SIDE_POCKET_TERRAIN_CELLS = buildSidePocketTerrainCells(SIDE_POCKET_GEOMETRIES);
const SIDE_POCKET_DEBUG_LABELS = buildSidePocketDebugLabels(SIDE_POCKET_GEOMETRIES);
const GREEN_TEXTURE_INDEX = buildGreenTextureIndex();
const LOCAL_DEBUG_GRID_LABELS = buildLocalDebugGridLabels(PLAYER_LANE_GRIDS, SIDE_POCKET_GEOMETRIES);
const LANE_BANDS = buildLaneBands(BUILD_COMPONENTS);
const SPAWN_PLATFORMS = buildSpawnPlatforms();
const TOP_PLATFORM_LANE_FILL_BOTTOM = topPlatformLaneFillBottom();
const PLAYER_BOUNDARIES = buildPlayerBoundaries();
const SPAWN_ENTRY_UNIT_CELLS = buildSpawnEntryUnitCells();
const CENTER_SEPARATOR =
  BUILD_COMPONENTS.length >= 4
    ? {
        x0: BUILD_COMPONENTS[1].maxX + 1,
        x1: BUILD_COMPONENTS[2].minX - 1,
        y0: PLAY_BOUNDS.y,
        y1: PLAY_BOUNDS.y + PLAY_BOUNDS.height - 1,
      }
    : undefined;
const CENTER_BAND = LANE_BANDS.find((band) => band.role === "center");
const KING_PLATFORMS = buildKingPlatforms();
const OMITTED_CENTER_SPANS = buildOmittedCenterSpans();
const RENDER_BOUNDS = {
  x: mapXToRenderX(PLAY_BOUNDS.x),
  y: PLAY_BOUNDS.y,
  width: mapXToRenderX(PLAY_BOUNDS.x + PLAY_BOUNDS.width) - mapXToRenderX(PLAY_BOUNDS.x),
  height: Math.max(1, RENDER_BOUNDS_BOTTOM_Y - PLAY_BOUNDS.y),
};
window.__legionMap.buildComponents = BUILD_COMPONENTS;
window.__legionMap.playerLaneGrids = PLAYER_LANE_GRIDS;
window.__legionMap.playerGrids = PLAYER_GRIDS;
window.__legionMap.playerBuildWorldBounds = PLAYER_BUILD_WORLD_BOUNDS;
window.__legionMap.playerBuildWorldAnchors = PLAYER_BUILD_WORLD_ANCHORS;
window.__legionMap.laneBands = LANE_BANDS;
window.__legionMap.spawnPlatforms = SPAWN_PLATFORMS;
window.__legionMap.topPlatformLaneFillBottom = TOP_PLATFORM_LANE_FILL_BOTTOM;
window.__legionMap.kingPlatforms = KING_PLATFORMS;
window.__legionMap.playerBoundaries = PLAYER_BOUNDARIES;
window.__legionMap.spawnEntryUnitCells = SPAWN_ENTRY_UNIT_CELLS;
window.__legionMap.sidePocketGeometries = SIDE_POCKET_GEOMETRIES;
window.__legionMap.sidePocketTerrainCells = SIDE_POCKET_TERRAIN_CELLS;
window.__legionMap.sidePocketDebugLabels = SIDE_POCKET_DEBUG_LABELS;
window.__legionMap.greenTextureAreas = GREEN_TEXTURE_INDEX.areas;
window.__legionMap.localDebugGridLabels = LOCAL_DEBUG_GRID_LABELS;
window.__legionMap.centerSeparator = CENTER_SEPARATOR;
window.__legionMap.omittedCenterSpans = OMITTED_CENTER_SPANS;
window.__legionMap.renderBounds = RENDER_BOUNDS;
window.__legionMap.displayKindAt = displayKindAt;
window.__legionMap.replayWorldToDisplayCell = replayWorldToDisplayCell;
window.__legionMap.classifyReplayRow = classifyReplayRow;
board.dataset.components = JSON.stringify(BUILD_COMPONENTS);
board.dataset.playerLaneGrids = JSON.stringify(
  PLAYER_LANE_GRIDS.map((lane) => ({
    id: lane.id,
    side: lane.side,
    laneIndex: lane.laneIndex,
    componentIndex: lane.componentIndex,
    x0: lane.x0,
    x1: lane.x1,
    y0: lane.y0,
    y1: lane.y1,
    boundaryY: lane.boundaryY,
    playerIds: lane.playerIds,
    players: lane.players.map(({ lane, ...player }) => player),
  })),
);
board.dataset.playerBuildWorldAnchors = JSON.stringify(PLAYER_BUILD_WORLD_ANCHORS);
board.dataset.laneBands = JSON.stringify(LANE_BANDS);
board.dataset.spawnPlatforms = JSON.stringify(SPAWN_PLATFORMS);
board.dataset.topPlatformLaneFillBottom = String(TOP_PLATFORM_LANE_FILL_BOTTOM);
board.dataset.kingPlatforms = JSON.stringify(KING_PLATFORMS);
board.dataset.playerBoundaries = JSON.stringify(PLAYER_BOUNDARIES);
board.dataset.spawnEntryUnitCells = JSON.stringify(SPAWN_ENTRY_UNIT_CELLS);
board.dataset.sidePocketGeometries = JSON.stringify(SIDE_POCKET_GEOMETRIES);
board.dataset.sidePocketTerrainCount = String(SIDE_POCKET_TERRAIN_CELLS.size);
board.dataset.localDebugGridLabelCount = String(LOCAL_DEBUG_GRID_LABELS.size + SIDE_POCKET_DEBUG_LABELS.length);
board.dataset.omittedCenterSpans = JSON.stringify(OMITTED_CENTER_SPANS);
board.dataset.renderBounds = JSON.stringify(RENDER_BOUNDS);

function buildOmittedCenterSpans() {
  return LANE_BANDS.flatMap((band) => [
    { x0: band.sourceX0, x1: band.x0 - 1 },
    { x0: band.x1 + 1, x1: band.sourceX1 },
  ])
    .filter((span) => span.x1 >= span.x0)
    .sort((a, b) => a.x0 - b.x0 || a.x1 - b.x1);
}

function teamCenterColumnLayout(center) {
  const centerY = (center.y0 + center.y1 + 1) / 2;
  const groupHeight = TEAM_CENTER_BLOCK_HEIGHT_CELLS * 2 + TEAM_CENTER_BLOCK_GAP_CELLS;
  const firstRosterY = centerY - groupHeight / 2;
  const secondRosterY = firstRosterY + TEAM_CENTER_BLOCK_HEIGHT_CELLS + TEAM_CENTER_BLOCK_GAP_CELLS;

  return [
    {
      rosterY: firstRosterY,
      kingY: firstRosterY + TEAM_KING_CENTER_OFFSET_CELLS,
    },
    {
      rosterY: secondRosterY,
      kingY: secondRosterY + TEAM_KING_CENTER_OFFSET_CELLS,
    },
  ];
}

function buildKingPlatforms() {
  const center = CENTER_BAND || {
    x0: Math.floor(PLAY_BOUNDS.x + PLAY_BOUNDS.width / 2 - CENTER_SEPARATOR_WIDTH / 2),
    x1: Math.floor(PLAY_BOUNDS.x + PLAY_BOUNDS.width / 2 + CENTER_SEPARATOR_WIDTH / 2),
    y0: PLAY_BOUNDS.y,
    y1: PLAY_BOUNDS.y + PLAY_BOUNDS.height - 1,
  };
  const centerX = (center.x0 + center.x1 + 1) / 2;
  const layout = teamCenterColumnLayout(center);

  return [
    {
      id: "king-west",
      x0: center.x0,
      x1: center.x1,
      y0: layout[0].kingY - KING_TOKEN_SPAN / 2,
      y1: layout[0].kingY + KING_TOKEN_SPAN / 2,
      tokenX: centerX,
      tokenY: layout[0].kingY,
      team: 4,
      teamId: 0,
      hpPercent: DEFAULT_KING_HEALTH_PERCENT,
      lives: DEFAULT_KING_LIVES,
      terrain: false,
    },
    {
      id: "king-east",
      x0: center.x0,
      x1: center.x1,
      y0: layout[1].kingY - KING_TOKEN_SPAN / 2,
      y1: layout[1].kingY + KING_TOKEN_SPAN / 2,
      tokenX: centerX,
      tokenY: layout[1].kingY,
      team: 1,
      teamId: 1,
      hpPercent: DEFAULT_KING_HEALTH_PERCENT,
      lives: DEFAULT_KING_LIVES,
      terrain: false,
    },
  ];
}

function mapXToRenderX(mapX) {
  let offset = 0;
  for (const span of OMITTED_CENTER_SPANS || []) {
    const spanWidth = span.x1 - span.x0 + 1;
    if (mapX >= span.x1 + 1) {
      offset += spanWidth;
    } else if (mapX > span.x0) {
      offset += clamp(mapX - span.x0, 0, spanWidth);
    }
  }
  return mapX - offset;
}

function renderXToMapX(renderX) {
  let mapX = renderX;
  let renderOffset = 0;
  for (const span of OMITTED_CENTER_SPANS) {
    const spanWidth = span.x1 - span.x0 + 1;
    const renderStart = span.x0 - renderOffset;
    if (renderX >= renderStart) {
      mapX += spanWidth;
      renderOffset += spanWidth;
    } else {
      break;
    }
  }
  return mapX;
}

function renderCellToMapCell(renderX) {
  return Math.floor(renderXToMapX(renderX + 0.5));
}

function buildLaneBands(components) {
  const sorted = [...components].sort((a, b) => a.minX - b.minX || a.minY - b.minY);
  const bands = [];
  const middleGapIndex = Math.floor((sorted.length - 1) / 2);

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    const x0 = current.maxX + 1;
    const x1 = next.minX - 1;
    if (x1 < x0) continue;
    const gapWidth = x1 - x0 + 1;
    const isCenter = index === middleGapIndex;
    const width = Math.min(gapWidth, isCenter ? CENTER_SEPARATOR_WIDTH : SIDE_LANE_SEPARATOR_WIDTH);
    const renderX0 = x0 + Math.floor((gapWidth - width) / 2);
    bands.push({
      x0: renderX0,
      x1: renderX0 + width - 1,
      sourceX0: x0,
      sourceX1: x1,
      y0: PLAY_BOUNDS.y,
      y1: PLAY_BOUNDS.y + PLAY_BOUNDS.height - 1,
      role: isCenter ? "center" : "side",
    });
  }

  return bands;
}

function isLaneCell(x, y) {
  return LANE_BANDS.some((band) => x >= band.x0 && x <= band.x1 && y >= band.y0 && y <= band.y1);
}

function isCenterLaneCell(x, y) {
  return LANE_BANDS.some((band) => band.role === "center" && x >= band.x0 && x <= band.x1 && y >= band.y0 && y <= band.y1);
}

function isSideLaneCell(x, y) {
  return LANE_BANDS.some((band) => band.role !== "center" && x >= band.x0 && x <= band.x1 && y >= band.y0 && y <= band.y1);
}

function isCenterGapCell(x, y) {
  const center = LANE_BANDS.find((band) => band.role === "center");
  if (!CENTER_SEPARATOR || !center) return false;
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  return cellY >= CENTER_SEPARATOR.y0 && cellY <= CENTER_SEPARATOR.y1 && (cellX === center.x0 - 1 || cellX === center.x1 + 1);
}

function topPlatformLaneFillBottom() {
  const topBoundary = PLAYER_BOUNDARY_ROWS[0] ?? Math.round(PLAY_BOUNDS.y + PLAY_BOUNDS.height / 2);
  const topPlatforms = SPAWN_PLATFORMS.filter((platform) => platform.y0 <= PLAY_BOUNDS.y + 1 && platform.y1 < topBoundary);
  return topPlatforms.length ? Math.max(...topPlatforms.map((platform) => platform.y1)) : PLAY_BOUNDS.y - 1;
}

function isTopPlatformLaneFill(x, y) {
  return isSideLaneCell(x, y) && Math.floor(y) <= TOP_PLATFORM_LANE_FILL_BOTTOM - SIDE_LANE_TOP_BROWN_ROWS;
}

function isKingPlatformCell(x, y) {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  return KING_PLATFORMS.some(
    (platform) => platform.terrain !== false && cellX >= platform.x0 && cellX <= platform.x1 && cellY >= platform.y0 && cellY <= platform.y1,
  );
}

function buildPlayerBoundaries() {
  const boundaries = [];

  for (const y of PLAYER_BOUNDARY_ROWS) {
    let runStart;
    for (let x = PLAY_BOUNDS.x; x < PLAY_BOUNDS.x + PLAY_BOUNDS.width; x += 1) {
      const hasBuildEdge = isBuildCell(x, y) || isBuildCell(x, y - 1);
      if (hasBuildEdge && runStart === undefined) runStart = x;
      if ((!hasBuildEdge || x === PLAY_BOUNDS.x + PLAY_BOUNDS.width - 1) && runStart !== undefined) {
        const runEnd = hasBuildEdge && x === PLAY_BOUNDS.x + PLAY_BOUNDS.width - 1 ? x : x - 1;
        boundaries.push({ x0: runStart, x1: runEnd, y });
        runStart = undefined;
      }
    }
  }

  return boundaries;
}

function componentBuildRows(component) {
  const rows = [];

  for (let y = component.minY; y <= component.maxY; y += 1) {
    const xs = [];
    for (let x = component.minX; x <= component.maxX; x += 1) {
      if (isBuildCell(x, y)) xs.push(x);
    }
    if (!xs.length) continue;
    rows.push({
      y,
      left: Math.min(...xs),
      right: Math.max(...xs),
      width: xs.length,
    });
  }

  return rows;
}

function contiguousRowRuns(rows) {
  const runs = [];
  let current = [];
  for (const row of rows) {
    if (!current.length || row.y === current[current.length - 1].y + 1) {
      current.push(row);
    } else {
      runs.push(current);
      current = [row];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

function buildSpawnEntryUnitCells() {
  const sorted = [...BUILD_COMPONENTS].sort((a, b) => a.minX - b.minX || a.minY - b.minY);
  if (sorted.length < 4) return [];

  const cells = [];
  const used = new Set();

  sorted.forEach((component, index) => {
    const rows = componentBuildRows(component);
    const narrowWidth = Math.min(...rows.map((row) => row.width));
    const narrowRuns = contiguousRowRuns(rows.filter((row) => row.width === narrowWidth));
    const topRun = narrowRuns[0] || [];
    const bottomRun = narrowRuns[narrowRuns.length - 1] || [];
    const topCornerRows = topRun.slice(-SPAWN_ENTRY_WALL_UNITS_PER_CORNER);
    const bottomCornerRows = bottomRun.slice(0, SPAWN_ENTRY_WALL_UNITS_PER_CORNER);
    const useRightEdge = index === 0 || index === 2;

    for (const row of [...topCornerRows, ...bottomCornerRows]) {
      const x = useRightEdge ? row.right : row.left;
      const y = row.y;
      const key = `${x},${y}`;
      if (used.has(key) || !isBuildCell(x, y)) continue;
      used.add(key);
      cells.push({ x, y });
    }
  });
  return cells;
}

function isSourceSpawnCell(x, y) {
  const tileId = tileIdAt(x, y);
  return WATER_TILES.has(tileId) || tileId === "Ywmb";
}

function rectsTouch(a, b, gap) {
  return a.x0 <= b.x1 + gap && b.x0 <= a.x1 + gap && a.y0 <= b.y1 + gap && b.y0 <= a.y1 + gap;
}

function mergeRects(rects) {
  const merged = [...rects];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length; i += 1) {
      for (let j = i + 1; j < merged.length; j += 1) {
        if (!rectsTouch(merged[i], merged[j], SPAWN_PLATFORM_MERGE_GAP)) continue;
        merged[i] = {
          x0: Math.min(merged[i].x0, merged[j].x0),
          x1: Math.max(merged[i].x1, merged[j].x1),
          y0: Math.min(merged[i].y0, merged[j].y0),
          y1: Math.max(merged[i].y1, merged[j].y1),
        };
        merged.splice(j, 1);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }
  return merged.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
}

function buildSpawnPlatforms() {
  const visited = new Set();
  const rects = [];
  const minX = PLAY_BOUNDS.x;
  const maxX = PLAY_BOUNDS.x + PLAY_BOUNDS.width - 1;
  const minY = PLAY_BOUNDS.y;
  const maxY = PLAY_BOUNDS.y + PLAY_BOUNDS.height - 1;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const startKey = `${x},${y}`;
      if (visited.has(startKey) || !isSourceSpawnCell(x, y)) continue;

      const stack = [[x, y]];
      let count = 0;
      let left = x;
      let right = x;
      let top = y;
      let bottom = y;
      visited.add(startKey);

      while (stack.length) {
        const [cx, cy] = stack.pop();
        count += 1;
        left = Math.min(left, cx);
        right = Math.max(right, cx);
        top = Math.min(top, cy);
        bottom = Math.max(bottom, cy);

        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const key = `${nx},${ny}`;
          if (nx < minX || nx > maxX || ny < minY || ny > maxY || visited.has(key) || !isSourceSpawnCell(nx, ny)) continue;
          visited.add(key);
          stack.push([nx, ny]);
        }
      }

      if (count < SPAWN_PLATFORM_MIN_CELLS || bottom < SPAWN_PLATFORM_MIN_Y || top > SPAWN_PLATFORM_MAX_Y) continue;
      rects.push({
        x0: clamp(left - SPAWN_PLATFORM_PADDING, minX, maxX),
        x1: clamp(right + SPAWN_PLATFORM_PADDING, minX, maxX),
        y0: clamp(top - SPAWN_PLATFORM_TOP_PADDING, minY, maxY),
        y1: clamp(bottom + SPAWN_PLATFORM_BOTTOM_PADDING, minY, maxY),
      });
    }
  }

  return mergeRects(rects);
}

function isSpawnCell(x, y) {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  return SPAWN_PLATFORMS.some((platform) => cellX >= platform.x0 && cellX <= platform.x1 && cellY >= platform.y0 && cellY <= platform.y1);
}

function isSidePocketTerrainCell(x, y) {
  return SIDE_POCKET_TERRAIN_CELLS.has(`${Math.floor(x)},${Math.floor(y)}`);
}

function isSidePocketBuildCell(x, y) {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  return SIDE_POCKET_GEOMETRIES.some((geometry) => cellX >= geometry.x0 && cellX < geometry.x1 && cellY >= geometry.y0 && cellY < geometry.y1);
}

function isLeftEdgePlatformFill(x, y) {
  return Math.floor(x) === PLAY_BOUNDS.x && isSpawnCell(PLAY_BOUNDS.x + 1, y);
}

function isOuterMiddlePlatformFill(x, y) {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  if (cellY < 55 || cellY > 63) return false;
  return cellX === PLAY_BOUNDS.x || cellX === PLAY_BOUNDS.x + PLAY_BOUNDS.width - 1;
}

function displayKindAt(x, y) {
  if (isSidePocketBuildCell(x, y)) return "spawn";
  if (isBuildCell(x, y)) return "green";
  if (isSidePocketTerrainCell(x, y)) return "spawn";
  if (isKingPlatformCell(x, y)) return "spawn";
  if (isCenterLaneCell(x, y)) return "lane";
  if (isTopPlatformLaneFill(x, y)) return "spawn";
  if (isSideLaneCell(x, y)) return "lane";
  if (isCenterGapCell(x, y)) return "spawn";
  if (isOuterMiddlePlatformFill(x, y)) return "spawn";
  if (isLeftEdgePlatformFill(x, y)) return "spawn";
  if (isSpawnCell(x, y)) return "spawn";
  return "neutral";
}

function hashCell(x, y, salt = 0) {
  let value = (Math.floor(x) + 1) * 374761393 + (Math.floor(y) + 1) * 668265263 + salt * 362437;
  value = (value ^ (value >>> 13)) * 1274126177;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function mixRgb(from, to, amount) {
  const t = clamp(amount, 0, 1);
  return from.map((channel, index) => Math.round(lerp(channel, to[index], t)));
}

function rgbStyle(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function smoothNoise(x, y, scale, salt) {
  const nx = x / scale;
  const ny = y / scale;
  const x0 = Math.floor(nx);
  const y0 = Math.floor(ny);
  const tx = smoothstep(nx - x0);
  const ty = smoothstep(ny - y0);
  const a = hashCell(x0, y0, salt);
  const b = hashCell(x0 + 1, y0, salt);
  const c = hashCell(x0, y0 + 1, salt);
  const d = hashCell(x0 + 1, y0 + 1, salt);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function greenTextureAreaFor(x, y) {
  return GREEN_TEXTURE_INDEX.byCell.get(`${Math.floor(x)},${Math.floor(y)}`);
}

function greenTextureAt(x, y) {
  const area = greenTextureAreaFor(x, y);
  const salt = area?.seed ?? 151;
  const localX = area ? x - area.minX : x;
  const localY = area ? y - area.minY : y;
  const broad = smoothNoise(localX + salt * 0.13, localY - salt * 0.07, 7.5, salt);
  const middle = smoothNoise(localX - salt * 0.09, localY + salt * 0.11, 3.2, salt + 11);
  const fine = smoothNoise(x, y, 1.45, salt + 29);
  return clamp(broad * 0.58 + middle * 0.3 + fine * 0.12, 0, 1);
}

function desiredFrameSize(zoom = state.zoom) {
  const aspect = GAME_VIEW_ASPECT;
  let height = clamp(BASE_VIEW_HEIGHT / zoom, MIN_VIEW_HEIGHT, RENDER_BOUNDS.height);
  let width = height * aspect;
  if (width > RENDER_BOUNDS.width) {
    width = RENDER_BOUNDS.width;
    height = width / aspect;
  }
  return { width, height };
}

function clampFrame(frame) {
  const width = clamp(frame.width, 1, RENDER_BOUNDS.width);
  const height = clamp(frame.height, 1, RENDER_BOUNDS.height);
  const minX = RENDER_BOUNDS.x - width / 2;
  const maxX = RENDER_BOUNDS.x + RENDER_BOUNDS.width - width / 2;
  const minY = RENDER_BOUNDS.y - height / 2;
  const maxY = RENDER_BOUNDS.y + RENDER_BOUNDS.height - height / 2;
  return {
    x: clamp(frame.x, minX, maxX),
    y: clamp(frame.y, minY, maxY),
    width,
    height,
  };
}

function initialFrame() {
  const size = desiredFrameSize();
  return clampFrame({
    x: RENDER_BOUNDS.x,
    y: RENDER_BOUNDS.y,
    width: size.width,
    height: size.height,
  });
}

function frame() {
  if (!state.frame) state.frame = initialFrame();
  return state.frame;
}

function setFrame(next) {
  state.frame = clampFrame(next);
  board.dataset.frame = JSON.stringify(state.frame);
  updateSource();
  positionTokens();
  positionTeamOverlay();
  positionPlayerCornerPanels();
  draw();
}

function setZoom(nextZoom, anchor) {
  const previous = frame();
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const size = desiredFrameSize(zoom);
  const anchorCell = anchor || {
    x: previous.x + previous.width / 2,
    y: previous.y + previous.height / 2,
    rx: 0.5,
    ry: 0.5,
  };
  state.zoom = zoom;
  zoomInput.value = String(zoomPercent(zoom));
  zoomValue.value = `${zoomPercent(zoom)}%`;
  zoomValue.textContent = `${zoomPercent(zoom)}%`;
  setFrame({
    x: anchorCell.x - size.width * anchorCell.rx,
    y: anchorCell.y - size.height * anchorCell.ry,
    width: size.width,
    height: size.height,
  });
}

function fitCanvas(target, ctx) {
  const rect = target.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * scale));
  const height = Math.max(1, Math.round(rect.height * scale));
  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return rect;
}

function paletteFor(tileId, x, y) {
  const n = hashCell(x, y, variationAt(x, y));
  if (tileId === "Ygsb") return n > 0.55 ? "#3d8c37" : "#347f32";
  if (tileId === "Yhdg") return n > 0.48 ? "#559647" : "#477f39";
  if (tileId === "Ysqd") return "#7d8178";
  if (tileId === "Ybtl") return "#5c5f59";
  if (tileId === "Yrtl") return "#686a63";
  if (tileId === "Ywmb") return "#939e96";
  if (tileId === "Yblm") return "#5b4b34";
  if (tileId === "Ydrt") return "#6d6040";
  if (tileId === "Ydtr") return "#56683c";
  if (tileId === "Jdtr") return "#766742";
  if (tileId === "Iice") return "#b7cec9";
  if (tileId === "Wsng") return "#9a9c91";
  return "#62655f";
}

function neutralPaletteFor(x, y) {
  return "#5f6862";
}

function lanePaletteFor(x, y) {
  if (isSideLaneCell(x, y)) return "#030403";
  return "#5d4a30";
}

function minimapPaletteFor(x, y) {
  const kind = displayKindAt(x, y);
  if (kind === "green") return buildPaletteFor(x, y);
  if (kind === "lane") return isSideLaneCell(x, y) ? spawnPaletteFor(x, y) : lanePaletteFor(x, y);
  if (kind === "spawn") return spawnPaletteFor(x, y);
  return neutralPaletteFor(x, y);
}

function spawnPaletteFor(x, y) {
  return "#bdcfca";
}

function buildPaletteFor(x, y) {
  const texture = greenTextureAt(x + 0.5, y + 0.5);
  const shadow = clamp((0.58 - texture) / 0.58, 0, 1);
  const highlight = clamp((texture - 0.5) / 0.5, 0, 1);
  const base = mixRgb(GREEN_RGB_BASE, GREEN_RGB_LIGHT, highlight * 0.58);
  return rgbStyle(mixRgb(base, GREEN_RGB_DARK, shadow * 0.38));
}

function drawStoneTile(ctx, x, y, size, tileId, cx, cy) {
  const shade = hashCell(cx, cy, 3);
  ctx.fillStyle = tileId === "Ywmb" ? "rgba(235, 238, 220, 0.08)" : "rgba(255, 255, 235, 0.045)";
  if (shade > 0.66) {
    ctx.fillRect(x + size * 0.18, y + size * 0.2, size * 0.52, size * 0.09);
  } else if (shade < 0.28) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(x + size * 0.12, y + size * 0.58, size * 0.62, size * 0.11);
  }
}

function drawGrassTile(ctx, x, y, size, cx, cy) {
  const specks = size > 9 ? 4 : 2;
  ctx.strokeStyle = "rgba(181, 223, 117, 0.2)";
  ctx.lineWidth = Math.max(1, size * 0.025);
  for (let i = 0; i < specks; i += 1) {
    const rx = hashCell(cx, cy, 11 + i) * size;
    const ry = hashCell(cx, cy, 31 + i) * size;
    ctx.beginPath();
    ctx.moveTo(x + rx, y + ry);
    ctx.lineTo(x + rx + size * 0.08, y + ry - size * 0.08);
    ctx.stroke();
  }
}

function drawGreenTexturePatch(ctx, x, y, size, cx, cy) {
  if (size < 7) return;

  const steps = size > 20 ? 4 : 3;
  const step = size / steps;
  for (let row = 0; row < steps; row += 1) {
    for (let col = 0; col < steps; col += 1) {
      const texture = greenTextureAt(cx + (col + 0.5) / steps, cy + (row + 0.5) / steps);
      const darkness = clamp((0.48 - texture) / 0.48, 0, 1);
      const highlight = clamp((texture - 0.68) / 0.32, 0, 1);

      if (darkness > 0.08) {
        ctx.fillStyle = `rgba(${GREEN_RGB_DEEP[0]}, ${GREEN_RGB_DEEP[1]}, ${GREEN_RGB_DEEP[2]}, ${0.035 + darkness * 0.075})`;
        ctx.fillRect(x + col * step, y + row * step, step + 0.6, step + 0.6);
      } else if (highlight > 0.1) {
        ctx.fillStyle = `rgba(151, 196, 92, ${0.025 + highlight * 0.045})`;
        ctx.fillRect(x + col * step, y + row * step, step + 0.6, step + 0.6);
      }
    }
  }
}

function drawGreenCellGrid(ctx, x, y, size, cx, cy) {
  const x0 = Math.round(x) + 0.5;
  const y0 = Math.round(y) + 0.5;
  const x1 = Math.round(x + size) + 0.5;
  const y1 = Math.round(y + size) + 0.5;

  ctx.strokeStyle = "rgba(221, 255, 174, 0.56)";
  ctx.lineWidth = Math.max(0.8, Math.min(1.45, size * 0.032));
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y0);
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, y1);

  if (displayKindAt(cx + 1, cy) !== "green") {
    ctx.moveTo(x1, y0);
    ctx.lineTo(x1, y1);
  }
  if (displayKindAt(cx, cy + 1) !== "green") {
    ctx.moveTo(x0, y1);
    ctx.lineTo(x1, y1);
  }

  ctx.stroke();
}

function drawGreenAreaTexture(ctx, current, cellSize) {
  if (cellSize < 5 || !GREEN_TEXTURE_INDEX.areas.length) return;

  ctx.save();
  ctx.beginPath();
  let hasGreenCells = false;
  const minX = Math.floor(current.x) - 1;
  const maxX = Math.ceil(current.x + current.width) + 1;
  const minY = Math.floor(current.y) - 1;
  const maxY = Math.ceil(current.y + current.height) + 1;

  for (let y = minY; y <= maxY; y += 1) {
    if (y < 0 || y >= mapData.cellsY) continue;
    for (let renderX = minX; renderX <= maxX; renderX += 1) {
      const mapX = renderCellToMapCell(renderX);
      if (mapX < 0 || mapX >= mapData.cellsX || displayKindAt(mapX, y) !== "green") continue;
      ctx.rect((renderX - current.x) * cellSize, (y - current.y) * cellSize, cellSize + 0.5, cellSize + 0.5);
      hasGreenCells = true;
    }
  }

  if (!hasGreenCells) {
    ctx.restore();
    return;
  }

  ctx.clip();
  for (const area of GREEN_TEXTURE_INDEX.areas) {
    const width = area.maxX - area.minX + 1;
    const height = area.maxY - area.minY + 1;
    const blobCount = Math.max(4, Math.min(14, Math.ceil(area.count / 70)));

    for (let index = 0; index < blobCount; index += 1) {
      const px = area.minX + hashCell(area.index, index, 211) * width;
      const py = area.minY + hashCell(area.index, index, 223) * height;
      const screenX = (mapXToRenderX(px) - current.x) * cellSize;
      const screenY = (py - current.y) * cellSize;
      const radiusX = (2.4 + hashCell(area.index, index, 241) * 5.8) * cellSize;
      const radiusY = (3.2 + hashCell(area.index, index, 257) * 8.5) * cellSize;
      const alpha = 0.035 + hashCell(area.index, index, 271) * 0.055;
      if (
        screenX + radiusX < 0 ||
        screenX - radiusX > canvas.clientWidth ||
        screenY + radiusY < 0 ||
        screenY - radiusY > canvas.clientHeight
      ) {
        continue;
      }

      ctx.fillStyle = `rgba(${GREEN_RGB_DEEP[0]}, ${GREEN_RGB_DEEP[1]}, ${GREEN_RGB_DEEP[2]}, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, radiusX, radiusY, hashCell(area.index, index, 283) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawVisibleGreenCellGrid(ctx, current, cellSize) {
  const minX = Math.floor(current.x) - 1;
  const maxX = Math.ceil(current.x + current.width) + 1;
  const minY = Math.floor(current.y) - 1;
  const maxY = Math.ceil(current.y + current.height) + 1;

  for (let y = minY; y <= maxY; y += 1) {
    if (y < 0 || y >= mapData.cellsY) continue;
    for (let renderX = minX; renderX <= maxX; renderX += 1) {
      const mapX = renderCellToMapCell(renderX);
      if (mapX < 0 || mapX >= mapData.cellsX || displayKindAt(mapX, y) !== "green") continue;
      drawGreenCellGrid(ctx, (renderX - current.x) * cellSize, (y - current.y) * cellSize, cellSize, mapX, y);
    }
  }
}

function drawSidePocketAreaTexture(ctx, current, cellSize, geometry, geometryIndex) {
  if (cellSize < 5) return;

  const screenLeft = (mapXToRenderX(geometry.x0) - current.x) * cellSize;
  const screenRight = (mapXToRenderX(geometry.x1) - current.x) * cellSize;
  const screenTop = (geometry.visualY0 - current.y) * cellSize;
  const screenBottom = (geometry.visualY1 - current.y) * cellSize;
  if (screenRight < 0 || screenLeft > canvas.clientWidth || screenBottom < 0 || screenTop > canvas.clientHeight) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(screenLeft, screenTop, screenRight - screenLeft, screenBottom - screenTop);
  ctx.clip();

  const width = geometry.x1 - geometry.x0;
  const height = geometry.y1 - geometry.y0;
  const blobCount = Math.max(4, Math.min(9, Math.ceil((width * height) / 24)));

  for (let index = 0; index < blobCount; index += 1) {
    const px = geometry.x0 + hashCell(geometryIndex, index, 311) * width;
    const py = geometry.y0 + hashCell(geometryIndex, index, 337) * height;
    const screenX = (mapXToRenderX(px) - current.x) * cellSize;
    const screenY = (geometry.visualY0 + py - geometry.y0 - current.y) * cellSize;
    const radiusX = (1.5 + hashCell(geometryIndex, index, 353) * 3.6) * cellSize;
    const radiusY = (2 + hashCell(geometryIndex, index, 367) * 4.4) * cellSize;
    const alpha = 0.04 + hashCell(geometryIndex, index, 383) * 0.06;

    ctx.fillStyle = `rgba(${GREEN_RGB_DEEP[0]}, ${GREEN_RGB_DEEP[1]}, ${GREEN_RGB_DEEP[2]}, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY, radiusX, radiusY, hashCell(geometryIndex, index, 397) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSidePocketVisualGrids(ctx, current, cellSize) {
  ctx.save();

  for (const [geometryIndex, geometry] of SIDE_POCKET_GEOMETRIES.entries()) {
    for (let row = 0; row < BUILD_SIDE_POCKET_HEIGHT; row += 1) {
      const mapY = geometry.visualY0 + row;
      if (mapY + 1 < current.y || mapY > current.y + current.height) continue;

      for (let col = 0; col < BUILD_SIDE_POCKET_WIDTH; col += 1) {
        const mapX = geometry.x0 + col;
        const renderX = mapXToRenderX(mapX);
        if (renderX + 1 < current.x || renderX > current.x + current.width) continue;

        const screenX = (renderX - current.x) * cellSize;
        const screenY = (mapY - current.y) * cellSize;
        ctx.fillStyle = buildPaletteFor(mapX, geometry.y0 + row);
        ctx.fillRect(screenX, screenY, cellSize + 0.5, cellSize + 0.5);
        drawGreenTexturePatch(ctx, screenX, screenY, cellSize, mapX, geometry.y0 + row);
        drawGrassTile(ctx, screenX, screenY, cellSize, mapX, geometry.y0 + row);
      }
    }

    drawSidePocketAreaTexture(ctx, current, cellSize, geometry, geometryIndex + 1);

    const screenLeft = (mapXToRenderX(geometry.x0) - current.x) * cellSize;
    const screenRight = (mapXToRenderX(geometry.x1) - current.x) * cellSize;
    const screenTop = (geometry.visualY0 - current.y) * cellSize;
    const screenBottom = (geometry.visualY1 - current.y) * cellSize;

    ctx.strokeStyle = "rgba(221, 255, 174, 0.56)";
    ctx.lineWidth = Math.max(0.8, Math.min(1.45, cellSize * 0.032));
    ctx.beginPath();
    for (let col = 0; col <= BUILD_SIDE_POCKET_WIDTH; col += 1) {
      const x = (mapXToRenderX(geometry.x0 + col) - current.x) * cellSize;
      ctx.moveTo(Math.round(x) + 0.5, screenTop);
      ctx.lineTo(Math.round(x) + 0.5, screenBottom);
    }
    for (let row = 0; row <= BUILD_SIDE_POCKET_HEIGHT; row += 1) {
      const y = (geometry.visualY0 + row - current.y) * cellSize;
      ctx.moveTo(screenLeft, Math.round(y) + 0.5);
      ctx.lineTo(screenRight, Math.round(y) + 0.5);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawDarkTile(ctx, x, y, size, cx, cy) {
  const n = hashCell(cx, cy, 4);
  ctx.fillStyle = `rgba(36, 25, 16, ${0.1 + n * 0.08})`;
  ctx.fillRect(x + size * 0.08, y + size * 0.08, size * 0.84, size * 0.1);
}

function drawLaneTile(ctx, x, y, size, cx, cy) {
}

function drawSpawnTile(ctx, x, y, size, cx, cy) {
}

function drawCell(ctx, cellX, cellY, screenX, screenY, size) {
  const kind = displayKindAt(cellX, cellY);
  if (kind === "green") {
    ctx.fillStyle = buildPaletteFor(cellX, cellY);
  } else if (kind === "lane") {
    ctx.fillStyle = lanePaletteFor(cellX, cellY);
  } else if (kind === "spawn") {
    ctx.fillStyle = spawnPaletteFor(cellX, cellY);
  } else {
    ctx.fillStyle = neutralPaletteFor(cellX, cellY);
  }
  ctx.fillRect(screenX, screenY, size + 0.5, size + 0.5);

  if (kind === "green") {
    drawGreenTexturePatch(ctx, screenX, screenY, size, cellX, cellY);
    drawGrassTile(ctx, screenX, screenY, size, cellX, cellY);
  } else if (kind === "lane") {
    drawLaneTile(ctx, screenX, screenY, size, cellX, cellY);
  } else if (kind === "spawn") {
    drawSpawnTile(ctx, screenX, screenY, size, cellX, cellY);
  } else if (kind === "neutral") {
  }
}

function formatDebugGridNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1).replace(/\.0$/, "");
}

function formatDebugGridLabel(x, y) {
  return `${formatDebugGridNumber(x)},${formatDebugGridNumber(y)}`;
}

function drawDebugGridLabel(ctx, label, screenX, screenY) {
  ctx.strokeStyle = "rgba(5, 10, 4, 0.82)";
  ctx.fillStyle = "rgba(255, 245, 168, 0.92)";
  ctx.strokeText(label, screenX, screenY);
  ctx.fillText(label, screenX, screenY);
}

function drawDebugGreenCellLabels(ctx, current, cellSize) {
  if (!DEBUG_GRID_LABELS || cellSize < 15) return;

  const minX = Math.floor(current.x) - 1;
  const maxX = Math.ceil(current.x + current.width) + 1;
  const minY = Math.floor(current.y) - 1;
  const maxY = Math.ceil(current.y + current.height) + 1;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(7, Math.min(11, cellSize * 0.23))}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.lineWidth = Math.max(2, cellSize * 0.07);
  for (let y = minY; y <= maxY; y += 1) {
    if (y < 0 || y >= mapData.cellsY) continue;
    for (let renderX = minX; renderX <= maxX; renderX += 1) {
      const mapX = renderCellToMapCell(renderX);
      if (mapX < 0 || mapX >= mapData.cellsX || displayKindAt(mapX, y) !== "green") continue;

      const screenX = (renderX - current.x + 0.5) * cellSize;
      const screenY = (y - current.y + 0.5) * cellSize;
      const label = LOCAL_DEBUG_GRID_LABELS.get(`${mapX},${y}`);
      if (!label) continue;
      drawDebugGridLabel(ctx, label, screenX, screenY);
    }
  }

  for (const { x, y, label } of SIDE_POCKET_DEBUG_LABELS) {
    const renderX = mapXToRenderX(x);
    if (renderX < current.x - 1 || renderX > current.x + current.width + 1) continue;
    if (y < current.y - 1 || y > current.y + current.height + 1) continue;
    drawDebugGridLabel(ctx, label, (renderX - current.x) * cellSize, (y - current.y) * cellSize);
  }

  ctx.restore();
}

function drawKindEdges(ctx, current, cellSize) {
  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = Math.max(1, cellSize * 0.05);
  const minX = Math.floor(current.x) - 1;
  const maxX = Math.ceil(current.x + current.width) + 1;
  const minY = Math.floor(current.y) - 1;
  const maxY = Math.ceil(current.y + current.height) + 1;
  ctx.beginPath();
  for (let y = minY; y <= maxY; y += 1) {
    if (y < 0 || y >= mapData.cellsY) continue;
    for (let renderX = minX; renderX <= maxX; renderX += 1) {
      const mapX = renderCellToMapCell(renderX);
      if (mapX < 0 || mapX >= mapData.cellsX) continue;
      const kind = displayKindAt(mapX, y);
      const sx = (renderX - current.x) * cellSize;
      const sy = (y - current.y) * cellSize;
      const nextMapX = renderCellToMapCell(renderX + 1);
      if (nextMapX < mapData.cellsX && displayKindAt(nextMapX, y) !== kind) {
        ctx.moveTo(sx + cellSize, sy);
        ctx.lineTo(sx + cellSize, sy + cellSize);
      }
      if (y + 1 < mapData.cellsY && displayKindAt(mapX, y + 1) !== kind) {
        ctx.moveTo(sx, sy + cellSize);
        ctx.lineTo(sx + cellSize, sy + cellSize);
      }
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawSideLaneDividers(ctx, current, cellSize) {
  ctx.save();
  ctx.fillStyle = "#010201";
  for (const lane of LANE_BANDS) {
    if (lane.role === "center") continue;
    const screenLeft = (mapXToRenderX(lane.x0) - current.x) * cellSize;
    const screenRight = (mapXToRenderX(lane.x1 + 1) - current.x) * cellSize;
    if (screenRight < 0 || screenLeft > ctx.canvas.clientWidth) continue;
    const width = Math.max(1, Math.round(screenRight - screenLeft));
    const left = Math.round((screenLeft + screenRight - width) / 2);
    ctx.fillRect(left, 0, width, ctx.canvas.clientHeight);
  }
  ctx.restore();
}

function drawMapSegment(ctx, current, cellSize, a, b) {
  const ax = (mapXToRenderX(a.x) - current.x) * cellSize;
  const ay = (a.y - current.y) * cellSize;
  const bx = (mapXToRenderX(b.x) - current.x) * cellSize;
  const by = (b.y - current.y) * cellSize;
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
}

function drawPlayerGridOverlay(ctx, current, cellSize) {
  ctx.save();
  ctx.lineWidth = Math.max(0.7, Math.min(1.35, cellSize * 0.026));
  ctx.strokeStyle = "rgba(220, 255, 165, 0.42)";

  for (const grid of PLAYER_GRIDS) {
    const rows = playerGridMaxRows(grid);

    ctx.beginPath();
    for (let row = 0; row < rows; row += 1) {
      const bounds = playerGridRowBounds(grid, row);
      const top = bounds.y;
      const bottom = bounds.y + 1;
      const left = grid.originX;
      const right = grid.originX + PLAYER_LANE_WIDTH;

      for (let x = left; x <= right; x += 1) {
        drawMapSegment(ctx, current, cellSize, { x, y: top }, { x, y: bottom });
      }
      drawMapSegment(ctx, current, cellSize, { x: left, y: top }, { x: right, y: top });
      drawMapSegment(ctx, current, cellSize, { x: left, y: bottom }, { x: right, y: bottom });
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawMap() {
  const rect = fitCanvas(canvas, context);
  const current = frame();
  const cellSize = rect.width / current.width;
  context.fillStyle = "#000";
  context.fillRect(0, 0, rect.width, rect.height);

  const minX = Math.floor(current.x) - 1;
  const maxX = Math.ceil(current.x + current.width) + 1;
  const minY = Math.floor(current.y) - 1;
  const maxY = Math.ceil(current.y + current.height) + 1;

  for (let y = minY; y <= maxY; y += 1) {
    if (y < RENDER_BOUNDS.y || y >= RENDER_BOUNDS.y + RENDER_BOUNDS.height) continue;
    if (y < 0 || y >= mapData.cellsY) continue;
    for (let renderX = minX; renderX <= maxX; renderX += 1) {
      if (renderX < RENDER_BOUNDS.x || renderX >= RENDER_BOUNDS.x + RENDER_BOUNDS.width) continue;
      const mapX = renderCellToMapCell(renderX);
      if (mapX < 0 || mapX >= mapData.cellsX) continue;
      drawCell(context, mapX, y, (renderX - current.x) * cellSize, (y - current.y) * cellSize, cellSize);
    }
  }

  drawGreenAreaTexture(context, current, cellSize);
  drawVisibleGreenCellGrid(context, current, cellSize);
  drawKindEdges(context, current, cellSize);
  drawSidePocketVisualGrids(context, current, cellSize);
  drawSideLaneDividers(context, current, cellSize);
  drawDebugGreenCellLabels(context, current, cellSize);
  positionTokens();
}

function buildMiniCache() {
  const cache = document.createElement("canvas");
  cache.width = RENDER_BOUNDS.width;
  cache.height = RENDER_BOUNDS.height;
  const ctx = cache.getContext("2d", { alpha: false });
  for (let y = 0; y < RENDER_BOUNDS.height; y += 1) {
    for (let x = 0; x < RENDER_BOUNDS.width; x += 1) {
      const mapX = renderCellToMapCell(RENDER_BOUNDS.x + x);
      const mapY = RENDER_BOUNDS.y + y;
      ctx.fillStyle = minimapPaletteFor(mapX, mapY);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawMinimapSidePocketGrids(ctx, 1, 1, cache.width, cache.height);
  drawMinimapSideLaneFill(ctx, 1, 1, cache.width, cache.height);
  state.miniCache = cache;
}

function drawMinimapSidePocketGrids(ctx, sx, sy, width, height) {
  for (const geometry of SIDE_POCKET_GEOMETRIES) {
    for (let row = 0; row < BUILD_SIDE_POCKET_HEIGHT; row += 1) {
      const sourceY = geometry.y0 + row;
      const visualY = geometry.visualY0 + row;

      for (let col = 0; col < BUILD_SIDE_POCKET_WIDTH; col += 1) {
        const mapX = geometry.x0 + col;
        if (isSideLaneCell(mapX, visualY)) continue;
        const x0 = Math.floor((mapXToRenderX(mapX) - RENDER_BOUNDS.x) * sx);
        const x1 = Math.ceil((mapXToRenderX(mapX + 1) - RENDER_BOUNDS.x) * sx);
        const y0 = Math.floor((visualY - RENDER_BOUNDS.y) * sy);
        const y1 = Math.ceil((visualY + 1 - RENDER_BOUNDS.y) * sy);
        if (x1 < 0 || x0 > width || y1 < 0 || y0 > height) continue;

        ctx.fillStyle = buildPaletteFor(mapX, sourceY);
        ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
      }
    }
  }
}

function drawMinimapSideLaneFill(ctx, sx, sy, width, height) {
  ctx.save();
  ctx.fillStyle = spawnPaletteFor(0, 0);
  for (const lane of LANE_BANDS) {
    if (lane.role === "center") continue;
    const x0 = Math.floor((mapXToRenderX(lane.x0) - RENDER_BOUNDS.x) * sx);
    const x1 = Math.ceil((mapXToRenderX(lane.x1 + 1) - RENDER_BOUNDS.x) * sx);
    const y0 = Math.floor((lane.y0 - RENDER_BOUNDS.y) * sy);
    const y1 = Math.ceil((lane.y1 + 1 - RENDER_BOUNDS.y) * sy);
    if (x1 < 0 || x0 > width || y1 < 0 || y0 > height) continue;
    ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
  }
  ctx.restore();
}

function drawMinimap() {
  const rect = fitCanvas(minimap, minimapContext);
  const current = frame();
  const sx = rect.width / RENDER_BOUNDS.width;
  const sy = rect.height / RENDER_BOUNDS.height;

  minimapContext.fillStyle = "#090b08";
  minimapContext.fillRect(0, 0, rect.width, rect.height);

  for (let y = 0; y < RENDER_BOUNDS.height; y += 1) {
    for (let x = 0; x < RENDER_BOUNDS.width; x += 1) {
      const mapX = renderCellToMapCell(RENDER_BOUNDS.x + x);
      const mapY = RENDER_BOUNDS.y + y;
      minimapContext.fillStyle = minimapPaletteFor(mapX, mapY);
      const x0 = Math.floor(x * sx);
      const y0 = Math.floor(y * sy);
      const x1 = Math.ceil((x + 1) * sx);
      const y1 = Math.ceil((y + 1) * sy);
      minimapContext.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
    }
  }

  drawMinimapSidePocketGrids(minimapContext, sx, sy, rect.width, rect.height);
  drawMinimapSideLaneFill(minimapContext, sx, sy, rect.width, rect.height);

  const viewLeft = Math.max(current.x, RENDER_BOUNDS.x);
  const viewTop = Math.max(current.y, RENDER_BOUNDS.y);
  const viewRight = Math.min(current.x + current.width, RENDER_BOUNDS.x + RENDER_BOUNDS.width);
  const viewBottom = Math.min(current.y + current.height, RENDER_BOUNDS.y + RENDER_BOUNDS.height);

  if (viewRight > viewLeft && viewBottom > viewTop) {
    const viewX = viewLeft - RENDER_BOUNDS.x;
    const viewY = viewTop - RENDER_BOUNDS.y;
    const viewWidth = viewRight - viewLeft;
    const viewHeight = viewBottom - viewTop;
    minimapContext.fillStyle = "rgba(255, 237, 146, 0.1)";
    minimapContext.strokeStyle = "#fff1a0";
    minimapContext.lineWidth = 2;
    minimapContext.fillRect(viewX * sx, viewY * sy, viewWidth * sx, viewHeight * sy);
    minimapContext.strokeRect(
      viewX * sx + 1,
      viewY * sy + 1,
      Math.max(4, viewWidth * sx - 2),
      Math.max(4, viewHeight * sy - 2),
    );
  }
}

function draw() {
  drawMap();
  drawMinimap();
  positionTeamOverlay();
  positionPlayerCornerPanels();
}

function updateSource() {
  const current = frame();
  const replayLabel = state.replay?.replay
    ? ` | replay ${state.replay.replay.matchId} | builds ${state.replay.buildUnits.length}`
    : "";
  board.dataset.frame = JSON.stringify(current);
  source.textContent = `${mapData.source} | ${mapData.cellsX}x${mapData.cellsY} cells | view ${Math.round(
    current.width,
  )}x${Math.round(current.height)}${replayLabel}`;
}

function groupByPlayer(rows = []) {
  const grouped = new Map();

  for (const row of [...rows].sort((a, b) => Number(a.timeMillis) - Number(b.timeMillis) || Number(a.actionId) - Number(b.actionId))) {
    const playerId = Number(row.playerId);
    const items = grouped.get(playerId) || [];
    items.push(row);
    grouped.set(playerId, items);
  }

  return grouped;
}

function groupByTeam(rows = []) {
  const grouped = new Map();

  for (const row of [...rows].sort((a, b) => Number(a.timeMillis) - Number(b.timeMillis) || Number(a.actionId) - Number(b.actionId))) {
    if (row.teamId === null || row.teamId === undefined) continue;
    const teamId = Number(row.teamId);
    const items = grouped.get(teamId) || [];
    items.push(row);
    grouped.set(teamId, items);
  }

  return grouped;
}

function indexReplayPayload(payload) {
  if (!payload) return emptyReplayIndex();

  return {
    statsByPlayer: groupByPlayer(payload.playerStats),
    economyByPlayer: groupByPlayer(payload.economyEvents),
    resourcesByPlayer: groupByPlayer(payload.resourceEvents),
    rollsByPlayer: groupByPlayer(payload.playerRolls),
    eventsByPlayer: groupByPlayer(payload.timelineEvents),
    kingUpgradesByTeam: groupByTeam(payload.kingUpgrades),
    unitSends: [...(payload.unitSends || [])].sort(
      (a, b) => Number(a.timeMillis) - Number(b.timeMillis) || Number(a.actionId) - Number(b.actionId),
    ),
    waveEvents: [...(payload.waveEvents || [])].sort(
      (a, b) => Number(a.startMillis) - Number(b.startMillis) || Number(a.level) - Number(b.level),
    ),
    timelineEvents: [...(payload.timelineEvents || [])].sort(
      (a, b) => Number(a.timeMillis) - Number(b.timeMillis) || Number(a.actionId) - Number(b.actionId),
    ),
  };
}

async function loadReplayPayload() {
  if (!selectedReplayId) {
    state.replayIndex = emptyReplayIndex();
    populateLoadStateControls();
    configureReplayControls(DEFAULT_REPLAY_DURATION_MILLIS);
    return;
  }

  try {
    const response = await fetch(`/api/replays/${encodeURIComponent(selectedReplayId)}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Replay API returned ${response.status}`);
    }

    state.replay = await response.json();
    state.replayIndex = indexReplayPayload(state.replay);
    state.durationMillis = Math.max(0, Number(state.replay?.replay?.durationMillis || 0));
    state.endgameDismissed = false;
    state.endgameOverlayKey = undefined;
    board.dataset.replayId = String(state.replay?.replay?.id ?? selectedReplayId);
    applyReplayTeams();
    configureReplayControls(state.durationMillis);
  } catch (error) {
    console.warn("Unable to load replay data", error);
    state.replay = undefined;
    state.replayIndex = emptyReplayIndex();
    state.durationMillis = DEFAULT_REPLAY_DURATION_MILLIS;
    state.endgameDismissed = false;
    state.endgameOverlayKey = undefined;
    populateLoadStateControls();
    configureReplayControls(DEFAULT_REPLAY_DURATION_MILLIS);
  }
}

function playerCornerStatTemplate() {
  return PLAYER_CORNER_STATS
    .map(
      ([key, label]) => `
        <div class="player-corner-card__stat" data-stat-row="${key}" hidden>
          <span>${label}:</span>
          <strong data-stat="${key}">-</strong>
        </div>
      `,
    )
    .join("");
}

function playerEventsTemplate() {
  return `
    <div class="player-events">
      <div class="player-events__heading">Events:</div>
      <div class="player-events__list" data-player-event-list></div>
      <button class="player-events__more" type="button" data-player-event-more hidden>Show more</button>
    </div>
  `;
}

function playerProfileButton(player, className = "player-profile-trigger") {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.dataset.playerProfile = "true";
  button.dataset.playerId = String(player.id);
  button.dataset.battleTag = player.battleTag || "";
  button.textContent = playerDisplayName(player);
  button.title = player.battleTag || player.name || "";
  button.setAttribute("aria-label", `Open profile for ${player.name || player.battleTag || "player"}`);
  return button;
}

function applyReplayTeams() {
  if (!state.replay?.teams?.length || !teamOverlay) return;

  teamOverlay.replaceChildren(
    ...state.replay.teams.slice(0, 2).map((team, index) => {
      const section = document.createElement("section");
      section.className = `team-overlay__side team-overlay__side--${index === 0 ? "one" : "two"}`;
      section.dataset.teamIndex = String(index);
      section.setAttribute("aria-label", `Team ${index + 1}`);

      const title = document.createElement("div");
      title.className = "team-overlay__title";
      title.textContent = index === 0 ? "< TEAM 1" : "TEAM 2 >";
      section.appendChild(title);

      for (const player of team.players) {
        const row = document.createElement("div");
        row.className = "team-overlay__player";
        row.dataset.playerId = String(player.id);
        row.dataset.battleTag = player.battleTag || "";
        row.appendChild(playerProfileButton(player, "team-overlay__player-button"));
        section.appendChild(row);
      }

      return section;
    }),
  );
  applyPlayerCornerPanels();
  populateLoadStateControls();
  updateTeamSendOverlays();
  updateTeamOverlayStats();
}

function applyPlayerCornerPanels() {
  if (!state.replay?.teams?.length || !playerCornerOverlay) return;
  const players = state.replay.teams.slice(0, 2).flatMap((team, teamIndex) =>
    (team.players || []).map((player) => ({
      player,
      teamIndex,
    })),
  );

  playerCornerOverlay.replaceChildren(
    ...players.map(({ player, teamIndex }) => {
      const card = document.createElement("article");
      card.className = "player-corner-card player-card";
      card.dataset.playerId = String(player.id);
      card.dataset.teamIndex = String(teamIndex);
      card.style.setProperty("--player-name-color", playerSlotColor(player.id));
      const anchor = playerCornerAnchor(player.id);
      if (anchor) {
        card.dataset.anchorX = String(anchor.x);
        card.dataset.anchorY = String(anchor.y);
        card.dataset.alignX = anchor.alignX;
        card.dataset.alignY = anchor.alignY;
        card.dataset.widthCells = String(anchor.widthCells);
        card.dataset.areaX0 = String(anchor.area.x0);
        card.dataset.areaX1 = String(anchor.area.x1);
        card.dataset.areaY0 = String(anchor.area.y0);
        card.dataset.areaY1 = String(anchor.area.y1);
      } else {
        card.dataset.hidden = "true";
      }
      card.innerHTML = `
        <header class="player-corner-card__header">
          <strong>
            <button class="player-profile-trigger" type="button" data-player-profile="true" data-player-id="${escapeHtml(player.id)}" data-battle-tag="${escapeHtml(player.battleTag || "")}">
              ${escapeHtml(playerDisplayName(player))}
            </button>
          </strong>
        </header>
        <div class="player-corner-sends" data-player-sends hidden></div>
        <div class="player-corner-card__stats">${playerCornerStatTemplate()}</div>
        ${playerEventsTemplate()}
        <div class="player-corner-roll" data-player-roll hidden></div>
      `;
      return card;
    }),
  );
  positionPlayerCornerPanels();
}

function replayPlayers() {
  return (state.replay?.teams ?? []).slice(0, 2).flatMap((team) => team.players || []);
}

function populateLoadStateControls() {
  if (!loadStateControls || !loadStatePlayer) return;
  const players = replayPlayers();
  loadStateControls.hidden = players.length === 0;
  loadStatePlayer.replaceChildren(
    ...players.map((player) => {
      const option = document.createElement("option");
      option.value = String(player.id);
      option.textContent = playerDisplayName(player);
      return option;
    }),
  );

  const current = players.find((player) => Number(player.id) === Number(state.selectedLoadStatePlayerId)) ?? players[0];
  state.selectedLoadStatePlayerId = current?.id;
  if (current) loadStatePlayer.value = String(current.id);
  updateLoadStateControls();
}

function currentLoadStatePlayerId() {
  const selected = Number(loadStatePlayer?.value ?? state.selectedLoadStatePlayerId);
  return Number.isFinite(selected) ? selected : undefined;
}

function updateLoadStateControls() {
  if (!loadStateDownload || !loadStatePlayer || loadStateControls?.hidden) return;
  const playerId = currentLoadStatePlayerId();
  const units = loadStateUnitsForPlayer(playerId, state.timeMillis);
  loadStateDownload.disabled = units.length === 0;
  loadStateDownload.title = units.length
    ? `Download Benchmark.pld for ${playerForId(playerId)?.name ?? `Player ${playerId}`} at ${formatReplayCompactTime(state.timeMillis)}`
    : "No army at this replay time";
}

function loadStateCurrentUnitState(unit, timeMillis) {
  const states = unit.stateChanges?.length
    ? unit.stateChanges
    : [
        {
          actionId: unit.actionId,
          timeMillis: unit.timeMillis,
          level: 1,
          unitType: unit.unitType,
          unitName: unit.unitName,
        },
      ];
  let current = states[0];

  for (const unitState of states) {
    if (Number(unitState.timeMillis ?? 0) > timeMillis) break;
    current = unitState;
  }

  return current;
}

function loadStateUnitsForPlayer(playerId, timeMillis) {
  if (!Number.isFinite(Number(playerId))) return [];

  return (state.replay?.buildUnits ?? [])
    .filter((unit) => {
      if (Number(unit.playerId) !== Number(playerId)) return false;
      if (Number(unit.timeMillis) > timeMillis) return false;
      if (unit.removedAtMillis !== null && unit.removedAtMillis !== undefined && timeMillis >= Number(unit.removedAtMillis)) return false;
      return true;
    })
    .map((unit) => ({
      unit,
      current: loadStateCurrentUnitState(unit, timeMillis),
    }))
    .filter(({ current }) => current?.unitType)
    .sort((a, b) => Number(a.unit.timeMillis) - Number(b.unit.timeMillis) || Number(a.unit.actionId) - Number(b.unit.actionId));
}

function war3FourCcInteger(value) {
  const raw = String(value ?? "").trim();
  if (/^-?\d+$/.test(raw)) return raw;
  if (raw.length < 4) return raw;

  let id = 0;
  for (let index = 0; index < 4; index += 1) {
    id = id * 256 + raw.charCodeAt(index);
  }

  return String(id);
}

function war3Number(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 1000) / 1000);
}

function jassString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function loadStateGameModeCommand() {
  const rawGameMode = String(state.replay?.replay?.gameMode ?? "").trim();
  const normalized = rawGameMode.toLowerCase().replace(/[^a-z0-9-]/g, "");

  if (!rawGameMode || normalized === "unknown") return "-prccmix3";
  if (rawGameMode.startsWith("-")) return rawGameMode;
  if (normalized.includes("pracmi")) return "-pracmi";
  if (normalized.includes("x3") || normalized.includes("prccmix3") || normalized.includes("prccxmix3")) return "-prccmix3";
  return rawGameMode;
}

function loadStateTooltipLine(value, level) {
  return `call BlzSetAbilityTooltip('A017', "${jassString(value)}", ${level})`;
}

function generateLoadStateFile(units) {
  const lines = ["function PreloadFiles takes nothing returns nothing"];
  let level = 0;

  lines.push(loadStateTooltipLine(loadStateGameModeCommand(), level));
  level += 1;

  for (const { unit, current } of units) {
    lines.push(loadStateTooltipLine(war3FourCcInteger(current.unitType), level));
    lines.push(loadStateTooltipLine(war3Number(unit.locationX), level + 1));
    lines.push(loadStateTooltipLine(war3Number(unit.locationY), level + 2));
    level += 3;
  }

  lines.push(loadStateTooltipLine("", level));
  lines.push("endfunction", "");
  return lines.join("\r\n");
}

function downloadLoadStateFile() {
  const playerId = currentLoadStatePlayerId();
  const units = loadStateUnitsForPlayer(playerId, state.timeMillis);
  if (units.length === 0) return;

  const blob = new Blob([generateLoadStateFile(units)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Benchmark.pld";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function configureReplayControls(durationMillis) {
  state.durationMillis = Math.max(0, Math.round(durationMillis));
  replayTime.max = String(REPLAY_TIMELINE_RANGE_STEPS);
  replayTime.step = "1";
  replayDuration.value = formatReplayTime(state.durationMillis);
  replayDuration.textContent = formatReplayTime(state.durationMillis);
  renderLevelAnchors();
  setReplayTime(clamp(state.timeMillis, 0, state.durationMillis));
}

function replayLevelAnchors() {
  const waves = state.replayIndex.waveEvents || [];
  const levelEndMillis = new Map();

  for (const wave of waves) {
    const level = Number(wave.level);
    const endMillis = wave.endMillis === null || wave.endMillis === undefined ? Number.NaN : Number(wave.endMillis);
    if (!Number.isFinite(level) || !Number.isFinite(endMillis)) continue;
    levelEndMillis.set(level, endMillis);
  }

  for (const stat of state.replay?.playerStats || []) {
    const level = Number(stat.levelNumber);
    const timeMillis = Number(stat.timeMillis);
    if (!Number.isFinite(level) || !Number.isFinite(timeMillis) || levelEndMillis.has(level)) continue;
    levelEndMillis.set(level, Math.max(levelEndMillis.get(level) ?? 0, timeMillis));
  }

  const maxLevel = Math.max(0, ...waves.map((wave) => Number(wave.level)).filter(Number.isFinite), ...levelEndMillis.keys());
  const anchors = [];

  for (let level = 1; level <= maxLevel; level += 1) {
    const timeMillis = levelEndMillis.get(level);
    if (!Number.isFinite(timeMillis)) continue;
    anchors.push({
      level,
      timeMillis: clamp(Math.round(timeMillis), 0, state.durationMillis || 0),
    });
  }

  return anchors;
}

function replayLevelOutcomeLevelAtTime(timeMillis) {
  const millis = Number(timeMillis);
  if (!Number.isFinite(millis)) return undefined;

  return replayLevelAnchors().find((anchor) => Math.abs(Number(anchor.timeMillis) - millis) <= REPLAY_LEVEL_OUTCOME_TIME_TOLERANCE_MS)?.level;
}

function replayTimelineProgressForTime(timeMillis) {
  const anchors = replayLevelAnchors();
  if (!anchors.length) {
    const duration = Math.max(1, Number(state.durationMillis) || 1);
    return clamp((Number(timeMillis) || 0) / duration, 0, 1);
  }

  const millis = clamp(Number(timeMillis) || 0, 0, state.durationMillis || 0);
  const segmentCount = anchors.length;
  let previousTime = 0;
  let previousProgress = 0;

  for (const [index, anchor] of anchors.entries()) {
    const anchorTime = Number(anchor.timeMillis);
    const anchorProgress = (index + 1) / segmentCount;
    if (!Number.isFinite(anchorTime)) continue;

    if (millis <= anchorTime) {
      const span = anchorTime - previousTime;
      const localProgress = span > 0 ? clamp((millis - previousTime) / span, 0, 1) : 1;
      return previousProgress + (anchorProgress - previousProgress) * localProgress;
    }

    previousTime = anchorTime;
    previousProgress = anchorProgress;
  }

  return 1;
}

function replayTimelineTimeForProgress(progress) {
  const anchors = replayLevelAnchors();
  const normalizedProgress = clamp(Number(progress) || 0, 0, 1);
  if (!anchors.length) return normalizedProgress * (state.durationMillis || 0);

  const segmentCount = anchors.length;
  let previousTime = 0;
  let previousProgress = 0;

  for (const [index, anchor] of anchors.entries()) {
    const anchorTime = Number(anchor.timeMillis);
    const anchorProgress = (index + 1) / segmentCount;
    if (!Number.isFinite(anchorTime)) continue;

    if (normalizedProgress <= anchorProgress) {
      const progressSpan = anchorProgress - previousProgress;
      const localProgress = progressSpan > 0 ? clamp((normalizedProgress - previousProgress) / progressSpan, 0, 1) : 1;
      return previousTime + (anchorTime - previousTime) * localProgress;
    }

    previousTime = anchorTime;
    previousProgress = anchorProgress;
  }

  return state.durationMillis || previousTime;
}

function replayTimelineInputValueForTime(timeMillis) {
  return Math.round(replayTimelineProgressForTime(timeMillis) * REPLAY_TIMELINE_RANGE_STEPS);
}

function replayTimelineTimeForInputValue(value) {
  return replayTimelineTimeForProgress((Number(value) || 0) / REPLAY_TIMELINE_RANGE_STEPS);
}

function replayTimelinePosition(timeMillis) {
  const progress = replayTimelineProgressForTime(timeMillis);
  const percent = Math.round(progress * 100000) / 1000;
  const offset = Math.round((0.5 - progress) * REPLAY_RANGE_THUMB_SIZE_PX * 1000) / 1000;

  if (Math.abs(offset) < 0.001) return `${percent}%`;
  return `calc(${percent}% ${offset < 0 ? "-" : "+"} ${Math.abs(offset)}px)`;
}

function updateReplayControlsTargetWidth(anchors) {
  const count = anchors.length;
  const maxLevel = Math.max(0, ...anchors.map((anchor) => Number(anchor.level)).filter(Number.isFinite));
  const digits = Math.max(1, String(maxLevel || count || 1).length);
  const anchorWidth = Math.max(REPLAY_LEVEL_ANCHOR_MIN_WIDTH_PX, digits * 7 + 8);
  const anchorsWidth = count * anchorWidth + Math.max(0, count - 1) * REPLAY_LEVEL_SEPARATOR_WIDTH_PX;
  const targetWidth = Math.max(REPLAY_CONTROLS_BASE_TARGET_WIDTH_PX, REPLAY_CONTROLS_FIXED_TRACKS_PX + anchorsWidth);

  document.documentElement.style.setProperty("--replay-controls-target-width", `${Math.ceil(targetWidth)}px`);
  if (replayControls) replayControls.dataset.levelAnchorCount = String(count);
}

function renderLevelAnchors() {
  if (!levelAnchors) return;

  const anchors = replayLevelAnchors();
  updateReplayControlsTargetWidth(anchors);
  levelAnchors.replaceChildren();
  levelAnchors.hidden = anchors.length === 0;
  levelAnchors.style.setProperty("--level-anchor-count", String(Math.max(1, anchors.length)));

  if (!anchors.length) return;

  for (const anchor of anchors) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.level = String(anchor.level);
    button.dataset.timeMillis = String(anchor.timeMillis);
    button.textContent = String(anchor.level);
    button.title = `Go to level ${anchor.level} outcome (${formatReplayTime(anchor.timeMillis)})`;
    button.setAttribute("aria-label", `Go to level ${anchor.level} outcome at ${formatReplayTime(anchor.timeMillis)}`);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      seekReplayLevelOutcome(button);
    });
    levelAnchors.appendChild(button);
  }

  updateLevelAnchors();
}

function updateLevelAnchors() {
  if (!levelAnchors || levelAnchors.hidden) return;

  const buttons = [...levelAnchors.querySelectorAll("button[data-time-millis]")];
  let activeIndex = -1;

  for (const [index, button] of buttons.entries()) {
    const timeMillis = Number(button.dataset.timeMillis);
    if (Number.isFinite(timeMillis) && state.timeMillis >= timeMillis) activeIndex = index;
  }

  for (const [index, button] of buttons.entries()) {
    const active = index === activeIndex;
    button.dataset.active = active ? "true" : "false";
    if (active) {
      button.setAttribute("aria-current", "step");
    } else {
      button.removeAttribute("aria-current");
    }
  }
}

function formatReplayTime(milliseconds) {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours}:${minutes}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

function formatReplayTimePrecise(milliseconds) {
  const millis = Math.max(0, Math.round(milliseconds));
  return `${formatReplayTime(millis)}.${String(millis % 1000).padStart(3, "0")}`;
}

function formatReplayEventTime(milliseconds) {
  const totalSeconds = Math.floor(Math.max(0, Number(milliseconds) || 0) / 1000);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

function formatReplayCompactTime(milliseconds) {
  const totalSeconds = Math.floor(Math.max(0, Number(milliseconds) || 0) / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours}h${String(minutes).padStart(2, "0")}m${String(seconds).padStart(2, "0")}s`;
  }

  if (minutes > 0) {
    return `${minutes}m${String(seconds).padStart(2, "0")}s`;
  }

  return `${seconds}s`;
}

function setReplayTime(milliseconds) {
  state.timeMillis = clamp(Math.round(milliseconds), 0, state.durationMillis || 0);
  replayTime.value = String(replayTimelineInputValueForTime(state.timeMillis));
  replayTime.style.setProperty("--replay-progress-position", replayTimelinePosition(state.timeMillis));
  replayCurrentTime.value = formatReplayTime(state.timeMillis);
  replayCurrentTime.textContent = formatReplayTime(state.timeMillis);
  updateWaveStatus();
  updateTeamSendOverlays();
  publishReplayTime();
  positionTokens();
  updateKingTokens();
  positionTeamOverlay();
  updateTeamOverlayStats();
  updateLoadStateControls();
  updateLevelAnchors();
  if (typeof updateEndgameOverlay === "function") updateEndgameOverlay();
}

function waveStatusAtTime(timeMillis = state.timeMillis) {
  const waves = state.replayIndex.waveEvents || [];
  if (!waves.length) return { phase: "none" };

  let previous;

  for (const wave of waves) {
    const startMillis = Number(wave.startMillis);
    const endMillis = wave.endMillis === null || wave.endMillis === undefined ? undefined : Number(wave.endMillis);

    if (timeMillis < startMillis) {
      return {
        phase: "build",
        nextWave: wave,
        previousWave: previous,
        remainingMillis: startMillis - timeMillis,
      };
    }

    if (endMillis === undefined || timeMillis < endMillis) {
      return {
        phase: "wave",
        wave,
        remainingMillis: endMillis === undefined ? undefined : Math.max(0, endMillis - timeMillis),
      };
    }

    previous = wave;
  }

  return { phase: "complete", previousWave: previous };
}

function waveForLevel(level) {
  const normalizedLevel = Number(level);
  if (!Number.isFinite(normalizedLevel)) return undefined;
  return (state.replayIndex.waveEvents || []).find((wave) => Number(wave.level) === normalizedLevel);
}

function reviewWaveLevelAtTime(timeMillis = state.timeMillis) {
  const explicitLevel = Number(state.prepHighlightWaveLevel);
  if (Number.isFinite(explicitLevel)) {
    const anchor = replayLevelAnchors().find((item) => Number(item.level) === explicitLevel);
    const anchorTimeMillis = Number(anchor?.timeMillis);
    if (Number.isFinite(anchorTimeMillis) && Math.abs(anchorTimeMillis - Number(timeMillis)) <= REPLAY_LEVEL_OUTCOME_TIME_TOLERANCE_MS) {
      return explicitLevel;
    }
  }
  if (state.playbackHandle !== undefined) return undefined;
  return replayLevelOutcomeLevelAtTime(timeMillis);
}

function reviewWaveAtTime(timeMillis = state.timeMillis) {
  return waveForLevel(reviewWaveLevelAtTime(timeMillis));
}

function buildSnapshotWaveAtTime(timeMillis = state.timeMillis) {
  const reviewWave = reviewWaveAtTime(timeMillis);
  if (reviewWave) return reviewWave;

  const status = waveStatusAtTime(timeMillis);
  return status.phase === "wave" ? status.wave : undefined;
}

function buildSnapshotTimeAt(timeMillis = state.timeMillis) {
  const wave = buildSnapshotWaveAtTime(timeMillis);
  const startMillis = Number(wave?.startMillis);
  return Number.isFinite(startMillis) ? startMillis : timeMillis;
}

function previousWaveForLevel(level) {
  const normalizedLevel = Number(level);
  if (!Number.isFinite(normalizedLevel)) return undefined;
  const waves = state.replayIndex.waveEvents || [];
  const index = waves.findIndex((wave) => Number(wave.level) === normalizedLevel);
  return index > 0 ? waves[index - 1] : undefined;
}

function prepWindowForWave(wave, currentMillis = Number(wave?.startMillis)) {
  if (!wave) return null;

  const previousEndMillis = Number(previousWaveForLevel(wave.level)?.endMillis);
  const startMillis = Number.isFinite(previousEndMillis) ? previousEndMillis : 0;
  const endMillis = Number(wave.startMillis);
  const windowCurrentMillis = Number(currentMillis);

  return Number.isFinite(endMillis)
    ? {
        startMillis,
        endMillis,
        currentMillis: Number.isFinite(windowCurrentMillis) ? Math.min(windowCurrentMillis, endMillis) : endMillis,
        nextWave: wave,
      }
    : null;
}

function prepWindowAtTime(timeMillis = state.timeMillis) {
  const highlightedWave = reviewWaveAtTime(timeMillis);
  if (highlightedWave) return prepWindowForWave(highlightedWave);

  const status = waveStatusAtTime(timeMillis);
  if (status.phase === "build" && status.nextWave) return prepWindowForWave(status.nextWave, timeMillis);
  if (status.phase === "wave" && status.wave) return prepWindowForWave(status.wave);
  if (status.phase === "complete" && status.previousWave) return prepWindowForWave(status.previousWave);

  return null;
}

function prepWindowContainsMillis(prepWindow, timeMillis) {
  const millis = Number(timeMillis);
  if (!prepWindow || !Number.isFinite(millis)) return false;
  return millis >= prepWindow.startMillis && millis <= prepWindow.currentMillis && millis < prepWindow.endMillis;
}

function tokenChangedInPrep(token, prepWindow, { builtOnly = false } = {}) {
  if (!prepWindow || token.isKing || !isTokenActiveAtTime(token)) return false;

  const states = Array.isArray(token.unitStates) ? token.unitStates : [];
  return states.some((unitState, index) => {
    if (builtOnly && index > 0) return false;
    return prepWindowContainsMillis(prepWindow, unitState.timeMillis);
  });
}

function prepBuiltRollUnitTypesForPlayer(playerId, prepWindow = prepWindowAtTime()) {
  const unitTypes = new Set();
  if (!prepWindow) return unitTypes;

  for (const token of state.tokens || []) {
    if (Number(token.playerId) !== Number(playerId)) continue;
    if (!tokenChangedInPrep(token, prepWindow, { builtOnly: true })) continue;
    const initialState = Array.isArray(token.unitStates) ? token.unitStates[0] : undefined;
    const unitType = initialState?.unitType || token.id;
    if (unitType) unitTypes.add(unitType);
  }

  return unitTypes;
}

function waveDisplayName(wave) {
  if (!wave) return "Wave";
  return wave.creepName ? `Wave ${wave.level}: ${wave.creepName}` : `Wave ${wave.level}`;
}

function formatWaveSendSummary(summary, emptyText = "No sends") {
  if (!summary) return "";

  const unitCount = Number(summary.nonAuraCount || 0) + Number(summary.auraCount || 0);
  const senderCount = Number(summary.senderCount || 0);
  const parts = [];

  if (unitCount > 0) parts.push(`${compactNumber(unitCount)} unit${unitCount === 1 ? "" : "s"}`);
  if (!parts.length) return emptyText;

  return `${parts.join(" / ")}${senderCount > 0 ? ` from ${compactNumber(senderCount)} sender${senderCount === 1 ? "" : "s"}` : ""}`;
}

function waveSendSummaryFromUnitSends(wave, timeMillis = state.timeMillis) {
  if (!wave) return undefined;

  const sends = (state.replayIndex.unitSends || []).filter((send) => {
    if (Number(send.timeMillis) > Number(timeMillis)) return false;
    return sendTargetWaveForTime(send.timeMillis)?.level === wave.level;
  });

  return {
    auraCount: sends.filter((send) => send.isAura === true).length,
    nonAuraCount: sends.filter((send) => send.isAura !== true).length,
    senderCount: new Set(sends.map((send) => Number(send.playerId))).size,
  };
}

function waveSendSummary(wave, timeMillis = state.timeMillis) {
  const dynamicSummary = waveSendSummaryFromUnitSends(wave, timeMillis);
  if (dynamicSummary) {
    const emptyText = Number(timeMillis) < Number(wave?.startMillis || 0) ? "No sends yet" : "No sends";
    return formatWaveSendSummary(dynamicSummary, emptyText);
  }

  return formatWaveSendSummary(wave?.sendSummary);
}

function waveDetailText(wave, timeMillis = state.timeMillis) {
  if (!wave) return "";
  if (wave.description) return wave.description;
  return waveSendSummary(wave, timeMillis);
}

function updateWaveStatus() {
  if (!waveStatus || !wavePhase || !waveTitle || !waveTimer || !waveDetail) return;

  const status = waveStatusAtTime();
  if (status.phase === "none") {
    waveStatus.hidden = true;
    return;
  }

  waveStatus.hidden = false;
  waveStatus.dataset.phase = status.phase;

  const reviewWave = reviewWaveAtTime();
  if (reviewWave) {
    waveStatus.dataset.phase = "review";
    wavePhase.textContent = "Review";
    waveTitle.textContent = waveDisplayName(reviewWave);
    waveTimer.textContent = "";
    waveDetail.textContent = waveDetailText(reviewWave, Number.POSITIVE_INFINITY);
    return;
  }

  if (status.phase === "wave") {
    const remaining = status.remainingMillis === undefined ? "" : `Ends in ${formatReplayCompactTime(status.remainingMillis)}`;
    wavePhase.textContent = "Wave in progress";
    waveTitle.textContent = waveDisplayName(status.wave);
    waveTimer.textContent = remaining;
    waveDetail.textContent = waveDetailText(status.wave, state.timeMillis);
    return;
  }

  if (status.phase === "build") {
    wavePhase.textContent = "PREP";
    waveTitle.textContent = waveDisplayName(status.nextWave);
    waveTimer.textContent = `Next in ${formatReplayCompactTime(status.remainingMillis)}`;
    waveDetail.textContent = waveDetailText(status.nextWave, state.timeMillis);
    return;
  }

  wavePhase.textContent = "Done";
  waveTitle.textContent = status.previousWave ? `After ${waveDisplayName(status.previousWave)}` : "Replay";
  waveTimer.textContent = "";
  waveDetail.textContent = "";
}

function sendTargetWaveForTime(timeMillis) {
  const waves = state.replayIndex.waveEvents || [];

  for (const wave of waves) {
    if (Number(timeMillis) < Number(wave.startMillis)) return wave;
  }

  return undefined;
}

function activeSendWaveAtTime(timeMillis = state.timeMillis) {
  const reviewWave = reviewWaveAtTime(timeMillis);
  if (reviewWave) return reviewWave;

  const status = waveStatusAtTime(timeMillis);
  if (status.phase === "build") return status.nextWave;
  if (status.phase === "wave") return status.wave;
  return undefined;
}

function teamIndexForPlayerId(playerId) {
  for (const [teamIndex, team] of (state.replay?.teams ?? []).entries()) {
    if ((team.players || []).some((player) => Number(player.id) === Number(playerId))) return teamIndex;
  }

  return undefined;
}

function opposingTeamIndexForPlayerId(playerId) {
  const teamIndex = teamIndexForPlayerId(playerId);
  if (teamIndex === undefined) return undefined;

  const opponentIndex = (state.replay?.teams ?? []).findIndex((_, index) => index !== teamIndex);
  return opponentIndex >= 0 ? opponentIndex : undefined;
}

function unitSendsForWaveFromTeam(wave, senderTeamIndex, timeMillis = Number.POSITIVE_INFINITY) {
  if (!wave || senderTeamIndex === undefined) return [];

  return (state.replayIndex.unitSends || []).filter((send) => {
    if (send.teamId === null || send.teamId === undefined) return false;
    if (Number(send.teamId) !== Number(senderTeamIndex)) return false;
    if (Number(send.timeMillis) > Number(timeMillis)) return false;
    return sendTargetWaveForTime(send.timeMillis)?.level === wave.level;
  });
}

function sendGroupsForWaveFromTeam(wave, senderTeamIndex, timeMillis = Number.POSITIVE_INFINITY) {
  const groupsByType = new Map();

  for (const send of unitSendsForWaveFromTeam(wave, senderTeamIndex, timeMillis)) {
    const unitType = send.unitType || "unknown";
    const group =
      groupsByType.get(unitType) ||
      {
        unitType,
        unitName: send.unitName || unitType,
        iconPath: send.iconPath,
        isAura: send.isAura === true,
        lumberCost: send.lumberCost,
        bounty: send.bounty,
        income: send.income,
        description: send.description || "",
        stats: send.stats || null,
        count: 0,
        firstTimeMillis: Number(send.timeMillis),
      };

    group.count += 1;
    group.firstTimeMillis = Math.min(group.firstTimeMillis, Number(send.timeMillis));
    group.isAura = group.isAura || send.isAura === true;
    if (!group.description && send.description) group.description = send.description;
    if (!group.stats && send.stats) group.stats = send.stats;
    groupsByType.set(unitType, group);
  }

  return [...groupsByType.values()].sort(
    (a, b) =>
      a.firstTimeMillis - b.firstTimeMillis ||
      Number(Boolean(b.isAura)) - Number(Boolean(a.isAura)) ||
      Number(a.lumberCost ?? 0) - Number(b.lumberCost ?? 0) ||
      a.unitName.localeCompare(b.unitName),
  );
}

function sendGroupSummary(groups, emptyText = "No sends") {
  const count = groups.reduce((sum, group) => sum + Number(group.count || 0), 0);
  if (!count) return emptyText;

  const auraCount = groups.filter((group) => group.isAura).reduce((sum, group) => sum + Number(group.count || 0), 0);
  const parts = [`${compactNumber(count)} send${count === 1 ? "" : "s"}`];
  if (auraCount > 0) parts.push(`${compactNumber(auraCount)} aura`);
  return parts.join(" / ");
}

function sendPanelSummaryForWaveFromTeam(wave, senderTeamIndex, timeMillis = Number.POSITIVE_INFINITY, emptyText = "No sends") {
  const sends = unitSendsForWaveFromTeam(wave, senderTeamIndex, timeMillis);
  const sendCount = sends.length;
  if (!sendCount) return emptyText;

  const senderCount = new Set(sends.map((send) => Number(send.playerId))).size;
  return `${compactNumber(sendCount)} send${sendCount === 1 ? "" : "s"}${
    senderCount > 0 ? ` from ${compactNumber(senderCount)} sender${senderCount === 1 ? "" : "s"}` : ""
  }`;
}

function sendWaveLabel(wave) {
  return wave ? `Wave ${wave.level}` : "Wave";
}

function waveBaseCreepCount(wave) {
  if (!wave) return 0;

  const explicitCount = Number(wave.creep?.count ?? wave.creepCount ?? wave.count);
  if (Number.isFinite(explicitCount) && explicitCount > 0) return explicitCount;

  const level = Number(wave.level);
  const overrideCount = WAVE_CREEP_COUNT_OVERRIDES.get(level);
  if (overrideCount !== undefined) return overrideCount;

  return isBossWave(wave) ? BOSS_WAVE_CREEP_COUNT : DEFAULT_WAVE_CREEP_COUNT;
}

function isBossWave(wave) {
  const level = Number(wave?.level ?? wave?.creep?.level);
  return Number.isFinite(level) && BOSS_WAVE_LEVELS.has(level);
}

function leakPercent(leakedCount, totalCount) {
  const total = Number(totalCount);
  if (!Number.isFinite(total) || total <= 0) return "";
  const leaked = clamp(Number(leakedCount) || 0, 0, total);
  return `${Math.round((leaked / total) * 100)}%`;
}

function leakSummaryText(leaks, totalIncomingCount, incomingBreakdown = "") {
  const percent = leakPercent(leaks, totalIncomingCount);
  const countText = `${compactNumber(leaks)}/${compactNumber(totalIncomingCount)}`;
  const detailText = [countText, incomingBreakdown ? `from ${incomingBreakdown}` : ""].filter(Boolean).join(", ");
  return percent ? `Leaks: ${percent} (${detailText})` : `Leaks: ${countText}`;
}

function incomingBreakdownText(creepCount, sendCount, challengeCount) {
  const parts = [`${compactNumber(creepCount)} creeps`];
  if (sendCount > 0) parts.push(`${compactNumber(sendCount)} send${sendCount === 1 ? "" : "s"}`);
  if (challengeCount > 0) parts.push(`${compactNumber(challengeCount)} CC`);
  return parts.join(", ");
}

function challengeChampionCountForPlayerWave(playerId, wave) {
  if (!wave) return 0;

  return (state.replayIndex.eventsByPlayer.get(Number(playerId)) || []).filter((event) => {
    if (event.type !== "CHAMPION_CHALLENGED") return false;
    return sendTargetWaveForTime(event.timeMillis)?.level === wave.level;
  }).length;
}

function incomingSendCountForPlayerWave(playerId, wave) {
  const senderTeamIndex = opposingTeamIndexForPlayerId(playerId);
  if (senderTeamIndex === undefined) return 0;

  return sendGroupsForWaveFromTeam(wave, senderTeamIndex).reduce((sum, group) => sum + Number(group.count || 0), 0);
}

function compactOutcomeText(parts) {
  return parts.map((part) => part.text).join(" | ");
}

function playerWaveStat(playerId, waveOrLevel) {
  const level = Number(waveOrLevel?.level ?? waveOrLevel);
  if (!Number.isFinite(level)) return undefined;

  return (state.replayIndex.statsByPlayer.get(Number(playerId)) || []).find((row) => Number(row.levelNumber) === level);
}

function waveStatDelta(current, previous, key) {
  const currentValue = Number(current?.[key]);
  if (!Number.isFinite(currentValue)) return undefined;

  const previousValue = Number(previous?.[key]);
  return currentValue - (Number.isFinite(previousValue) ? previousValue : 0);
}

function playerWaveOutcome(playerId, wave) {
  if (!wave) return undefined;

  const current = playerWaveStat(playerId, wave);
  if (!current) return undefined;

  const level = Number(wave.level);
  const previous = Number.isFinite(level) && level > 1 ? playerWaveStat(playerId, level - 1) : undefined;
  const leaks = Math.max(0, waveStatDelta(current, previous, "leakedAmountCumulative") ?? 0);
  const creepCount = waveBaseCreepCount(wave);
  const sendCount = incomingSendCountForPlayerWave(playerId, wave);
  const challengeCount = challengeChampionCountForPlayerWave(playerId, wave);
  const totalIncomingCount = creepCount + sendCount + challengeCount;
  const hasExtraIncoming = sendCount > 0 || challengeCount > 0;

  if (leaks <= 0) {
    const parts = [{ text: `Clear vs ${incomingBreakdownText(creepCount, sendCount, challengeCount)}`, tone: "good" }];
    if (challengeCount > 0) parts.push({ text: "Killed CC", tone: "good" });
    return {
      level,
      text: compactOutcomeText(parts),
      tone: "good",
      parts,
    };
  }

  if (hasExtraIncoming) {
    const nonChallengeIncomingCount = creepCount + sendCount;
    const parts = [
      {
        text: leakSummaryText(leaks, totalIncomingCount, incomingBreakdownText(creepCount, sendCount, challengeCount)),
        tone: "bad",
      },
    ];

    if (challengeCount > 0 && leaks > nonChallengeIncomingCount) {
      parts.push({ text: "Leaked CC", tone: "cc" });
    }

    return {
      level,
      text: compactOutcomeText(parts),
      tone: "bad",
      parts,
    };
  }

  return {
    level,
    text: leakSummaryText(leaks, creepCount),
    tone: leaks > 0 ? "bad" : "good",
  };
}

function playerIncomingSendState(playerId, timeMillis = state.timeMillis) {
  const senderTeamIndex = opposingTeamIndexForPlayerId(playerId);
  if (senderTeamIndex === undefined) return undefined;

  const status = waveStatusAtTime(timeMillis);
  if (status.phase === "none") return undefined;

  const reviewWave = reviewWaveAtTime(timeMillis);
  if (reviewWave) {
    const groups = sendGroupsForWaveFromTeam(reviewWave, senderTeamIndex);
    return {
      title: `${sendWaveLabel(reviewWave)} review`,
      detail: sendPanelSummaryForWaveFromTeam(reviewWave, senderTeamIndex),
      wave: reviewWave,
      creep: waveCreepForWave(reviewWave),
      groups,
      emptyText: "No sends",
      outcomeLabel: "Outcome",
      previousOutcome: playerWaveOutcome(playerId, reviewWave),
      isReview: true,
    };
  }

  if (status.phase === "complete") {
    const groups = sendGroupsForWaveFromTeam(status.previousWave, senderTeamIndex);
    return {
      title: status.previousWave ? `${sendWaveLabel(status.previousWave)} summary` : "Summary",
      detail: sendPanelSummaryForWaveFromTeam(status.previousWave, senderTeamIndex),
      wave: status.previousWave,
      creep: waveCreepForWave(status.previousWave),
      groups,
      emptyText: "No sends",
      previousOutcome: playerWaveOutcome(playerId, status.previousWave),
    };
  }

  const wave = activeSendWaveAtTime(timeMillis);
  const groups = sendGroupsForWaveFromTeam(wave, senderTeamIndex, timeMillis);
  const emptyText = Number(timeMillis) < Number(wave?.startMillis || 0) ? "No incoming yet" : "No incoming";
  const sendSummaryEmptyText = Number(timeMillis) < Number(wave?.startMillis || 0) ? "No sends yet" : "No sends";

  return {
    title: wave ? `Incoming ${sendWaveLabel(wave)}` : "Incoming",
    detail: sendPanelSummaryForWaveFromTeam(wave, senderTeamIndex, timeMillis, sendSummaryEmptyText),
    wave,
    creep: waveCreepForWave(wave),
    previousWave: status.previousWave,
    groups,
    emptyText,
    previousSummary: status.previousWave ? `Last ${sendWaveLabel(status.previousWave)}` : "",
    previousOutcome: playerWaveOutcome(playerId, status.previousWave),
  };
}

function waveCreepForWave(wave) {
  return wave?.creep || null;
}

function activeTeamPlayerSendGroups(teamIndex) {
  const wave = activeSendWaveAtTime();
  if (!wave) return [];

  const roster = state.replay?.teams?.[Number(teamIndex)]?.players || [];
  const rosterOrder = new Map(roster.map((player, index) => [Number(player.id), index]));
  const groupsByPlayer = new Map();

  for (const send of state.replayIndex.unitSends || []) {
    if (send.teamId === null || send.teamId === undefined) continue;
    if (Number(send.teamId) !== Number(teamIndex)) continue;
    if (Number(send.timeMillis) > state.timeMillis) continue;
    if (sendTargetWaveForTime(send.timeMillis)?.level !== wave.level) continue;

    const playerId = Number(send.playerId);
    const player = playerForId(playerId);
    const playerGroup =
      groupsByPlayer.get(playerId) ||
      {
        playerId,
        playerName: player?.name || `P${playerId}`,
        groups: new Map(),
        firstTimeMillis: Number(send.timeMillis),
      };
    const unitName = send.unitName || send.unitType || "Unit";
    const group = playerGroup.groups.get(unitName) || { unitName, count: 0, firstTimeMillis: Number(send.timeMillis) };
    group.count += 1;
    group.firstTimeMillis = Math.min(group.firstTimeMillis, Number(send.timeMillis));
    playerGroup.firstTimeMillis = Math.min(playerGroup.firstTimeMillis, Number(send.timeMillis));
    playerGroup.groups.set(unitName, group);
    groupsByPlayer.set(playerId, playerGroup);
  }

  return [...groupsByPlayer.values()]
    .map((playerGroup) => ({
      ...playerGroup,
      groups: [...playerGroup.groups.values()].sort(
        (a, b) => b.count - a.count || a.firstTimeMillis - b.firstTimeMillis || a.unitName.localeCompare(b.unitName),
      ),
    }))
    .sort((a, b) => {
      const orderA = rosterOrder.get(a.playerId) ?? Number.MAX_SAFE_INTEGER;
      const orderB = rosterOrder.get(b.playerId) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB || a.firstTimeMillis - b.firstTimeMillis || a.playerId - b.playerId;
    });
}

function ensureTeamSendsPanel(index) {
  if (!teamOverlay) return undefined;
  const side = index === 0 ? "one" : "two";
  let panel = teamOverlay.querySelector(`.team-overlay__sends--${side}`);
  if (!panel) {
    panel = document.createElement("div");
    panel.className = `team-overlay__sends team-overlay__sends--${side}`;
    panel.setAttribute("aria-label", `Team ${index + 1} sends`);
    panel.hidden = true;
    teamOverlay.appendChild(panel);
  }
  return panel;
}

function updateTeamSendOverlays() {
  if (!teamOverlay) return;

  for (const teamIndex of [0, 1]) {
    const panel = ensureTeamSendsPanel(teamIndex);
    if (!panel) continue;

    const playerGroups = activeTeamPlayerSendGroups(teamIndex);
    if (!playerGroups.length) {
      panel.hidden = true;
      panel.replaceChildren();
      continue;
    }

    panel.hidden = false;
    panel.replaceChildren(
      ...playerGroups.map((playerGroup) => {
        const section = document.createElement("section");
        section.className = "team-overlay__send-player";

        const playerName = document.createElement("div");
        playerName.className = "team-overlay__send-player-name";
        playerName.textContent = playerGroup.playerName;
        playerName.style.setProperty("--player-name-color", playerSlotColor(playerGroup.playerId));
        section.appendChild(playerName);

        for (const group of playerGroup.groups) {
          const row = document.createElement("div");
          row.className = "team-overlay__send-row";
          row.textContent = `Sent ${group.unitName}: ${compactNumber(group.count)}`;
          section.appendChild(row);
        }

        return section;
      }),
    );
  }
}

function playbackRateIndex() {
  const currentRate = Number(state.playbackRate) || DEFAULT_PLAYBACK_RATE;
  const index = PLAYBACK_RATES.indexOf(currentRate);
  return index === -1 ? 0 : index;
}

function updatePlaybackRateControls() {
  const rate = PLAYBACK_RATES[playbackRateIndex()];
  replaySpeedValue.value = `${rate}x`;
  replaySpeedValue.textContent = `${rate}x`;
  replaySpeedDown.disabled = rate <= PLAYBACK_RATES[0];
  replaySpeedUp.disabled = rate >= PLAYBACK_RATES[PLAYBACK_RATES.length - 1];
  replaySpeedDown.setAttribute("aria-label", `Slow replay down from ${rate}x`);
  replaySpeedUp.setAttribute("aria-label", `Speed replay up from ${rate}x`);
}

function setPlaybackRate(rate) {
  const nextRate = PLAYBACK_RATES.includes(rate) ? rate : DEFAULT_PLAYBACK_RATE;
  const wasPlaying = state.playbackHandle !== undefined;
  state.playbackRate = nextRate;

  if (wasPlaying) {
    state.playStartMillis = performance.now();
    state.playStartTimeMillis = state.timeMillis;
  }

  updatePlaybackRateControls();
}

function stepPlaybackRate(direction) {
  const nextIndex = clamp(playbackRateIndex() + direction, 0, PLAYBACK_RATES.length - 1);
  setPlaybackRate(PLAYBACK_RATES[nextIndex]);
}

function startPlayback() {
  if (state.durationMillis <= 0) return;
  state.prepHighlightWaveLevel = undefined;
  if (state.playbackHandle !== undefined) {
    cancelAnimationFrame(state.playbackHandle);
  }
  if (state.timeMillis >= state.durationMillis) setReplayTime(0);
  state.playStartMillis = performance.now();
  state.playStartTimeMillis = state.timeMillis;
  replayPlay.dataset.playing = "true";
  replayPlay.setAttribute("aria-label", "Pause replay");
  state.playbackHandle = requestAnimationFrame(tickPlayback);
}

function pausePlayback() {
  if (state.playbackHandle !== undefined) {
    cancelAnimationFrame(state.playbackHandle);
    state.playbackHandle = undefined;
  }
  replayPlay.dataset.playing = "false";
  replayPlay.setAttribute("aria-label", "Play replay");
}

function seekReplayTime(milliseconds) {
  const wasPlaying = state.playbackHandle !== undefined;
  setReplayTime(milliseconds);

  if (wasPlaying) {
    state.playStartMillis = performance.now();
    state.playStartTimeMillis = state.timeMillis;
  }
}

function seekReplayLevelOutcome(button) {
  const level = Number(button.dataset.level);
  const timeMillis = Number(button.dataset.timeMillis);
  if (!Number.isFinite(level) || !Number.isFinite(timeMillis)) return;

  pausePlayback();
  state.prepHighlightWaveLevel = level;
  seekReplayTime(timeMillis);
}

function tickPlayback(now) {
  const elapsed = now - (state.playStartMillis ?? now);
  const nextTime = (state.playStartTimeMillis ?? 0) + elapsed * (Number(state.playbackRate) || DEFAULT_PLAYBACK_RATE);
  setReplayTime(nextTime);

  if (state.timeMillis >= state.durationMillis) {
    pausePlayback();
    return;
  }

  state.playbackHandle = requestAnimationFrame(tickPlayback);
}

function playerForId(playerId) {
  for (const team of state.replay?.teams ?? []) {
    const player = team.players.find((candidate) => candidate.id === playerId);
    if (player) return player;
  }

  return undefined;
}

function playerDisplayName(player) {
  if (!player) return "";
  return player.elo === null || player.elo === undefined ? player.name : `${player.name} (${player.elo})`;
}

function playerProfileFromTrigger(trigger) {
  const playerId = Number(trigger?.dataset?.playerId ?? trigger?.closest?.("[data-player-id]")?.dataset?.playerId);
  const battleTag = trigger?.dataset?.battleTag || trigger?.closest?.("[data-battle-tag]")?.dataset?.battleTag || "";
  const player = Number.isFinite(playerId) ? playerForId(playerId) : undefined;

  return player || { id: playerId, battleTag, name: battleTag.split("#")[0] || battleTag || "Player", elo: null };
}

function openPlayerProfileFromClick(event) {
  const trigger = event.target?.closest?.("[data-player-profile]");
  if (!trigger) return false;

  event.preventDefault();
  event.stopPropagation();
  openPlayerProfilePopover(playerProfileFromTrigger(trigger));
  return true;
}

function openPlayerProfilePopover(player) {
  if (!player?.battleTag) return;

  closePlayerEventsPopover();
  if (openParentPlayerProfile(player)) return;

  if (!playerProfilePopover) return;
  state.playerProfileRequest?.abort?.();
  const controller = new AbortController();
  state.playerProfileRequest = controller;
  playerProfilePopover.hidden = false;
  playerProfilePopover.innerHTML = playerProfileLoadingTemplate(player);

  const params = new URLSearchParams({ battleTag: player.battleTag });
  fetch(`/api/player-profile?${params.toString()}`, { signal: controller.signal })
    .then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Unable to load profile");
      return payload;
    })
    .then((profile) => {
      if (state.playerProfileRequest !== controller) return;
      playerProfilePopover.innerHTML = playerProfileTemplate(profile);
    })
    .catch((error) => {
      if (controller.signal.aborted || state.playerProfileRequest !== controller) return;
      playerProfilePopover.innerHTML = playerProfileErrorTemplate(player, error);
    });
}

function openParentPlayerProfile(player) {
  if (window.parent === window) return false;

  const targetOrigin = window.location.origin === "null" ? "*" : window.location.origin;
  window.parent.postMessage(
    {
      type: "legionOpenPlayerProfile",
      battleTag: player.battleTag,
    },
    targetOrigin,
  );
  return true;
}

function closePlayerProfilePopover() {
  state.playerProfileRequest?.abort?.();
  state.playerProfileRequest = undefined;
  if (!playerProfilePopover) return;
  playerProfilePopover.hidden = true;
  playerProfilePopover.replaceChildren();
}

function playerProfileLoadingTemplate(player) {
  return `
    <header class="replay-player-profile__header">
      <div>
        <strong>${escapeHtml(player.name || player.battleTag)}</strong>
        <span>${escapeHtml(player.battleTag)}</span>
      </div>
      <button class="replay-player-profile__close" type="button" data-player-profile-close aria-label="Close player profile">×</button>
    </header>
    <div class="replay-player-profile__status">Loading profile...</div>
  `;
}

function playerProfileErrorTemplate(player, error) {
  const message = error instanceof Error ? error.message : "Unable to load profile";

  return `
    <header class="replay-player-profile__header">
      <div>
        <strong>${escapeHtml(player.name || player.battleTag)}</strong>
        <span>${escapeHtml(player.battleTag)}</span>
      </div>
      <button class="replay-player-profile__close" type="button" data-player-profile-close aria-label="Close player profile">×</button>
    </header>
    <div class="replay-player-profile__status replay-player-profile__status--error">${escapeHtml(message)}</div>
  `;
}

function playerProfileTemplate(profile) {
  const current = profile?.w3c?.current;
  const local = profile?.local || {};
  const topPercent = replayProfileTopPercent(current?.topPercent);
  const modeRows = (profile?.w3c?.modes || [])
    .slice(0, 3)
    .map(
      (mode) => `
        <div class="replay-player-profile__row">
          <span>${escapeHtml(mode.label)}</span>
          <strong>${escapeHtml(compactNumber(mode.mmr))}</strong>
          <small>${escapeHtml(mode.wins)}-${escapeHtml(mode.losses)} (${escapeHtml(replayProfilePercent(mode.winrate))})</small>
        </div>
      `,
    )
    .join("");

  return `
    <header class="replay-player-profile__header">
      <div>
        <strong>${escapeHtml(profile.name || profile.battleTag)}</strong>
        <span>${escapeHtml(profile.battleTag)}</span>
      </div>
      <a href="${escapeHtml(profile.w3cProfileUrl)}" target="_blank" rel="noreferrer">W3C</a>
      <button class="replay-player-profile__close" type="button" data-player-profile-close aria-label="Close player profile">×</button>
    </header>
    <div class="replay-player-profile__stats">
      ${replayProfileStat("W3C MMR", compactNumber(current?.mmr), "accent")}
      ${replayProfileStat("W3C Rank", current?.rank ? `#${compactNumber(current.rank)}` : "-")}
      ${replayProfileStat("W3C W/L", current ? `${current.wins}-${current.losses}` : "-")}
      ${replayProfileStat("W3C Games", compactNumber(current?.games))}
      ${replayProfileStat("Avg Value", compactNumber(local.averageValue))}
    </div>
    <div class="replay-player-profile__meta">
      <span>Season ${escapeHtml(profile?.w3c?.season ?? "-")}</span>
      ${topPercent ? `<span>${escapeHtml(topPercent)}</span>` : ""}
      <span>Last w3champions game ${escapeHtml(replayProfileDate(local.lastGameAt))}</span>
    </div>
    <section>
      <h3>W3C ladders</h3>
      ${modeRows || `<p>No W3C ladder stats found.</p>`}
    </section>
    <div class="replay-player-profile__columns">
      ${replayProfileUnitSection("Favorites", local.favoriteRolls || [])}
      ${replayProfileUnitSection("Opening units", local.favoriteOpeners || [])}
    </div>
    ${profile.fetchError ? `<p class="replay-player-profile__warning">${escapeHtml(profile.fetchError)}</p>` : ""}
  `;
}

function replayProfileStat(label, value, tone = "") {
  return `
    <div class="replay-player-profile__stat" data-tone="${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function replayProfileUnitSection(title, items) {
  if (!items.length) {
    return `
      <section>
        <h3>${escapeHtml(title)}</h3>
        <p>No data yet.</p>
      </section>
    `;
  }

  return `
    <section>
      <h3>${escapeHtml(title)}</h3>
      <div class="replay-player-profile__units">
        ${items
          .slice(0, 6)
          .map(
            (item) => `
              <div class="replay-player-profile__unit" title="${escapeHtml(replayProfileUnitTitle(item))}">
                <img alt="" src="${escapeHtml(item.iconPath)}" />
                <span>${escapeHtml(replayProfilePercent(item.percent))}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function replayProfileUnitTitle(item) {
  const seen = Number(item?.seen);
  const count = Number(item?.count);
  const unitName = item?.unitName || item?.unitType || "Unit";

  if (Number.isFinite(seen) && seen > 0 && Number.isFinite(count)) {
    if (item?.metric === "opening-pick") {
      return `${unitName}: opened ${compactNumber(count)}/${compactNumber(seen)} games when in opening roll`;
    }

    return `${unitName}: built ${compactNumber(count)}/${compactNumber(seen)} games when rolled`;
  }

  return `${unitName}${Number.isFinite(count) ? ` (${compactNumber(count)})` : ""}`;
}

function replayProfilePercent(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "-";
  return `${Math.round(numberValue * 100)}%`;
}

function replayProfileTopPercent(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "";
  return `Top ${Math.max(0.1, numberValue).toFixed(numberValue < 1 ? 1 : 0)}%`;
}

function replayProfileDate(value) {
  if (!value) return "-";
  const [datePart, timePart = ""] = String(value).split(" ");
  const [, month, day] = datePart.split("-");
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    Number(month) - 1
  ];

  return monthName && day ? `${Number(day)} ${monthName}${timePart ? ` ${timePart.slice(0, 5)}` : ""}` : value;
}

function playerSlotColor(playerId) {
  const slotIndex = Math.max(0, Number(playerId) - 1);
  return TEAM_COLORS[slotIndex % TEAM_COLORS.length] || TEAM_COLORS[0];
}

function lastAtOrBefore(rows = [], timeMillis = state.timeMillis) {
  let low = 0;
  let high = rows.length - 1;
  let found;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const rowTime = Number(rows[middle].timeMillis);
    if (rowTime <= timeMillis) {
      found = rows[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

function snapshotPairAtOrBefore(rows = [], timeMillis = state.timeMillis) {
  const { current, previous } = snapshotWindowAtOrBefore(rows, timeMillis);

  return { current, previous };
}

function snapshotWindowAtOrBefore(rows = [], timeMillis = state.timeMillis) {
  let low = 0;
  let high = rows.length - 1;
  let foundIndex = -1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const rowTime = Number(rows[middle].timeMillis);
    if (rowTime <= timeMillis) {
      foundIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return {
    current: foundIndex >= 0 ? rows[foundIndex] : undefined,
    previous: foundIndex > 0 ? rows[foundIndex - 1] : undefined,
    next: foundIndex + 1 < rows.length ? rows[foundIndex + 1] : undefined,
  };
}

function countAtOrBefore(rows = [], timeMillis = state.timeMillis, predicate = () => true) {
  let count = 0;

  for (const row of rows) {
    if (Number(row.timeMillis) > timeMillis) break;
    if (predicate(row)) count += 1;
  }

  return count;
}

function countPlayerEventsAtOrBefore(playerId, eventType, timeMillis = state.timeMillis) {
  return countAtOrBefore(state.replayIndex.eventsByPlayer.get(Number(playerId)) || [], timeMillis, (event) => event.type === eventType);
}

function visibleFlexChildrenHeight(element) {
  const style = getComputedStyle(element);
  const gap = Number.parseFloat(style.rowGap || style.gap) || 0;
  const children = [...element.children].filter((child) => {
    if (child.hidden) return false;
    return getComputedStyle(child).display !== "none";
  });

  return children.reduce((sum, child) => sum + child.getBoundingClientRect().height, 0) + Math.max(0, children.length - 1) * gap;
}

function updatePlayerCornerCardFit(card) {
  delete card.dataset.overflowing;
  if (!card.clientHeight) return;
  if (visibleFlexChildrenHeight(card) > card.clientHeight + 1) {
    card.dataset.overflowing = "true";
  }
}

function playerWispCountAt(playerId, timeMillis = state.timeMillis) {
  const economyEvents = state.replayIndex.economyByPlayer.get(Number(playerId)) || [];
  return BASE_WISP_COUNT + countAtOrBefore(economyEvents, timeMillis, (event) => event.type === "LUMBER_WISP");
}

function buildStateChangesForEvent(event) {
  return event.stateChanges?.length
    ? event.stateChanges
    : [
        {
          actionId: event.actionId,
          timeMillis: event.timeMillis,
          level: 1,
          unitType: event.unitType,
          unitName: event.unitName || event.unitType,
          goldCost: event.goldCost,
          totalGoldCost: event.totalGoldCost,
          sellGold: event.sellGold,
          upgradeGroup: event.upgradeGroup,
          iconPath: event.iconPath,
          description: event.description,
          stats: event.stats,
        },
      ];
}

function buildEventStateAt(event, timeMillis) {
  let current;

  for (const change of buildStateChangesForEvent(event)) {
    if (Number(change.timeMillis) > Number(timeMillis)) break;
    current = change;
  }

  return current;
}

function buildEventIsActiveAt(event, timeMillis) {
  const builtAtMillis = Number(event.timeMillis);
  if (!Number.isFinite(builtAtMillis) || builtAtMillis > Number(timeMillis)) return false;

  const removedAtMillis = event.removedAtMillis === null || event.removedAtMillis === undefined ? undefined : Number(event.removedAtMillis);
  return !Number.isFinite(removedAtMillis) || removedAtMillis > Number(timeMillis);
}

function buildStateGoldValue(buildState) {
  const value = Number(buildState?.totalGoldCost ?? buildState?.stats?.gold ?? buildState?.goldCost);
  return Number.isFinite(value) ? value : 0;
}

function playerBoardValueAt(playerId, timeMillis = state.timeMillis) {
  let total = 0;
  let hasValue = false;

  for (const event of state.replay?.buildUnits ?? []) {
    if (Number(event.playerId) !== Number(playerId)) continue;
    if (!buildEventIsActiveAt(event, timeMillis)) continue;

    const buildState = buildEventStateAt(event, timeMillis);
    if (!buildState) continue;

    total += buildStateGoldValue(buildState);
    hasValue = true;
  }

  return hasValue ? total : undefined;
}

function playerResourceStatsAt(playerId, timeMillis = state.timeMillis) {
  const statRows = state.replayIndex.statsByPlayer.get(Number(playerId)) || [];
  const resourceEvents = state.replayIndex.resourcesByPlayer.get(Number(playerId)) || [];
  const { current, next } = snapshotWindowAtOrBefore(statRows, timeMillis);
  const base = current || next;

  if (!base) return {};

  const values = {
    gold: base.gold,
    lumber: base.lumber,
    income: base.income,
    bounty: base.bounty,
  };
  const baseTime = Number(base.timeMillis);

  for (const event of resourceEvents) {
    const eventTime = Number(event.timeMillis);
    if (current) {
      if (eventTime <= baseTime) continue;
      if (eventTime > timeMillis) break;
      applyResourceEvent(values, event, 1);
    } else {
      if (eventTime <= timeMillis) continue;
      if (eventTime > baseTime) break;
      applyResourceEvent(values, event, -1);
    }
  }

  return normalizedResourceStats(values);
}

function applyResourceEvent(values, event, direction) {
  const deltas = [
    ["gold", event.goldDelta],
    ["lumber", event.lumberDelta],
    ["income", event.incomeDelta],
    ["bounty", event.bountyDelta],
  ];

  for (const [key, delta] of deltas) {
    if (delta === undefined || delta === null || values[key] === undefined || values[key] === null) continue;
    values[key] = Number(values[key]) + Number(delta) * direction;
  }
}

function normalizedResourceStats(values) {
  const normalized = {};

  for (const [key, value] of Object.entries(values)) {
    const numberValue = Number(value);
    normalized[key] = Number.isFinite(numberValue) ? Math.max(0, Math.round(numberValue)) : value;
  }

  return normalized;
}

function compactNumber(value) {
  if (value === undefined || value === null || value === "") return "-";
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return String(value);
  if (Math.abs(numberValue) >= 10000) return `${Math.round(numberValue / 1000)}k`;
  if (Math.abs(numberValue) >= 1000) return `${(numberValue / 1000).toFixed(1)}k`;
  return String(numberValue);
}

function statValueIsAvailable(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}

function playerLevelAtTime(statRows, timeMillis = state.timeMillis) {
  const { current, next } = snapshotWindowAtOrBefore(statRows, timeMillis);

  if (!current) return next?.levelNumber;
  return next ? next.levelNumber : current.levelNumber;
}

function playerCurrentStats(playerId) {
  const statRows = state.replayIndex.statsByPlayer.get(Number(playerId)) || [];
  const { current: stats, previous } = snapshotPairAtOrBefore(statRows);
  const economyEvents = state.replayIndex.economyByPlayer.get(Number(playerId)) || [];
  const buildStatsTime = buildSnapshotTimeAt();
  const resourceStats = playerResourceStatsAt(playerId, buildStatsTime);
  const wisps = playerWispCountAt(playerId, buildStatsTime);
  const lumberUpgrades = countAtOrBefore(economyEvents, buildStatsTime, (event) => event.type === "LUMBER_UPGRADE");
  const boardValue = playerBoardValueAt(playerId, buildStatsTime);
  const totalLeaks = stats?.leakedAmountCumulative;
  const previousLeaks = previous?.leakedAmountCumulative ?? 0;
  const totalCaught = stats?.leaksCaught;
  const previousCaught = previous?.leaksCaught ?? 0;
  const currentLeaks = totalLeaks === undefined ? undefined : Math.max(0, Number(totalLeaks) - Number(previousLeaks));
  const currentCaught = totalCaught === undefined || totalCaught === null ? undefined : Math.max(0, Number(totalCaught) - Number(previousCaught));

  return {
    level: playerLevelAtTime(statRows),
    gold: resourceStats.gold,
    lumber: resourceStats.lumber,
    wispLumberUp: `${compactNumber(wisps)}/${compactNumber(lumberUpgrades)}`,
    income: resourceStats.income,
    wisps,
    currentLeaks,
    totalLeaks,
    leaks: totalLeaks,
    value: boardValue ?? stats?.value,
    bounty: resourceStats.bounty,
    leaksCaught: stats?.leaksCaught,
    currentCaught,
    totalCaught,
    lumberUpgrades,
    builtUnits: countPlayerEventsAtOrBefore(playerId, "UNIT_BUILD", buildStatsTime),
    upgrades: countPlayerEventsAtOrBefore(playerId, "UNIT_UPGRADE", buildStatsTime),
    sends: countPlayerEventsAtOrBefore(playerId, "UNIT_SEND"),
    sells: countPlayerEventsAtOrBefore(playerId, "UNIT_SELL", buildStatsTime),
    challenges: countPlayerEventsAtOrBefore(playerId, "CHAMPION_CHALLENGED"),
  };
}

function replayIsAtEnd() {
  return state.durationMillis > 0 && state.timeMillis >= state.durationMillis;
}

function endgameWinnerTeam() {
  const teams = state.replay?.teams || [];
  const winningTeamId = state.replay?.replay?.winningTeamId;

  if (winningTeamId !== null && winningTeamId !== undefined) {
    const winner = teams.find((team) => Number(team.id) === Number(winningTeamId));
    if (winner) return winner;
  }

  return teams.find((team) => team.result === "win");
}

function endgameTeamLabel(team) {
  const teamNumber = Number(team?.id);
  return Number.isFinite(teamNumber) ? `Team ${teamNumber + 1}` : "Team";
}

function endgameResultLabel(result) {
  if (result === "win") return "Win";
  if (result === "loss") return "Loss";
  return "Unknown";
}

function finalPlayerStats(playerId) {
  const finalTime = state.durationMillis || Number.POSITIVE_INFINITY;
  const statRows = state.replayIndex.statsByPlayer.get(Number(playerId)) || [];
  const { current: stats } = snapshotPairAtOrBefore(statRows, finalTime);
  const economyEvents = state.replayIndex.economyByPlayer.get(Number(playerId)) || [];
  const resourceStats = playerResourceStatsAt(playerId, finalTime);

  return {
    level: playerLevelAtTime(statRows, finalTime),
    gold: resourceStats.gold,
    lumber: resourceStats.lumber,
    income: resourceStats.income,
    wisps: playerWispCountAt(playerId, finalTime),
    value: stats?.value,
    bounty: resourceStats.bounty,
    leaks: stats?.leakedAmountCumulative,
    leaksCaught: stats?.leaksCaught,
    lumberUpgrades: countAtOrBefore(economyEvents, finalTime, (event) => event.type === "LUMBER_UPGRADE"),
    builtUnits: countPlayerEventsAtOrBefore(playerId, "UNIT_BUILD", finalTime),
    upgrades: countPlayerEventsAtOrBefore(playerId, "UNIT_UPGRADE", finalTime),
    sends: countPlayerEventsAtOrBefore(playerId, "UNIT_SEND", finalTime),
    sells: countPlayerEventsAtOrBefore(playerId, "UNIT_SELL", finalTime),
    challenges: countPlayerEventsAtOrBefore(playerId, "CHAMPION_CHALLENGED", finalTime),
  };
}

function endgameRowsForTeam(team) {
  return (team?.players || []).map((player) => ({
    player,
    stats: finalPlayerStats(player.id),
  }));
}

function sumEndgameStat(rows, key) {
  let hasValue = false;
  let total = 0;

  for (const row of rows) {
    const value = Number(row.stats?.[key]);
    if (!Number.isFinite(value)) continue;
    hasValue = true;
    total += value;
  }

  return hasValue ? total : undefined;
}

function endgameMetaItems(match) {
  return [match?.gameMode || "Unknown mode", match?.duration || formatReplayTime(state.durationMillis), match?.mapVersion || ""].filter(Boolean);
}

function renderEndgameTeam(team) {
  const rows = endgameRowsForTeam(team);
  const teamLabel = endgameTeamLabel(team);
  const result = endgameResultLabel(team?.result);
  const totals = ENDGAME_TEAM_TOTALS.map(([key, label]) => ({
    key,
    label,
    value: sumEndgameStat(rows, key),
  }));
  const tableRows = rows.length
    ? rows
        .map(
          ({ player, stats }) => `
            <tr>
              <th scope="row">
                <span>${escapeHtml(player.name)}</span>
                ${player.elo === null || player.elo === undefined ? "" : `<small>${escapeHtml(player.elo)}</small>`}
              </th>
              ${ENDGAME_SCORE_COLUMNS.map(
                ([key]) => `<td>${escapeHtml(statValueIsAvailable(stats[key]) ? compactNumber(stats[key]) : "-")}</td>`,
              ).join("")}
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="${ENDGAME_SCORE_COLUMNS.length + 1}" class="endgame-scoreboard__empty">No players</td></tr>`;

  return `
    <section class="endgame-team" data-result="${escapeHtml(team?.result || "unknown")}">
      <header class="endgame-team__header">
        <div>
          <span>${escapeHtml(teamLabel)}</span>
          <strong>${escapeHtml(result)}</strong>
        </div>
      </header>
      <div class="endgame-team__totals">
        ${totals
          .map(
            (item) => `
              <div>
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(statValueIsAvailable(item.value) ? compactNumber(item.value) : "-")}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="endgame-scoreboard-wrap">
        <table class="endgame-scoreboard">
          <thead>
            <tr>
              <th scope="col">Player</th>
              ${ENDGAME_SCORE_COLUMNS.map(([, label]) => `<th scope="col">${escapeHtml(label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderEndgameOverlay() {
  if (!endgameOverlay || !state.replay) return;

  const winner = endgameWinnerTeam();
  const match = state.replay.replay || {};
  const winnerLabel = winner ? endgameTeamLabel(winner).toUpperCase() : "MATCH";
  const resultLabel = winner ? "VICTORY" : "COMPLETE";
  const meta = endgameMetaItems(match);
  const overlayKey = [match.id ?? "match", state.durationMillis, match.winningTeamId ?? "unknown", state.replay?.playerStats?.length ?? 0].join(":");

  if (!endgameOverlay.hidden && state.endgameOverlayKey === overlayKey) return;

  state.endgameOverlayKey = overlayKey;
  endgameOverlay.innerHTML = `
    <section class="endgame-dialog" data-result="${winner ? "win" : "unknown"}">
      <header class="endgame-dialog__header">
        <div class="endgame-dialog__title">
          <span>${escapeHtml(winnerLabel)}</span>
          <strong>${escapeHtml(resultLabel)}</strong>
        </div>
        <div class="endgame-dialog__meta">
          ${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="endgame-dialog__actions">
          <button type="button" data-endgame-restart>Replay</button>
          <button type="button" data-endgame-close aria-label="Close result">×</button>
        </div>
      </header>
      <div class="endgame-dialog__body">
        <div class="endgame-scoreboard-title">
          <span>Scoreboard</span>
        </div>
        <div class="endgame-teams">
          ${(state.replay.teams || []).map((team) => renderEndgameTeam(team)).join("")}
        </div>
      </div>
    </section>
  `;
}

function updateEndgameOverlay() {
  if (!endgameOverlay) return;

  if (!replayIsAtEnd() || !state.replay) {
    state.endgameOverlayKey = undefined;
    state.endgameDismissed = false;
    endgameOverlay.hidden = true;
    return;
  }

  if (state.endgameDismissed) {
    endgameOverlay.hidden = true;
    return;
  }

  renderEndgameOverlay();
  endgameOverlay.hidden = false;
}

function playerTimelineEvents(playerId, timeMillis = state.timeMillis) {
  const sourceEvents = state.replayIndex.eventsByPlayer.get(Number(playerId)) || [];
  const buildStatsTime = buildSnapshotTimeAt(timeMillis);
  const events = [];

  for (let index = sourceEvents.length - 1; index >= 0; index -= 1) {
    const event = sourceEvents[index];
    const eventTimeMillis = Number(event.timeMillis);
    if (eventTimeMillis > Number(timeMillis)) continue;
    if (PREP_EVENT_TYPES.has(event.type) && eventTimeMillis > buildStatsTime) continue;
    events.push(event);
  }

  return events;
}

function playerRollAtOrBefore(playerId, timeMillis = state.timeMillis) {
  return lastAtOrBefore(state.replayIndex.rollsByPlayer.get(Number(playerId)) || [], timeMillis);
}

function playerRollDisplayTimeAt(timeMillis = state.timeMillis) {
  const reviewWave = reviewWaveAtTime(timeMillis);
  if (reviewWave) return Math.max(0, Number(reviewWave.startMillis) - 1);

  const status = waveStatusAtTime(timeMillis);
  if (status.phase === "wave" && status.wave) return Math.max(0, Number(status.wave.startMillis) - 1);

  return timeMillis;
}

function rollIconFallbackLabel(unit) {
  return initials(unit?.unitName || unit?.unitType || "?");
}

function rollUnitSelectionToken(unit, playerId, playerRoll) {
  const player = playerForId(playerId);
  const unitName = unit.unitName || unit.unitType;

  return {
    id: unit.unitType,
    actionId: playerRoll?.actionId,
    name: unitName,
    kind: "Roll Unit",
    tooltip: "",
    description: unit.description || "",
    playerId,
    playerName: player?.name,
    team: Math.max(0, Number(playerId) - 1),
    iconPath: unit.iconPath,
    fallbackLabel: rollIconFallbackLabel(unit),
    stats: unit.stats || null,
    rollAtMillis: playerRoll?.timeMillis,
    currentUpgradeLevel: 1,
    currentStateTimeMillis: Number(playerRoll?.timeMillis ?? state.timeMillis),
    currentStateIsUpgrade: false,
  };
}

function sendGroupTitle(group) {
  const details = [
    group.unitType,
    group.lumberCost === null || group.lumberCost === undefined ? null : `${compactNumber(group.lumberCost)} lumber`,
    group.income === null || group.income === undefined ? null : `+${compactNumber(group.income)} income`,
    group.bounty === null || group.bounty === undefined ? null : `${compactNumber(group.bounty)} bounty`,
    group.isAura ? "Aura" : null,
  ].filter(Boolean);

  return `${group.unitName || group.unitType} x${compactNumber(group.count)}${details.length ? ` | ${details.join(" | ")}` : ""}`;
}

function sendGroupSelectionToken(group, playerId, incoming) {
  const player = playerForId(playerId);
  const unitName = group.unitName || group.unitType;

  return {
    id: group.unitType,
    name: unitName,
    kind: "Send Unit",
    tooltip: "",
    description: group.description || "",
    playerId,
    playerName: player?.name,
    team: Math.max(0, Number(playerId) - 1),
    iconPath: group.iconPath,
    fallbackLabel: initials(unitName),
    isAura: Boolean(group.isAura),
    sentAtMillis: group.firstTimeMillis,
    waveLevel: incoming?.wave?.level,
    stats: {
      ...(group.stats || {}),
      count: group.count,
      lumber: group.lumberCost,
      income: group.income,
      bounty: group.bounty,
    },
  };
}

function waveCreepTitle(creep, wave) {
  if (!creep) return "Wave creep";

  const level = Number(wave?.level ?? creep.level);
  const waveLabel = Number.isFinite(level) ? `Wave ${level}` : "Wave";
  return `${waveLabel}: ${creep.unitName || creep.unitType}`;
}

function waveCreepSelectionToken(creep, playerId, incoming) {
  const player = playerForId(playerId);
  const unitName = creep.unitName || creep.unitType;

  return {
    id: creep.unitType,
    name: unitName,
    kind: "Wave Creep",
    tooltip: "",
    description: creep.description || "",
    playerId,
    playerName: player?.name,
    team: Math.max(0, Number(playerId) - 1),
    iconPath: creep.iconPath,
    fallbackLabel: initials(unitName),
    waveLevel: incoming?.wave?.level ?? creep.level,
    stats: creep.stats || null,
  };
}

function formatSelectionStatValue(key, value, stats) {
  if (value === null || value === undefined || value === "") return "";
  if (key === "range" && stats?.rangeType) return `${formatSelectionNumber(value)} ${stats.rangeType}`;
  if (typeof value === "number") return formatSelectionNumber(value);

  const numericValue = Number(value);
  if (typeof value !== "string" && Number.isFinite(numericValue)) return formatSelectionNumber(numericValue);
  return String(value);
}

function formatSelectionNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";
  if (Math.abs(numericValue) >= 1000) return compactNumber(numericValue);
  if (Number.isInteger(numericValue)) return String(numericValue);
  return String(Math.round(numericValue * 100) / 100).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function selectionStatsHtml(stats) {
  if (!stats || typeof stats !== "object") return "";

  const rows = [
    ["count", "Count"],
    ["damage", "Damage"],
    ["cooldown", "Speed"],
    ["range", "Range"],
    ["hitPoints", "HP"],
    ["movementSpeed", "Move"],
    ["attackType", "Attack"],
    ["armorType", "Defense"],
    ["armor", "Armor"],
    ["gold", "Gold"],
    ["sell", "Sell"],
    ["lumber", "Lumber"],
    ["income", "Income"],
    ["bounty", "Bounty"],
  ]
    .map(([key, label]) => {
      const value = formatSelectionStatValue(key, stats[key], stats);
      return value ? { label, value } : null;
    })
    .filter(Boolean);

  if (!rows.length) return "";

  return `
    <div class="selection-stats">
      ${rows.map((row) => `<div><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}
    </div>
  `;
}

function outcomeContentNodes(outcome) {
  const parts = outcome?.parts?.length ? outcome.parts : outcome?.text ? [{ text: outcome.text, tone: outcome.tone }] : [];
  return parts.flatMap((part, index) => {
    const item = document.createElement("span");
    item.className = "player-corner-outcome-part";
    item.textContent = part.text;
    if (part.tone) item.dataset.tone = part.tone;

    if (index === 0) return [item];

    const separator = document.createElement("span");
    separator.className = "player-corner-outcome-separator";
    separator.textContent = "|";
    return [separator, item];
  });
}

function renderPlayerIncomingSends(card, playerId) {
  const panel = card.querySelector("[data-player-sends]");
  if (!panel) return;

  if (panel.dataset.clickGuard !== "true") {
    panel.addEventListener("click", (event) => {
      openPlayerCornerSendSelectionFromClick(event);
      event.stopPropagation();
    });
    panel.dataset.clickGuard = "true";
  }
  panel.dataset.playerId = String(playerId);

  const incoming = playerIncomingSendState(playerId);
  if (!incoming) {
    panel.hidden = true;
    panel.replaceChildren();
    delete panel.dataset.sendKey;
    return;
  }

  const visibleCreep = incoming.creep;
  const visibleGroups = incoming.groups.slice(0, PLAYER_SEND_ICON_LIMIT);
  const extraCount = incoming.groups.slice(PLAYER_SEND_ICON_LIMIT).reduce((sum, group) => sum + Number(group.count || 0), 0);
  const key = [
    state.iconMode,
    incoming.title,
    incoming.detail,
    incoming.emptyText,
    incoming.outcomeLabel,
    incoming.previousSummary,
    visibleCreep ? `${visibleCreep.unitType}:${visibleCreep.unitName}:${visibleCreep.iconPath}` : "",
    incoming.previousOutcome ? `${incoming.previousOutcome.text}:${incoming.previousOutcome.tone ?? ""}` : "",
    visibleGroups.map((group) => `${group.unitType}:${group.count}:${group.iconPath}`).join(","),
    extraCount,
  ].join("|");

  panel.hidden = false;
  if (panel.dataset.sendKey === key) return;

  panel.dataset.sendKey = key;

  const header = document.createElement("div");
  header.className = "player-corner-sends__header";

  const title = document.createElement("strong");
  title.textContent = incoming.title;

  header.append(title);

  if (incoming.detail) {
    const detail = document.createElement("span");
    detail.className = "player-corner-sends__meta";
    detail.textContent = incoming.detail;
    header.append(detail);
  }

  const iconRow = document.createElement("div");
  iconRow.className = "player-corner-sends__icons";

  if (visibleCreep) {
    const item = document.createElement("button");
    item.className = "player-corner-send-icon";
    item.type = "button";
    item.title = waveCreepTitle(visibleCreep, incoming.wave);
    item.setAttribute("aria-label", waveCreepTitle(visibleCreep, incoming.wave));
    item.dataset.unitType = visibleCreep.unitType;
    item.dataset.waveCreep = "true";
    item.dataset.playerId = String(playerId);

    const image = document.createElement("img");
    image.alt = "";
    image.src = iconPathForMode(visibleCreep.iconPath);
    image.addEventListener("load", () => {
      image.hidden = false;
      delete item.dataset.iconMissing;
    });
    image.addEventListener("error", () => {
      image.hidden = true;
      item.dataset.iconMissing = "true";
    });

    const fallback = document.createElement("span");
    fallback.className = "player-corner-send-icon__fallback";
    fallback.textContent = initials(visibleCreep.unitName || visibleCreep.unitType);

    item.append(image, fallback);
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      const token = waveCreepSelectionToken(visibleCreep, playerId, incoming);
      openSelection(token, selectedRollUnitImageUrl(token, item));
    });
    iconRow.appendChild(item);
  }

  if (visibleGroups.length) {
    for (const group of visibleGroups) {
      const item = document.createElement("button");
      item.className = "player-corner-send-icon";
      item.type = "button";
      item.title = sendGroupTitle(group);
      item.setAttribute("aria-label", sendGroupTitle(group));
      item.dataset.unitType = group.unitType;
      item.dataset.playerId = String(playerId);
      if (group.isAura) item.dataset.aura = "true";

      const image = document.createElement("img");
      image.alt = "";
      image.src = iconPathForMode(group.iconPath);
      image.addEventListener("load", () => {
        image.hidden = false;
        delete item.dataset.iconMissing;
      });
      image.addEventListener("error", () => {
        image.hidden = true;
        item.dataset.iconMissing = "true";
      });

      const fallback = document.createElement("span");
      fallback.className = "player-corner-send-icon__fallback";
      fallback.textContent = initials(group.unitName || group.unitType);

      const count = document.createElement("span");
      count.className = "player-corner-send-icon__count";
      count.textContent = `x${compactNumber(group.count)}`;

      item.append(image, fallback, count);
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        const token = sendGroupSelectionToken(group, playerId, incoming);
        openSelection(token, selectedRollUnitImageUrl(token, item));
      });
      iconRow.appendChild(item);
    }

    if (extraCount > 0) {
      const extra = document.createElement("span");
      extra.className = "player-corner-sends__extra";
      extra.textContent = `+${compactNumber(extraCount)}`;
      iconRow.appendChild(extra);
    }
  } else if (!visibleCreep) {
    const empty = document.createElement("span");
    empty.className = "player-corner-sends__empty";
    empty.textContent = incoming.emptyText || "No incoming";
    iconRow.appendChild(empty);
  }

  panel.replaceChildren(header, iconRow);

  const outcomeLabel = incoming.outcomeLabel || incoming.previousSummary;
  if (outcomeLabel) {
    const previous = document.createElement("div");
    previous.className = incoming.isReview ? "player-corner-wave-summary" : "player-corner-sends__previous";
    if (incoming.previousOutcome?.text) {
      previous.append(document.createTextNode(`${outcomeLabel}: `), ...outcomeContentNodes(incoming.previousOutcome));
    } else {
      previous.textContent = outcomeLabel;
    }
    panel.appendChild(previous);
  }

  if (!outcomeLabel && incoming.previousOutcome?.text) {
    const summary = document.createElement("div");
    summary.className = "player-corner-wave-summary";
    summary.append(...outcomeContentNodes(incoming.previousOutcome));
    panel.appendChild(summary);
  }
}

function selectedRollUnitImageUrl(token, element) {
  return element?.dataset.iconMissing === "true" ? fallbackIconDataUrl(token) : displayIconPathForToken(token);
}

function openPlayerCornerSendSelectionFromClick(event) {
  const icon = event.target?.closest?.(".player-corner-send-icon");
  const panel = icon?.closest?.("[data-player-sends]");
  if (!icon || !panel) return false;

  const card = icon.closest(".player-card[data-player-id], [data-player-id]");
  const playerId = Number(icon.dataset.playerId ?? panel.dataset.playerId ?? card?.dataset.playerId);
  if (!Number.isFinite(playerId)) return false;

  const incoming = playerIncomingSendState(playerId);
  if (!incoming) return false;

  event.stopPropagation();
  event.preventDefault();

  if (icon.dataset.waveCreep === "true") {
    if (!incoming.creep) return true;
    const token = waveCreepSelectionToken(incoming.creep, playerId, incoming);
    openSelection(token, selectedRollUnitImageUrl(token, icon));
    return true;
  }

  const unitType = icon.dataset.unitType;
  const isAura = icon.dataset.aura === "true";
  const group =
    incoming.groups.find((item) => String(item.unitType) === String(unitType) && Boolean(item.isAura) === isAura) ||
    incoming.groups.find((item) => String(item.unitType) === String(unitType));
  if (!group) return true;

  const token = sendGroupSelectionToken(group, playerId, incoming);
  openSelection(token, selectedRollUnitImageUrl(token, icon));
  return true;
}

function renderPlayerRoll(card, playerId) {
  const roll = card.querySelector("[data-player-roll]");
  if (!roll) return;

  const playerRoll = playerRollAtOrBefore(playerId, playerRollDisplayTimeAt());
  const units = playerRoll?.units || [];
  if (!units.length) {
    roll.hidden = true;
    roll.replaceChildren();
    delete roll.dataset.rollKey;
    return;
  }

  const prepBuiltUnitTypes = prepBuiltRollUnitTypesForPlayer(playerId);
  const prepBuiltKey = [...prepBuiltUnitTypes].sort().join(",");
  const key = `${playerRoll.actionId}:${state.iconMode}:${units.map((unit) => unit.unitType).join(",")}:${prepBuiltKey}`;
  roll.hidden = false;
  if (roll.dataset.rollKey === key) return;

  roll.dataset.rollKey = key;
  roll.replaceChildren(
    ...units.map((unit) => {
      const item = document.createElement("button");
      item.className = "player-corner-roll__icon";
      item.type = "button";
      item.title = unit.unitName || unit.unitType;
      item.setAttribute("aria-label", unit.unitName || unit.unitType);
      item.dataset.unitType = unit.unitType;
      if (prepBuiltUnitTypes.has(unit.unitType)) item.dataset.prepBuilt = "true";

      const image = document.createElement("img");
      image.alt = "";
      image.src = iconPathForMode(unit.iconPath);
      image.addEventListener("load", () => {
        image.hidden = false;
        delete item.dataset.iconMissing;
      });
      image.addEventListener("error", () => {
        image.hidden = true;
        item.dataset.iconMissing = "true";
      });

      const fallback = document.createElement("span");
      fallback.className = "player-corner-roll__fallback";
      fallback.textContent = rollIconFallbackLabel(unit);

      item.append(image, fallback);
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        const token = rollUnitSelectionToken(unit, playerId, playerRoll);
        openSelection(token, selectedRollUnitImageUrl(token, item));
      });
      return item;
    }),
  );
}

function eventListKey(events) {
  return events.map((event) => event.actionId).join(",");
}

function renderPlayerEventPreview(card, playerId) {
  const list = card.querySelector("[data-player-event-list]");
  const moreButton = card.querySelector("[data-player-event-more]");
  if (!list || !moreButton) return;

  const events = playerTimelineEvents(playerId);
  const preview = events.slice(0, PLAYER_EVENT_PREVIEW_LIMIT);
  const key = `${events.length}:${eventListKey(preview)}`;

  if (list.dataset.eventKey !== key) {
    list.dataset.eventKey = key;
    list.replaceChildren(
      ...(preview.length
        ? preview.map((event) => {
            const row = document.createElement("div");
            row.className = "player-events__row";
            row.dataset.eventType = event.type;

            const time = document.createElement("span");
            time.className = "player-events__time";
            time.textContent = formatReplayEventTime(event.timeMillis);

            const title = document.createElement("strong");
            title.textContent = event.title;

            row.append(time, title);
            return row;
          })
        : [emptyPlayerEventRow()]),
    );
  }

  moreButton.hidden = events.length <= PLAYER_EVENT_PREVIEW_LIMIT;
  moreButton.textContent = `Show more (${events.length})`;
}

function emptyPlayerEventRow() {
  const row = document.createElement("div");
  row.className = "player-events__empty";
  row.textContent = "No events yet";
  return row;
}

function kingSpellLabel(value) {
  if (!value) return "-";
  return KING_SPELL_LABELS[value] || String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function kingCurrentState(teamId, timeMillis = state.timeMillis) {
  const kingState = {
    hpPercent: DEFAULT_KING_HEALTH_PERCENT,
    lives: DEFAULT_KING_LIVES,
    heroStats: {
      attack: 0,
      hp: 0,
      reg: 0,
      spell: "-",
    },
  };
  const upgrades = state.replayIndex.kingUpgradesByTeam.get(Number(teamId)) || [];

  for (const upgrade of upgrades) {
    if (Number(upgrade.timeMillis) > timeMillis) break;
    const key = KING_UPGRADE_KEYS[upgrade.upgradeType];
    if (key) kingState.heroStats[key] = Number(upgrade.level);
  }

  const spellUnlockTime = state.replay?.replay?.kingSpellUnlockedAtMillis;
  if (spellUnlockTime !== null && spellUnlockTime !== undefined && Number(spellUnlockTime) <= timeMillis) {
    kingState.heroStats.spell = kingSpellLabel(state.replay?.replay?.kingSpell);
  }

  return kingState;
}

function updateTeamOverlayStats() {
  if (!teamOverlay && !playerCornerOverlay) return;

  for (const card of document.querySelectorAll(".player-card[data-player-id]")) {
    const playerId = Number(card.dataset.playerId);
    const stats = playerCurrentStats(playerId);
    const titleParts = PLAYER_CORNER_STATS
      .filter(([key]) => statValueIsAvailable(stats[key]))
      .map(([key, label]) => `${label} ${compactNumber(stats[key])}`);
    card.title = titleParts.join(" | ");

    for (const [key] of PLAYER_CORNER_STATS) {
      const row = card.querySelector(`[data-stat-row="${key}"]`);
      const value = card.querySelector(`[data-stat="${key}"]`);
      const available = statValueIsAvailable(stats[key]);
      if (row) row.hidden = !available;
      if (value) value.textContent = available ? compactNumber(stats[key]) : "-";
    }

    renderPlayerIncomingSends(card, playerId);
    renderPlayerRoll(card, playerId);
    renderPlayerEventPreview(card, playerId);
    if (card.classList.contains("player-corner-card")) updatePlayerCornerCardFit(card);
  }

  updatePlayerEventsPopover();
}

function playerCardForId(playerId) {
  return document.querySelector(`.player-card[data-player-id="${Number(playerId)}"]`);
}

function openPlayerEventsPopover(playerId, anchor) {
  if (!playerEventsPopover) return;
  state.playerEventsAnchor = anchor || playerCardForId(playerId);
  playerEventsPopover.dataset.playerId = String(playerId);
  playerEventsPopover.hidden = false;
  renderPlayerEventsPopover(playerId);
  positionPlayerEventsPopover(state.playerEventsAnchor);
}

function closePlayerEventsPopover() {
  if (!playerEventsPopover) return;
  playerEventsPopover.hidden = true;
  delete playerEventsPopover.dataset.playerId;
  state.playerEventsAnchor = undefined;
}

function updatePlayerEventsPopover() {
  if (!playerEventsPopover || playerEventsPopover.hidden || !playerEventsPopover.dataset.playerId) return;
  const playerId = Number(playerEventsPopover.dataset.playerId);
  renderPlayerEventsPopover(playerId);
  positionPlayerEventsPopover(state.playerEventsAnchor || playerCardForId(playerId));
}

function renderPlayerEventsPopover(playerId) {
  if (!playerEventsPopover) return;
  const normalizedPlayerId = Number(playerId);
  const player = playerForId(normalizedPlayerId);
  const events = playerTimelineEvents(playerId);
  const eventKey = `${normalizedPlayerId}:${events.length}:${eventListKey(events)}`;
  const renderedPlayerId = playerEventsPopover.dataset.renderedPlayerId;
  const playerChanged = renderedPlayerId !== String(normalizedPlayerId);
  let list = playerEventsPopover.querySelector(".player-events-popover__list");
  const previousScrollTop = !playerChanged && list ? list.scrollTop : 0;
  const wasAtBottom = Boolean(
    !playerChanged && list && list.scrollTop + list.clientHeight >= list.scrollHeight - 4,
  );

  if (playerChanged || !list) {
    const header = document.createElement("header");
    header.className = "player-events-popover__header";

    const title = document.createElement("div");
    title.className = "player-events-popover__title";

    const name = document.createElement("strong");
    name.dataset.playerEventsName = "true";
    const time = document.createElement("span");
    time.dataset.playerEventsTime = "true";
    title.append(name, time);

    const close = document.createElement("button");
    close.className = "player-events-popover__close";
    close.type = "button";
    close.dataset.playerEventsClose = "true";
    close.textContent = "X";
    close.setAttribute("aria-label", "Close player event history");
    close.addEventListener("click", closePlayerEventsPopover);

    header.append(title, close);

    list = document.createElement("div");
    list.className = "player-events-popover__list";
    playerEventsPopover.replaceChildren(header, list);
    playerEventsPopover.dataset.renderedPlayerId = String(normalizedPlayerId);
    delete playerEventsPopover.dataset.eventKey;
  }

  const name = playerEventsPopover.querySelector("[data-player-events-name]");
  const time = playerEventsPopover.querySelector("[data-player-events-time]");
  if (name) name.textContent = player?.name || `P${normalizedPlayerId}`;
  if (time) time.textContent = `until ${formatReplayEventTime(state.timeMillis)}`;

  if (playerEventsPopover.dataset.eventKey === eventKey) return;

  list.replaceChildren();
  if (!events.length) {
    const empty = document.createElement("p");
    empty.className = "player-events-popover__empty";
    empty.textContent = "No recorded events at this replay time.";
    list.appendChild(empty);
  } else {
    for (const event of events) {
      const row = document.createElement("article");
      row.className = "player-events-popover__event";
      row.dataset.eventType = event.type;

      const eventTime = document.createElement("time");
      eventTime.textContent = formatReplayEventTime(event.timeMillis);

      const body = document.createElement("div");
      body.className = "player-events-popover__event-body";

      const eventTitle = document.createElement("strong");
      eventTitle.textContent = event.title;
      body.appendChild(eventTitle);

      row.append(eventTime, body);
      list.appendChild(row);
    }
  }

  playerEventsPopover.dataset.eventKey = eventKey;
  if (wasAtBottom) {
    list.scrollTop = list.scrollHeight;
  } else if (previousScrollTop > 0) {
    list.scrollTop = Math.min(previousScrollTop, list.scrollHeight);
  }
}

function positionPlayerEventsPopover(anchor) {
  if (!playerEventsPopover || playerEventsPopover.hidden || !anchor) return;
  const boardRect = board.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const popoverRect = playerEventsPopover.getBoundingClientRect();
  let left = anchorRect.right - boardRect.left + 8;
  if (left + popoverRect.width > boardRect.width - 8) {
    left = anchorRect.left - boardRect.left - popoverRect.width - 8;
  }
  const maxLeft = Math.max(8, boardRect.width - popoverRect.width - 8);
  const maxTop = Math.max(8, boardRect.height - popoverRect.height - 8);

  playerEventsPopover.style.left = `${clamp(left, 8, maxLeft)}px`;
  playerEventsPopover.style.top = `${clamp(anchorRect.top - boardRect.top, 8, maxTop)}px`;
}

function updateKingTokens() {
  for (const token of state.tokens) {
    if (!token.isKing || !token.element) continue;
    const kingState = kingCurrentState(token.teamId);
    token.hpPercent = kingState.hpPercent;
    token.lives = kingState.lives;
    token.heroStats = kingState.heroStats;

    const attack = token.element.querySelector('[data-king-stat="attack"]');
    const hp = token.element.querySelector('[data-king-stat="hp"]');
    const reg = token.element.querySelector('[data-king-stat="reg"]');
    const spell = token.element.querySelector('[data-king-stat="spell"]');
    const hpPercent = token.element.querySelector('[data-king-live-stat="hp"]');
    const lives = token.element.querySelector('[data-king-live-stat="lives"]');

    if (attack) attack.textContent = String(kingState.heroStats.attack);
    if (hp) hp.textContent = String(kingState.heroStats.hp);
    if (reg) reg.textContent = String(kingState.heroStats.reg);
    if (spell) spell.textContent = String(kingState.heroStats.spell);
    if (hpPercent) hpPercent.textContent = "-";
    if (lives) lives.textContent = "-";
  }
}

function initials(value) {
  const parts = String(value || "")
    .replace(/[^a-z0-9 ]/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function iconPathForMode(iconPath, mode = state.iconMode) {
  if (!iconPath || typeof iconPath !== "string") return iconPath;

  const iconDir = ICON_MODE_DIRS[validIconMode(mode)];
  return iconPath.replace(/\/assets\/command-buttons(?:-classic|-reforged)?\//, `/assets/${iconDir}/`);
}

function displayIconPathForToken(token) {
  if (token.isKing) return token.iconPath;
  return iconPathForMode(token.iconPath);
}

function selectedTokenImageUrl(token) {
  if (token.element?.dataset.iconMissing === "true") return fallbackIconDataUrl(token);
  return displayIconPathForToken(token);
}

function updateIconModeButtons() {
  for (const button of iconModeButtons) {
    button.setAttribute("aria-pressed", button.dataset.iconMode === state.iconMode ? "true" : "false");
  }
}

function setTokenImageSource(token) {
  if (!token.imageElement || !token.element) return;

  const imageUrl = displayIconPathForToken(token);
  delete token.element.dataset.iconMissing;
  token.element.querySelector(".unit-token__fallback")?.remove();
  token.imageElement.hidden = false;

  if (token.imageElement.src !== new URL(imageUrl, window.location.href).href) {
    token.imageElement.src = imageUrl;
  }
}

function refreshIconMode() {
  updateIconModeButtons();

  for (const token of state.tokens) {
    setTokenImageSource(token);
  }

  for (const card of document.querySelectorAll(".player-card[data-player-id]")) {
    const playerId = Number(card.dataset.playerId);
    renderPlayerIncomingSends(card, playerId);
    renderPlayerRoll(card, playerId);
    if (card.classList.contains("player-corner-card")) updatePlayerCornerCardFit(card);
  }

  if (state.selectedToken && !selectionCard.hidden) {
    updateUnitTokenForTime(state.selectedToken);
    openSelection(state.selectedToken, selectedTokenImageUrl(state.selectedToken));
  }
}

function setIconMode(mode) {
  const nextMode = validIconMode(mode);
  if (state.iconMode === nextMode) {
    updateIconModeButtons();
    return;
  }

  state.iconMode = nextMode;
  try {
    window.localStorage.setItem(ICON_MODE_STORAGE_KEY, nextMode);
  } catch {
    // The toggle still works when storage is unavailable.
  }
  refreshIconMode();
}

function fallbackIconDataUrl(token) {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  const color = TEAM_COLORS[token.team % TEAM_COLORS.length] || "#d5af47";

  ctx.fillStyle = "#10140e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.fillRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
  ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.fillStyle = "#fff4c1";
  ctx.font = "700 28px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(token.fallbackLabel || initials(token.name), canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

function unitStateForToken(token, timeMillis = state.timeMillis) {
  const changes = token.unitStates || [];
  let current = changes[0];

  for (const change of changes) {
    if (Number(change.timeMillis) > timeMillis) break;
    current = change;
  }

  return current || token;
}

function tokenBuildDisplayTime(timeMillis = state.timeMillis) {
  return buildSnapshotTimeAt(timeMillis);
}

function unitStateForTokenDisplay(token, timeMillis = state.timeMillis) {
  return unitStateForToken(token, tokenBuildDisplayTime(timeMillis));
}

function updateUnitTokenForTime(token, timeMillis = state.timeMillis) {
  if (token.isKing || !token.element) return;
  const current = unitStateForTokenDisplay(token, timeMillis);
  if (!current || token.currentStateActionId === current.actionId) return;

  token.currentStateActionId = current.actionId;
  token.currentUpgradeLevel = Number(current.level ?? 1);
  token.currentStateTimeMillis = Number(current.timeMillis ?? token.builtAtMillis ?? 0);
  token.currentStateIsUpgrade = token.currentUpgradeLevel > 1;
  token.id = current.unitType;
  token.name = current.unitName || current.unitType;
  token.baseId = current.upgradeGroup;
  token.iconPath = current.iconPath;
  token.fallbackLabel = initials(token.name);
  token.description = current.description || "";
  token.stats = {
    ...(current.stats || {}),
    gold: current.goldCost ?? current.totalGoldCost,
    sell: current.sellGold,
  };

  token.element.dataset.objectId = token.id;
  token.element.title = token.name;
  token.element.setAttribute("aria-label", token.name);

  const fallback = token.element.querySelector(".unit-token__fallback");
  fallback?.remove();
  delete token.element.dataset.iconMissing;

  if (token.imageElement && !token.imageElement.isConnected) token.element.prepend(token.imageElement);
  setTokenImageSource(token);
}

function makeTokenData() {
  const tokens = [];

  for (const event of state.replay?.buildUnits ?? []) {
    const placement = buildTokenPlacement(event);
    const player = playerForId(event.playerId);
    const builtAt = formatReplayTime(event.timeMillis);
    const unitStates = buildStateChangesForEvent(event);
    const initialState = unitStates[0];
    const initialUnitName = initialState.unitName || initialState.unitType;
    const initialGoldCost = formatGoldCost(initialState.goldCost);
    const initialTooltip = `${player ? `${player.name} built` : "Built"} ${initialUnitName}${initialGoldCost ? ` for ${initialGoldCost}` : ""}`;

    tokens.push({
      id: initialState.unitType,
      actionId: event.actionId,
      name: initialUnitName,
      baseId: initialState.upgradeGroup,
      currentUpgradeLevel: Number(initialState.level ?? 1),
      currentStateTimeMillis: Number(initialState.timeMillis ?? event.timeMillis),
      currentStateIsUpgrade: Number(initialState.level ?? 1) > 1,
      kind: "Build Unit",
      tooltip: initialTooltip,
      description: initialState.description || "",
      builtAt,
      builtAtMillis: event.timeMillis,
      removedAtMillis: event.removedAtMillis,
      playerId: event.playerId,
      playerName: player?.name,
      cellX: placement.cellX,
      cellY: placement.cellY,
      centerCellX: placement.centerCellX,
      centerCellY: placement.centerCellY,
      span: BUILD_TOKEN_SPAN,
      team: Math.max(0, event.playerId - 1),
      iconPath: initialState.iconPath,
      fallbackLabel: initials(initialUnitName),
      unitStates,
      stats: {
        ...(initialState.stats || {}),
        gold: initialState.goldCost ?? initialState.totalGoldCost,
        sell: initialState.sellGold,
      },
    });
  }

  for (const platform of KING_PLATFORMS) {
    const kingState = kingCurrentState(platform.teamId);
    tokens.push({
      id: platform.id,
      name: "Uther",
      baseId: "king",
      kind: "King",
      tooltip: `${platform.teamId === 0 ? "Team 1" : "Team 2"} King`,
      description: "Replay king marker with upgrade levels from recorded king upgrade actions.",
      cellX: (platform.tokenX ?? (platform.x0 + platform.x1 + 1) / 2) - KING_TOKEN_SPAN / 2,
      cellY: (platform.tokenY ?? (platform.y0 + platform.y1 + 1) / 2) - KING_TOKEN_SPAN / 2,
      span: KING_TOKEN_SPAN,
      team: platform.team,
      teamId: platform.teamId,
      hpPercent: kingState.hpPercent,
      lives: kingState.lives,
      side: platform.id.includes("east") ? "east" : "west",
      heroStats: kingState.heroStats,
      iconPath: UTHER_ICON_PATH,
      isKing: true,
    });
  }

  return tokens;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatGoldCost(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";
  return `${compactNumber(numericValue)} gold`;
}

function selectionMetaForToken(token, details) {
  if (token.isKing) return "";

  if (token.kind === "Roll Unit") {
    const rolledAt = Number(token.rollAtMillis);
    const timeLabel = Number.isFinite(rolledAt) ? ` at ${formatReplayCompactTime(rolledAt)}` : "";
    return `Rolled${timeLabel}${token.playerName ? ` for ${token.playerName}` : ""}`;
  }

  if (token.kind === "Send Unit") {
    const sentAt = Number(token.sentAtMillis);
    const timeLabel = Number.isFinite(sentAt) ? ` at ${formatReplayCompactTime(sentAt)}` : "";
    const waveLabel = token.waveLevel ? ` for Wave ${token.waveLevel}` : "";
    const count = Number(token.stats?.count ?? token.count);
    const countLabel = Number.isFinite(count) && count > 1 ? ` x${compactNumber(count)}` : "";
    const auraLabel = token.isAura ? " | Aura" : "";
    return `${token.name || "Send"}${countLabel}${waveLabel}${timeLabel}${auraLabel}`;
  }

  if (token.kind === "Wave Creep") {
    const waveLabel = token.waveLevel ? `Wave ${token.waveLevel}` : "Wave";
    return `${waveLabel} base creep`;
  }

  const currentLevel = Number(token.currentUpgradeLevel ?? details?.currentUpgradeLevel ?? 1);
  const currentTime = Number(token.currentStateTimeMillis ?? details?.currentStateTimeMillis ?? token.builtAtMillis ?? 0);
  const currentState = unitStateForTokenDisplay(token);
  const currentGoldCost = formatGoldCost(currentState?.goldCost);

  if (currentLevel > 1) {
    return `${token.playerName || "Player"} upgraded unit to level ${currentLevel} at ${formatReplayCompactTime(currentTime)}${currentGoldCost ? ` for ${currentGoldCost}` : ""}`;
  }

  const builtWave = details?.builtWave ?? token.builtWave ?? details?.builtLevel ?? token.builtLevel;
  const builtAt = details?.builtAt ?? token.builtAt;
  const builtUnitName = currentState?.unitName || token.name || details?.name || "unit";
  const playerName = token.playerName || "Player";

  if (Number.isFinite(currentTime)) {
    return `${playerName} built ${builtUnitName} at ${formatReplayCompactTime(currentTime)}${currentGoldCost ? ` for ${currentGoldCost}` : ""}`;
  }

  if (builtAt) {
    return `${playerName} built ${builtUnitName}${currentGoldCost ? ` for ${currentGoldCost}` : ""}`;
  }

  if (builtWave) {
    return `Built for wave ${builtWave}`;
  }

  return "";
}

function selectionUpgradeTrailForToken(token) {
  if (token.isKing) return "";

  const currentLevel = Number(token.currentUpgradeLevel ?? 1);
  const unitStates = Array.isArray(token.unitStates) ? token.unitStates : [];
  if (currentLevel < 2 || unitStates.length < 2) return "";

  const visibleStates = unitStates
    .filter((unitState) => Number(unitState.timeMillis ?? 0) <= tokenBuildDisplayTime())
    .sort((a, b) => Number(a.timeMillis ?? 0) - Number(b.timeMillis ?? 0) || Number(a.level ?? 0) - Number(b.level ?? 0));

  if (visibleStates.length < 2) return "";

  const nodes = visibleStates.map((unitState, index) => {
    const level = Number(unitState.level ?? index + 1);
    const unitName = unitState.unitName || unitState.unitType || `Level ${level}`;
    const iconPath = iconPathForMode(unitState.iconPath || token.iconPath);
    const timeMillis = Number(unitState.timeMillis ?? 0);
    const metaParts = [`Lv ${level}`, formatReplayCompactTime(timeMillis)];

    return `
      <div class="selection-upgrade-step">
        <img alt="" src="${escapeHtml(iconPath)}" />
        <strong>${escapeHtml(unitName)}</strong>
        <span>${escapeHtml(metaParts.join(" · "))}</span>
      </div>
    `;
  });

  return `
    <div class="selection-upgrade-chain" aria-label="Unit upgrade path">
      ${nodes.map((node, index) => (index === 0 ? node : `<span class="selection-upgrade-arrow" aria-hidden="true">&rarr;</span>${node}`)).join("")}
    </div>
  `;
}

function openSelection(token, imageUrl) {
  state.selectedToken = token;
  const details = { ...token, ...(mapData.unitDetails?.[token.id] || {}) };
  const name = details?.name || token.name;
  const tooltip =
    token.currentStateIsUpgrade || token.kind === "Build Unit"
      ? ""
      : details?.tooltip && details.tooltip !== `Deploy ${name}`
        ? details.tooltip
        : "";
  const builtFor = selectionMetaForToken(token, details);
  const upgradeTrail = selectionUpgradeTrailForToken(token);
  const description = details?.description || "";
  const statsHtml = selectionStatsHtml(details?.stats || token.stats);
  selectionCard.hidden = false;
  selectionCard.innerHTML = `
    <header class="selection-head">
      <img alt="" src="${imageUrl}" />
      <div>
        <h2>${escapeHtml(name)}</h2>
        ${builtFor ? `<p class="selection-meta">${escapeHtml(builtFor)}</p>` : ""}
        ${upgradeTrail}
        ${tooltip ? `<p>${escapeHtml(tooltip)}</p>` : ""}
      </div>
    </header>
    ${statsHtml}
    ${description ? `<p class="selection-description">${escapeHtml(description).replace(/\n/g, "<br />")}</p>` : ""}
  `;
}

async function createTokens() {
  state.tokens = makeTokenData();
  unitLayer.replaceChildren();

  await Promise.all(
    state.tokens.map(async (token) => {
      const button = document.createElement("button");
      button.className = "unit-token";
      if (token.isKing) button.classList.add("unit-token--king", `unit-token--king-${token.side}`);
      button.type = "button";
      button.title = token.name;
      button.dataset.cellX = String(token.cellX);
      button.dataset.cellY = String(token.cellY);
      if (!token.isKing) {
        button.dataset.playerId = String(token.playerId);
        button.dataset.centerCellX = String(token.centerCellX);
        button.dataset.centerCellY = String(token.centerCellY);
        if (DEBUG_GRID_LABELS) {
          button.dataset.debugLabel = formatDebugGridLabel(token.centerCellX, token.centerCellY);
        }
        button.dataset.removedAtMillis = token.removedAtMillis === null || token.removedAtMillis === undefined ? "" : String(token.removedAtMillis);
      }
      button.dataset.objectId = token.id;
      button.setAttribute("aria-label", token.name);
      button.style.setProperty("--token-color", TEAM_COLORS[token.team % TEAM_COLORS.length]);

      const imageUrl = displayIconPathForToken(token);
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "";
      token.imageElement = image;
      image.addEventListener("load", () => {
        image.hidden = false;
        delete button.dataset.iconMissing;
        button.querySelector(".unit-token__fallback")?.remove();
      });
      image.addEventListener("error", () => {
        image.hidden = true;
        button.dataset.iconMissing = "true";
        if (!button.querySelector(".unit-token__fallback")) {
          const fallback = document.createElement("span");
          fallback.className = "unit-token__fallback";
          fallback.textContent = token.fallbackLabel || token.name.slice(0, 1);
          button.prepend(fallback);
        }
      });
      if (token.isKing) {
        const hud = document.createElement("div");
        hud.className = "king-hud";
        hud.setAttribute("aria-hidden", "true");

        const portrait = document.createElement("div");
        portrait.className = "king-hud__portrait";
        portrait.appendChild(image);

        const summary = document.createElement("div");
        summary.className = "king-summary";
        summary.innerHTML = `
          <div><span>HP:</span> <strong data-king-live-stat="hp">-</strong></div>
          <div><span>Lives:</span> <strong data-king-live-stat="lives">-</strong></div>
          <div><span>Attack:</span> <strong data-king-stat="attack">${escapeHtml(token.heroStats.attack)}</strong></div>
          <div><span>HP:</span> <strong data-king-stat="hp">${escapeHtml(token.heroStats.hp)}</strong></div>
          <div><span>Reg:</span> <strong data-king-stat="reg">${escapeHtml(token.heroStats.reg)}</strong></div>
          <div><span>Spell:</span> <strong data-king-stat="spell">${escapeHtml(token.heroStats.spell)}</strong></div>
        `;
        hud.append(portrait, summary);
        button.appendChild(hud);
      } else {
        button.appendChild(image);
      }

      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (token.isKing) {
          selectionCard.hidden = true;
          state.selectedToken = undefined;
          return;
        }
        updateUnitTokenForTime(token);
        openSelection(token, selectedTokenImageUrl(token));
      });
      token.element = button;
      unitLayer.appendChild(button);
    }),
  );
  updateKingTokens();
  positionTokens();
}

function isTokenActiveAtTime(token, timeMillis = state.timeMillis) {
  const activeTimeMillis = token.isKing ? timeMillis : tokenBuildDisplayTime(timeMillis);
  return (
    token.isKing ||
    ((token.builtAtMillis ?? 0) <= activeTimeMillis &&
      (token.removedAtMillis === null || token.removedAtMillis === undefined || activeTimeMillis < Number(token.removedAtMillis)))
  );
}

function positionTokens() {
  const rect = board.getBoundingClientRect();
  const current = frame();
  const cellSize = rect.width / current.width;
  const prepWindow = prepWindowAtTime();
  for (const token of state.tokens) {
    if (!token.element) continue;
    if (!token.isKing) updateUnitTokenForTime(token);
    const tokenX = mapXToRenderX(token.cellX);
    const visible =
      tokenX + (token.span || 1) > current.x &&
      tokenX < current.x + current.width &&
      token.cellY + (token.span || 1) > current.y &&
      token.cellY < current.y + current.height &&
      isTokenActiveAtTime(token);
    token.element.dataset.hidden = visible ? "false" : "true";
    token.element.dataset.prepChanged = visible && tokenChangedInPrep(token, prepWindow) ? "true" : "false";
    if (!visible) continue;
    const size = Math.max(10, Math.round(cellSize * (token.span || 1)));
    const left = Math.round((tokenX - current.x) * cellSize);
    const top = Math.round((token.cellY - current.y) * cellSize);
    token.element.style.width = `${size}px`;
    token.element.style.height = `${size}px`;
    token.element.style.left = `${left}px`;
    token.element.style.top = `${top}px`;
    token.element.style.zIndex = String(Math.round(token.cellY * 10 + (token.isKing ? 40 : 0)));
  }
}

function kingHudOuterHeight(token) {
  const hud = token?.element?.querySelector(".king-hud");
  return hud ? hud.offsetHeight : 0;
}

function teamKingSize(cellSize, span) {
  return Math.round(clamp(cellSize * (span || KING_TOKEN_SPAN), TEAM_KING_MIN_SIZE_PX, TEAM_KING_MAX_SIZE_PX));
}

function ensureTeamContentFrame(index) {
  const side = index === 0 ? "one" : "two";
  let frame = teamOverlay.querySelector(`.team-overlay__team-frame--${side}`);
  if (!frame) {
    frame = document.createElement("div");
    frame.className = `team-overlay__team-frame team-overlay__team-frame--${side}`;
    frame.setAttribute("aria-hidden", "true");
    teamOverlay.prepend(frame);
  }
  return frame;
}

function positionTeamOverlayKing(teamIndex, kingTop, kingSize, metrics) {
  const token = state.tokens.find((candidate) => candidate.isKing && Number(candidate.teamId) === teamIndex);
  if (!token?.element) return;

  const visible = metrics.visible && isTokenActiveAtTime(token);
  token.element.dataset.hidden = visible ? "false" : "true";
  if (!visible) return;

  const scale = metrics.scale || 1;
  const size = (kingSize || teamKingSize(metrics.cellSize, token.span)) * scale;
  const left = Math.round(metrics.screenX - size / 2);
  const top = Math.round(metrics.screenTop + kingTop * scale);

  token.element.style.width = `${size}px`;
  token.element.style.height = `${size}px`;
  token.element.style.left = `${left}px`;
  token.element.style.top = `${top}px`;
  token.element.style.zIndex = String(600 + teamIndex);
  token.element.style.setProperty("--king-hud-scale", String(scale));
  token.element.style.setProperty("--king-hud-gap", `${TEAM_KING_HUD_GAP_PX}px`);
  token.element.style.setProperty("--king-portrait-size", `${kingSize || teamKingSize(metrics.cellSize, token.span)}px`);
}

function positionTeamOverlay() {
  const centerBand = CENTER_BAND;
  if (!centerBand || !teamOverlay) return;

  const rect = board.getBoundingClientRect();
  const current = frame();
  const cellSize = rect.width / current.width;
  const laneLeftX = mapXToRenderX(centerBand.x0);
  const laneRightX = mapXToRenderX(centerBand.x1 + 1);
  const laneCenterX = (laneLeftX + laneRightX) / 2;
  const laneTopY = Math.max(centerBand.y0, RENDER_BOUNDS.y);
  const laneBottomY = Math.min(centerBand.y1 + 1, RENDER_BOUNDS.y + RENDER_BOUNDS.height);
  const laneLeft = (laneLeftX - current.x) * cellSize;
  const laneRight = (laneRightX - current.x) * cellSize;
  const screenX = (laneCenterX - current.x) * cellSize;
  const screenTop = (laneTopY - current.y) * cellSize;
  const screenBottom = (laneBottomY - current.y) * cellSize;
  const visibleTop = clamp(screenTop, 0, rect.height);
  const visibleBottom = clamp(screenBottom, 0, rect.height);
  const overlayHeight = Math.max(0, visibleBottom - visibleTop);
  const laneWidth = laneRight - laneLeft;
  const visible =
    laneRight > 0 &&
    laneLeft < rect.width &&
    visibleBottom > 0 &&
    visibleTop < rect.height &&
    overlayHeight > 1 &&
    laneWidth > 28;

  teamOverlay.dataset.hidden = visible ? "false" : "true";
  if (!visible) return;

  const maxOverlayWidth = Math.min(282, Math.max(180, rect.width - 24));
  const minOverlayWidth = Math.min(222, maxOverlayWidth);
  const overlayWidth = clamp(laneWidth + 78, minOverlayWidth, maxOverlayWidth);
  const widthScale = clamp((laneWidth - TEAM_CENTER_COLUMN_MARGIN_PX * 2) / overlayWidth, 0.25, 1);
  teamOverlay.style.left = `${screenX}px`;
  teamOverlay.style.top = `${visibleTop}px`;
  teamOverlay.style.width = `${overlayWidth}px`;
  teamOverlay.style.height = `${overlayHeight}px`;

  const sections = [...teamOverlay.querySelectorAll(".team-overlay__side")].slice(0, 2);
  const frames = sections.map((_, index) => ensureTeamContentFrame(index));
  const kingSizes = sections.map((_, index) => {
    const token = state.tokens.find((candidate) => candidate.isKing && Number(candidate.teamId) === index);
    if (token?.element) token.element.dataset.hidden = "false";
    const kingSize = token ? teamKingSize(cellSize, token.span) : 0;
    if (token?.element) token.element.style.setProperty("--king-portrait-size", `${kingSize}px`);
    return kingSize;
  });
  const blockHeights = sections.map((section, index) => {
    const token = state.tokens.find((candidate) => candidate.isKing && Number(candidate.teamId) === index);
    const kingHeight = kingSizes[index] ? TEAM_KING_ROSTER_GAP_PX + kingHudOuterHeight(token) : 0;
    return section.offsetHeight + kingHeight + TEAM_CONTENT_FRAME_PADDING_PX * 2;
  });
  const sendPanels = sections.map((_, index) => ensureTeamSendsPanel(index));
  const sendPanelHeights = sendPanels.map((panel) => (panel && !panel.hidden ? panel.offsetHeight : 0));
  const topSendSlotHeight = sendPanelHeights[0] ? sendPanelHeights[0] + TEAM_SEND_PANEL_GAP_PX : 0;
  const bottomSendSlotHeight = sendPanelHeights[1] ? sendPanelHeights[1] + TEAM_SEND_PANEL_GAP_PX : 0;
  const groupGap = sections.length > 1 ? TEAM_CENTER_GROUP_GAP_PX : 0;
  const groupHeight = blockHeights.reduce((sum, height) => sum + height, 0) + groupGap;
  const stackHeight = groupHeight + topSendSlotHeight + bottomSendSlotHeight;
  const verticalScale = stackHeight > 0 ? clamp((overlayHeight - TEAM_CENTER_VERTICAL_PADDING_PX * 2) / stackHeight, 0.44, 1) : 1;
  const contentScale = Math.min(widthScale, verticalScale);
  const scaledStackHeight = stackHeight * contentScale;
  const scaledPadding = TEAM_CENTER_VERTICAL_PADDING_PX * contentScale;
  const hasPaddingRoom = overlayHeight >= scaledStackHeight + scaledPadding * 2;
  const stackStart = (overlayHeight - scaledStackHeight) / 2 / contentScale;
  const stackTop = hasPaddingRoom
    ? clamp(stackStart, TEAM_CENTER_VERTICAL_PADDING_PX, (overlayHeight - scaledStackHeight - scaledPadding) / contentScale)
    : Math.max(0, stackStart);
  let cursor = stackTop + topSendSlotHeight;
  const metrics = { visible, cellSize, scale: contentScale, screenX, screenTop: visibleTop };
  teamOverlay.style.setProperty("--team-content-scale", String(contentScale));

  for (const [index, section] of sections.entries()) {
    const frame = frames[index];
    if (frame) {
      frame.style.top = `${Math.round(cursor * contentScale)}px`;
      frame.style.height = `${Math.round(blockHeights[index])}px`;
    }

    const contentTop = cursor + TEAM_CONTENT_FRAME_PADDING_PX;
    section.style.top = `${Math.round(contentTop * contentScale)}px`;
    positionTeamOverlayKing(index, contentTop + section.offsetHeight + TEAM_KING_ROSTER_GAP_PX, kingSizes[index], metrics);

    const sendsPanel = sendPanels[index];
    if (sendsPanel && !sendsPanel.hidden) {
      const panelTop = index === 0 ? cursor - sendPanelHeights[index] - TEAM_SEND_PANEL_GAP_PX : cursor + blockHeights[index] + TEAM_SEND_PANEL_GAP_PX;
      sendsPanel.style.top = `${Math.round(panelTop * contentScale)}px`;
    }

    cursor += blockHeights[index] + (index === 0 && sections.length > 1 ? TEAM_CENTER_GROUP_GAP_PX : 0);
  }
}

function isPlayerCornerPanelCell(x, y) {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  return !isLaneCell(cellX, cellY) && !isBuildCell(cellX, cellY) && !isSidePocketBuildCell(cellX, cellY);
}

function playerCornerPanelCoverage(x0, y0, widthCells, heightCells) {
  const left = clamp(Math.floor(x0), PLAY_BOUNDS.x, PLAY_BOUNDS.x + PLAY_BOUNDS.width - 1);
  const right = clamp(Math.floor(x0 + widthCells - 0.001), PLAY_BOUNDS.x, PLAY_BOUNDS.x + PLAY_BOUNDS.width - 1);
  const top = clamp(Math.floor(y0), PLAY_BOUNDS.y, PLAY_BOUNDS.y + PLAY_BOUNDS.height - 1);
  const bottom = clamp(Math.floor(y0 + heightCells - 0.001), PLAY_BOUNDS.y, PLAY_BOUNDS.y + PLAY_BOUNDS.height - 1);
  let total = 0;
  let panelCells = 0;

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      total += 1;
      if (isPlayerCornerPanelCell(x, y)) panelCells += 1;
    }
  }

  return total ? panelCells / total : 0;
}

function isStableGreyPanelArea(x, y, widthCells, heightCells, alignX) {
  const panelCoverage = playerCornerPanelCoverage(x, y, widthCells, heightCells);
  const edgeX = alignX === "left" ? x : x + widthCells - 1;
  const edgeCoverage = playerCornerPanelCoverage(edgeX, y, 1, heightCells);
  return panelCoverage >= PLAYER_CORNER_CARD_GREY_THRESHOLD && edgeCoverage >= PLAYER_CORNER_CARD_GREY_THRESHOLD;
}

function sideLaneBetweenComponents(component, neighbor) {
  if (!component || !neighbor) return undefined;
  const left = component.minX < neighbor.minX ? component : neighbor;
  const right = left === component ? neighbor : component;
  return LANE_BANDS.find(
    (band) => band.role === "side" && band.sourceX0 === left.maxX + 1 && band.sourceX1 === right.minX - 1,
  );
}

function playerCornerGreyAnchorX(component, alignX, y0, widthCells, heightCells) {
  if (alignX === "left") {
    const searchMax = Math.min(component.maxX + PLAYER_CORNER_CARD_SIDE_SEARCH_CELLS, PLAY_BOUNDS.x + PLAY_BOUNDS.width - widthCells);

    for (let x = component.minX; x <= searchMax; x += 1) {
      if (isStableGreyPanelArea(x, y0, widthCells, heightCells, alignX)) return x + 0.15;
    }

    return component.maxX + 0.35;
  }

  const searchMin = Math.max(component.minX - PLAYER_CORNER_CARD_SIDE_SEARCH_CELLS, PLAY_BOUNDS.x + widthCells);

  for (let x = component.maxX; x >= searchMin; x -= 1) {
    if (isStableGreyPanelArea(x - widthCells, y0, widthCells, heightCells, alignX)) return x + 0.85;
  }

  return component.minX - 0.35;
}

function playerCornerGreyVerticalRun(x0, x1, alignY, topY, bottomY) {
  const left = Math.min(x0, x1);
  const widthCells = Math.max(1, Math.abs(x1 - x0));
  const isGreyRow = (y) => playerCornerPanelCoverage(left, y, widthCells, 1) >= PLAYER_CORNER_CARD_GREY_THRESHOLD;

  if (alignY === "bottom") {
    let y0 = bottomY;

    for (let y = Math.ceil(bottomY) - 1; y >= Math.floor(topY); y -= 1) {
      const rowY = clamp(y, topY, bottomY);
      if (!isGreyRow(rowY)) break;
      y0 = rowY;
    }

    return { y0: Math.min(y0, bottomY), y1: bottomY };
  }

  let y1 = topY;

  for (let y = Math.floor(topY); y < Math.ceil(bottomY); y += 1) {
    const rowY = clamp(y, topY, bottomY);
    if (!isGreyRow(rowY)) break;
    y1 = Math.min(bottomY, Math.floor(rowY) + 1);
  }

  return { y0: topY, y1: Math.max(topY, y1) };
}

function playerCornerGreyArea(componentIndex, anchorX, alignX, alignY, topY, bottomY, widthCells) {
  const component = PLAYER_BUILD_COMPONENTS[componentIndex];
  const neighbor = alignX === "left" ? PLAYER_BUILD_COMPONENTS[componentIndex + 1] : PLAYER_BUILD_COMPONENTS[componentIndex - 1];
  const sideLane = sideLaneBetweenComponents(component, neighbor);
  const defaultX0 = alignX === "left" ? anchorX : anchorX - widthCells;
  const defaultX1 = alignX === "left" ? anchorX + widthCells : anchorX;
  const x0 =
    alignX === "left"
      ? defaultX0
      : Math.max(
          PLAY_BOUNDS.x,
          (neighbor?.maxX ?? component.minX) + 0.15,
          sideLane ? sideLane.x1 + 1.15 : PLAY_BOUNDS.x,
          anchorX - PLAYER_CORNER_CARD_SIDE_SEARCH_CELLS,
        );
  const x1 =
    alignX === "left"
      ? Math.min(
          PLAY_BOUNDS.x + PLAY_BOUNDS.width,
          (neighbor?.minX ?? component.maxX) - 0.15,
          sideLane ? sideLane.x0 - 0.15 : PLAY_BOUNDS.x + PLAY_BOUNDS.width,
          anchorX + PLAYER_CORNER_CARD_SIDE_SEARCH_CELLS,
        )
      : defaultX1;
  const areaX0 = alignX === "left" ? defaultX0 : Math.min(defaultX1, x0);
  const areaX1 = alignX === "left" ? Math.max(defaultX0, x1) : defaultX1;
  const greyRun = playerCornerGreyVerticalRun(areaX0, areaX1, alignY, topY, bottomY);

  return {
    x0: areaX0,
    x1: areaX1,
    y0: alignY === "top" ? topY : greyRun.y0 + BUILD_SIDE_POCKET_Y_OFFSET,
    y1: alignY === "top" ? greyRun.y1 + BUILD_SIDE_POCKET_Y_OFFSET : bottomY,
  };
}

function playerCornerAnchor(playerId) {
  const componentIndex = PLAYER_BUILD_WORLD_BOUNDS.findIndex((bound) => bound.playerIds.includes(Number(playerId)));
  const bound = PLAYER_BUILD_WORLD_BOUNDS[componentIndex];
  const component = PLAYER_BUILD_COMPONENTS[componentIndex];
  if (!component) return undefined;

  const playerGrid = playerGridForPlayerId(playerId);
  const alignX = componentIndex % 2 === 0 ? "left" : "right";
  const slotInBound = bound?.playerIds.indexOf(Number(playerId)) ?? 0;
  const alignY = playerGrid?.spawnEdge === "bottom" || (!playerGrid && slotInBound > 0) ? "bottom" : "top";
  const topY = Math.max(PLAY_BOUNDS.y + 1, component.minY);
  const bottomY = Math.min(component.maxY + 0.75, PLAY_BOUNDS.y + PLAY_BOUNDS.height - 1.25);
  const y = alignY === "top" ? topY : bottomY;
  const fitY = alignY === "top" ? topY : bottomY - PLAYER_CORNER_CARD_MAX_HEIGHT_CELLS;
  const x = playerCornerGreyAnchorX(component, alignX, fitY, PLAYER_CORNER_CARD_WIDTH_CELLS, PLAYER_CORNER_CARD_MAX_HEIGHT_CELLS);
  const area = playerCornerGreyArea(componentIndex, x, alignX, alignY, topY, bottomY, PLAYER_CORNER_CARD_WIDTH_CELLS);

  return {
    x,
    y,
    alignX,
    alignY,
    widthCells: PLAYER_CORNER_CARD_WIDTH_CELLS,
    area,
  };
}

function positionPlayerCornerPanels() {
  if (!playerCornerOverlay) return;
  const rect = board.getBoundingClientRect();
  const current = frame();
  const cellSize = rect.width / current.width;

  for (const card of playerCornerOverlay.querySelectorAll(".player-corner-card[data-player-id]")) {
    const anchorX = Number(card.dataset.anchorX);
    const anchorY = Number(card.dataset.anchorY);
    if (!Number.isFinite(anchorX) || !Number.isFinite(anchorY)) {
      card.dataset.hidden = "true";
      continue;
    }

    const alignX = card.dataset.alignX || "left";
    const alignY = card.dataset.alignY || "top";
    const widthCells = Number(card.dataset.widthCells);
    const areaX0 = Number(card.dataset.areaX0);
    const areaX1 = Number(card.dataset.areaX1);
    const areaY0 = Number(card.dataset.areaY0);
    const areaY1 = Number(card.dataset.areaY1);
    const fallbackRenderX = mapXToRenderX(anchorX);
    const fallbackLeft = alignX === "right" ? fallbackRenderX - (Number.isFinite(widthCells) ? widthCells : 0) : fallbackRenderX;
    const fallbackRight = alignX === "right" ? fallbackRenderX : fallbackRenderX + (Number.isFinite(widthCells) ? widthCells : 0);
    const renderAreaX0 = Number.isFinite(areaX0) ? mapXToRenderX(areaX0) : fallbackLeft;
    const renderAreaX1 = Number.isFinite(areaX1) ? mapXToRenderX(areaX1) : fallbackRight;
    const areaLeft = (Math.min(renderAreaX0, renderAreaX1) - current.x) * cellSize;
    const areaRight = (Math.max(renderAreaX0, renderAreaX1) - current.x) * cellSize;
    const areaTop = ((Number.isFinite(areaY0) ? areaY0 : anchorY) - current.y) * cellSize;
    const areaBottom = ((Number.isFinite(areaY1) ? areaY1 : anchorY) - current.y) * cellSize;
    const areaWidth = Math.max(0, areaRight - areaLeft);
    const areaHeight = Math.max(0, areaBottom - areaTop);
    const availableWidth = Math.max(0, areaWidth - PLAYER_CORNER_CARD_PIN_PADDING_PX * 2);
    const availableHeight = Math.max(0, areaHeight - PLAYER_CORNER_CARD_PIN_PADDING_PX * 2);
    const widthPx = Math.min(PLAYER_CORNER_CARD_WIDTH_PX, availableWidth);
    const heightPx = Math.min(PLAYER_CORNER_CARD_MAX_HEIGHT_PX, availableHeight);
    const left = areaLeft + PLAYER_CORNER_CARD_PIN_PADDING_PX + Math.max(0, availableWidth - widthPx) / 2;
    const top =
      alignY === "bottom"
        ? areaTop + PLAYER_CORNER_CARD_PIN_PADDING_PX
        : areaBottom - PLAYER_CORNER_CARD_PIN_PADDING_PX - heightPx;

    if (widthPx < PLAYER_CORNER_CARD_MIN_VISIBLE_WIDTH_PX || heightPx < PLAYER_CORNER_CARD_MIN_VISIBLE_HEIGHT_PX) {
      card.dataset.hidden = "true";
      continue;
    }

    card.dataset.hidden = "false";
    card.dataset.tight = heightPx < PLAYER_CORNER_CARD_BASE_CONTENT_HEIGHT_PX * 0.72 ? "true" : "false";
    const contentScale = clamp(
      Math.min(widthPx / PLAYER_CORNER_CARD_WIDTH_PX, heightPx / PLAYER_CORNER_CARD_BASE_CONTENT_HEIGHT_PX),
      0.74,
      1
    );
    const zoomBoostRatio = clamp((state.zoom - MIN_ZOOM) / (DEFAULT_ZOOM - MIN_ZOOM), 0, 1);
    const zoomIconSizePx = PLAYER_CORNER_ROLL_ICON_MIN_PX + zoomBoostRatio * PLAYER_CORNER_ROLL_ICON_ZOOM_BOOST_PX;
    const maxRollIconForWidth = Math.floor((widthPx - PLAYER_CORNER_ROLL_ICON_GAP_PX * 5) / 6);
    const rollIconMaxPx = Math.max(18, Math.min(PLAYER_CORNER_ROLL_ICON_MAX_PX, maxRollIconForWidth));
    const rollIconMinPx = Math.min(PLAYER_CORNER_ROLL_ICON_MIN_PX, rollIconMaxPx);
    const rollIconSizePx = Math.round(
      clamp(
        Math.max(cellSize * PLAYER_CORNER_ROLL_ICON_CELL_SCALE, zoomIconSizePx) * contentScale,
        rollIconMinPx,
        rollIconMaxPx
      )
    );
    card.style.setProperty("--player-corner-roll-icon-size", `${rollIconSizePx}px`);
    card.style.setProperty("--player-corner-font-size", `${Math.round(11 * contentScale * 10) / 10}px`);
    card.style.setProperty("--player-corner-header-font-size", `${Math.round(13 * contentScale * 10) / 10}px`);
    card.style.setProperty("--player-corner-gap", `${Math.max(2, Math.round(5 * contentScale))}px`);
    card.style.setProperty("--player-corner-roll-gap", `${Math.max(2, Math.round(PLAYER_CORNER_ROLL_ICON_GAP_PX * contentScale))}px`);
    card.style.width = `${widthPx}px`;
    card.style.height = `${heightPx}px`;
    card.style.maxHeight = `${heightPx}px`;
    card.style.transform = "none";
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    updatePlayerCornerCardFit(card);
  }

  updatePlayerEventsPopover();
}

function boardCellFromEvent(event) {
  const rect = board.getBoundingClientRect();
  const current = frame();
  const rx = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const ry = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  return {
    x: current.x + current.width * rx,
    y: current.y + current.height * ry,
    rx,
    ry,
  };
}

function minimapCenterFromEvent(event) {
  const rect = minimap.getBoundingClientRect();
  return {
    x: RENDER_BOUNDS.x + clamp((event.clientX - rect.left) / rect.width, 0, 1) * RENDER_BOUNDS.width,
    y: RENDER_BOUNDS.y + clamp((event.clientY - rect.top) / rect.height, 0, 1) * RENDER_BOUNDS.height,
  };
}

function centerFrameOn(cell) {
  const current = frame();
  setFrame({
    ...current,
    x: cell.x - current.width / 2,
    y: cell.y - current.height / 2,
  });
}

function playerLaneFocusPoint(playerId) {
  const grid = playerGridForPlayerId(playerId);
  if (!grid) return undefined;

  const rows = playerGridMaxRows(grid);
  if (rows <= 0) {
    return {
      x: (mapXToRenderX(grid.lane.x0) + mapXToRenderX(grid.lane.x1 + 1)) / 2,
      y: (grid.lane.y0 + grid.lane.y1) / 2,
    };
  }

  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (let row = 0; row < rows; row += 1) {
    const bounds = playerGridRowBounds(grid, row);
    left = Math.min(left, bounds.left);
    right = Math.max(right, bounds.right);
    top = Math.min(top, bounds.y);
    bottom = Math.max(bottom, bounds.y + 1);
  }

  if (![left, right, top, bottom].every(Number.isFinite)) return undefined;

  return {
    x: (mapXToRenderX(left) + mapXToRenderX(right)) / 2,
    y: (top + bottom) / 2,
  };
}

function focusPlayerLane(playerId) {
  const point = playerLaneFocusPoint(playerId);
  if (point) centerFrameOn(point);
}

function blocksMapDrag(target) {
  if (!(target instanceof Element)) return false;
  return (
    target === minimap ||
    Boolean(
      target.closest(
        ".unit-token, .player-events__more, .player-events-popover, .player-profile-popover, .selection-card, .map-minimap, button, input, select, textarea, a",
      ),
    )
  );
}

function wheelDeltaPixels(event) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    const list = playerEventsPopover?.querySelector(".player-events-popover__list");
    return event.deltaY * (list?.clientHeight || board.clientHeight || 1);
  }
  return event.deltaY;
}

function scrollPlayerEventsPopover(event) {
  if (!playerEventsPopover || playerEventsPopover.hidden) return;
  const list = playerEventsPopover.querySelector(".player-events-popover__list");
  if (!list) return;

  event.preventDefault();
  event.stopPropagation();
  list.scrollTop = clamp(list.scrollTop + wheelDeltaPixels(event), 0, Math.max(0, list.scrollHeight - list.clientHeight));
}

board.addEventListener("pointerdown", (event) => {
  if (blocksMapDrag(event.target)) return;
  board.setPointerCapture(event.pointerId);
  board.dataset.dragging = "true";
  state.drag = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    frame: { ...frame() },
  };
});

board.addEventListener("pointermove", (event) => {
  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  const rect = board.getBoundingClientRect();
  const dx = ((event.clientX - state.drag.x) / rect.width) * state.drag.frame.width;
  const dy = ((event.clientY - state.drag.y) / rect.height) * state.drag.frame.height;
  setFrame({
    ...state.drag.frame,
    x: state.drag.frame.x - dx,
    y: state.drag.frame.y - dy,
  });
});

board.addEventListener("pointerup", (event) => {
  if (state.drag?.pointerId === event.pointerId) {
    state.drag = undefined;
    board.dataset.dragging = "false";
  }
});

board.addEventListener("pointercancel", () => {
  state.drag = undefined;
  board.dataset.dragging = "false";
});

board.addEventListener(
  "wheel",
  (event) => {
    if (event.target.closest(".player-events-popover, .player-profile-popover")) return;
    event.preventDefault();
    const anchor = boardCellFromEvent(event);
    setZoom(state.zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), anchor);
  },
  { passive: false },
);

playerEventsPopover?.addEventListener("wheel", scrollPlayerEventsPopover, { passive: false });

minimap.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  minimap.setPointerCapture(event.pointerId);
  state.minimapDrag = event.pointerId;
  centerFrameOn(minimapCenterFromEvent(event));
});

minimap.addEventListener("pointermove", (event) => {
  if (state.minimapDrag !== event.pointerId) return;
  centerFrameOn(minimapCenterFromEvent(event));
});

minimap.addEventListener("pointerup", (event) => {
  if (state.minimapDrag === event.pointerId) state.minimapDrag = undefined;
});

board.addEventListener("click", (event) => {
  if (openPlayerCornerSendSelectionFromClick(event)) return;

  if (!event.target.closest(".unit-token")) {
    selectionCard.hidden = true;
    state.selectedToken = undefined;
  }
  if (!event.target.closest(".team-overlay, .player-corner-overlay, .player-events-popover")) closePlayerEventsPopover();
  if (!event.target.closest(".team-overlay, .player-corner-overlay, .player-profile-popover")) closePlayerProfilePopover();
});

teamOverlay?.addEventListener("click", (event) => {
  if (openPlayerProfileFromClick(event)) return;

  const button = event.target.closest("[data-player-event-more]");
  if (!button) return;
  event.stopPropagation();
  const card = button.closest(".team-overlay__player[data-player-id]");
  if (!card) return;
  openPlayerEventsPopover(Number(card.dataset.playerId), card);
});

playerCornerOverlay?.addEventListener("click", (event) => {
  if (openPlayerProfileFromClick(event)) return;

  const button = event.target.closest("[data-player-event-more]");
  if (!button) return;
  event.stopPropagation();
  const card = button.closest(".player-corner-card[data-player-id]");
  if (!card) return;
  openPlayerEventsPopover(Number(card.dataset.playerId), card);
});

playerProfilePopover?.addEventListener("click", (event) => {
  const close = event.target.closest("[data-player-profile-close]");
  if (!close) return;
  event.stopPropagation();
  closePlayerProfilePopover();
});

playerEventsPopover?.addEventListener("click", (event) => {
  const close = event.target.closest("[data-player-events-close]");
  if (!close) return;
  event.stopPropagation();
  closePlayerEventsPopover();
});

zoomInput.addEventListener("input", () => setZoom(zoomFromPercent(zoomInput.value)));
zoomOut.addEventListener("click", () => setZoom(state.zoom - ZOOM_STEP));
zoomIn.addEventListener("click", () => setZoom(state.zoom + ZOOM_STEP));
for (const button of iconModeButtons) {
  button.addEventListener("click", () => setIconMode(button.dataset.iconMode));
}
replayTime.addEventListener("input", () => {
  state.prepHighlightWaveLevel = undefined;
  seekReplayTime(replayTimelineTimeForInputValue(Number(replayTime.value)));
});
levelAnchors?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-time-millis]");
  if (!button) return;
  seekReplayLevelOutcome(button);
});
replayPlay.addEventListener("click", () => {
  if (state.playbackHandle === undefined) {
    startPlayback();
  } else {
    pausePlayback();
  }
});
replaySpeedDown.addEventListener("click", () => stepPlaybackRate(-1));
replaySpeedUp.addEventListener("click", () => stepPlaybackRate(1));
loadStatePlayer?.addEventListener("change", () => {
  const playerId = currentLoadStatePlayerId();
  state.selectedLoadStatePlayerId = playerId;
  focusPlayerLane(playerId);
  updateLoadStateControls();
});
loadStateDownload?.addEventListener("click", () => downloadLoadStateFile());
endgameOverlay?.addEventListener("click", (event) => {
  if (event.target.closest("[data-endgame-close]")) {
    state.endgameDismissed = true;
    updateEndgameOverlay();
    return;
  }

  if (event.target.closest("[data-endgame-restart]")) {
    state.endgameDismissed = true;
    seekReplayTime(0);
    startPlayback();
  }
});

window.addEventListener("resize", () => {
  const current = frame();
  const size = desiredFrameSize();
  setFrame({
    x: current.x + current.width / 2 - size.width / 2,
    y: current.y + current.height / 2 - size.height / 2,
    width: size.width,
    height: size.height,
  });
});

await loadReplayPayload();
updatePlaybackRateControls();
updateIconModeButtons();
updateSource();
await createTokens();
draw();
pausePlayback();
if (replayIsAtEnd()) {
  updateEndgameOverlay();
}
