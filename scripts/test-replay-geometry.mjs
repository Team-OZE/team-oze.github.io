import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
} from "../public/_replay-viewer/src/geometry-constants.mjs";

const mapData = JSON.parse(
  await readFile(new URL("../public/_replay-viewer/data/map.json", import.meta.url), "utf8"),
);

const GREEN_TILES = new Set(["Ygsb", "Yhdg"]);
const PLAY_BOUNDS_TOP_TRIM = 38;
const PLAY_BOUNDS_BOTTOM_TRIM = PLAY_BOUNDS_TOP_TRIM;
const PLAY_BOUNDS = {
  x: 3,
  y: PLAY_BOUNDS_TOP_TRIM,
  width: mapData.cellsX - 5,
  height: mapData.cellsY - PLAY_BOUNDS_TOP_TRIM - PLAY_BOUNDS_BOTTOM_TRIM,
};
const PLAYER_MAX_BUILD_ROWS = PLAYER_OWN_ROWS_BEFORE_LANE + PLAYER_SHARED_ROWS;
const PLAYER_BUILD_WORLD_BOUNDS = [
  { playerIds: [1, 2] },
  { playerIds: [3, 4] },
  { playerIds: [5, 6] },
  { playerIds: [7, 8] },
];
const MAP_WORLD = {
  offsetX: -8192,
  offsetY: -6144,
  cellSize: 128,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function snapBuildCoordinate(value) {
  return Math.round(Number(value) * 2) / 2;
}

function worldToDisplayPoint(worldX, worldY) {
  return {
    x: (Number(worldX) - MAP_WORLD.offsetX) / MAP_WORLD.cellSize,
    y: mapData.cellsY - (Number(worldY) - MAP_WORLD.offsetY) / MAP_WORLD.cellSize,
  };
}

function playerBuildGridForPlayerId(lanes, playerId) {
  return lanes.flatMap((lane) => lane.players).find((grid) => Number(grid.playerId) === Number(playerId));
}

function playerBuildDisplayOffset(lanes, playerId) {
  const grid = playerBuildGridForPlayerId(lanes, playerId);
  const laneIndex = grid?.laneIndex ?? grid?.lane?.laneIndex;

  return {
    x: laneIndex === undefined || laneIndex === 0 ? 1 : 0,
    y: 0.5,
  };
}

function replayBuildCenterPoint(locationX, locationY, playerId, lanes) {
  const rawPoint = worldToDisplayPoint(locationX, locationY);
  const offset = playerBuildDisplayOffset(lanes, playerId);

  return {
    x: snapBuildCoordinate(rawPoint.x + offset.x),
    y: snapBuildCoordinate(rawPoint.y + offset.y),
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

function isGreenCell(x, y) {
  return GREEN_TILES.has(tileIdAt(x, y));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
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

  if (!rows.length) return { cells: new Set(), meta: undefined };

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
  const narrowAnchorsLeft =
    Math.abs(median(narrowLefts) - originalWideLeft) <= Math.abs(median(narrowRights) - originalWideRight);
  const narrowInnerEdge = narrowAnchorsLeft ? median(narrowRights) : median(narrowLefts);
  const narrowLeft = narrowAnchorsLeft ? narrowInnerEdge - BUILD_SPAWN_BAND_WIDTH + 1 : narrowInnerEdge;
  const narrowRight = narrowAnchorsLeft ? narrowInnerEdge : narrowInnerEdge + BUILD_SPAWN_BAND_WIDTH - 1;
  const pocketLeft = narrowAnchorsLeft ? narrowRight + 1 : Math.max(originalWideLeft, narrowLeft - BUILD_SIDE_POCKET_WIDTH);
  const pocketRight = narrowAnchorsLeft ? Math.min(originalWideRight, narrowRight + BUILD_SIDE_POCKET_WIDTH) : narrowLeft - 1;
  const laneTop = Math.max(PLAY_BOUNDS.y, wideTop - BUILD_SPAWN_RUN_ROWS - 1);
  const laneBottom = laneTop + PLAYER_LANE_VERTICAL_SPAN - 1;
  const pocketTop = laneTop + Math.floor((PLAYER_LANE_VERTICAL_SPAN - BUILD_SIDE_POCKET_HEIGHT) / 2);
  const pocketBottom = pocketTop + BUILD_SIDE_POCKET_HEIGHT - 1;
  const pocketVisualTop = pocketTop + BUILD_SIDE_POCKET_Y_OFFSET;
  const pocketVisualBottom = pocketVisualTop + BUILD_SIDE_POCKET_HEIGHT;
  const result = new Set();

  for (let y = laneTop; y <= laneBottom; y += 1) {
    for (let x = narrowLeft; x <= narrowRight; x += 1) result.add(`${x},${y}`);
  }

  for (let y = pocketTop; y <= pocketBottom; y += 1) {
    for (let x = pocketLeft; x <= pocketRight; x += 1) result.add(`${x},${y}`);
  }

  return {
    cells: result,
    meta: {
      narrowAnchorsLeft,
      narrowLeft,
      narrowRight,
      pocketLeft,
      pocketRight,
      laneTop,
      laneBottom,
      pocketTop,
      pocketBottom,
      pocketVisualTop,
      pocketVisualBottom,
    },
  };
}

function buildBuildGridCells() {
  const visited = new Set();
  const result = new Set();
  const metas = [];
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
          if (nx < minX || nx >= maxX || ny < minY || ny >= maxY || visited.has(key) || !isGreenCell(nx, ny)) {
            continue;
          }
          visited.add(key);
          stack.push([nx, ny]);
        }
      }

      const span = Math.max(right - left + 1, bottom - top + 1);
      if (cells.length < BUILD_REGION_MIN_CELLS || span < BUILD_REGION_MIN_SPAN) continue;

      const straightened = straightenedBuildRegion(cells, left, right, top, bottom);
      if (straightened.meta) metas.push(straightened.meta);
      for (const key of straightened.cells) result.add(key);
    }
  }

  return { cells: result, metas };
}

function buildGridComponents(cells) {
  const seen = new Set();
  const components = [];

  for (const key of cells) {
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
        if (!cells.has(nextKey) || seen.has(nextKey)) continue;
        seen.add(nextKey);
        stack.push([x + dx, y + dy]);
      }
    }

    components.push({ minX, maxX, minY, maxY, count });
  }

  return components.sort((a, b) => a.minX - b.minX);
}

function componentBuildRows(cells, component) {
  const rows = [];

  for (let y = component.minY; y <= component.maxY; y += 1) {
    const xs = [];
    for (let x = component.minX; x <= component.maxX; x += 1) {
      if (cells.has(`${x},${y}`)) xs.push(x);
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

function rowCells(cells, component, y) {
  const xs = [];
  for (let x = component.minX; x <= component.maxX; x += 1) {
    if (cells.has(`${x},${y}`)) xs.push(x);
  }
  return xs;
}

function laneColumnsForComponent(cells, component) {
  const rows = componentBuildRows(cells, component);
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
  let bestScore = -1;
  for (const candidate of candidates) {
    const x0 = clamp(Number(candidate), component.minX, component.maxX - PLAYER_LANE_WIDTH + 1);
    let score = 0;
    for (const row of sample) {
      for (let x = x0; x < x0 + PLAYER_LANE_WIDTH; x += 1) {
        if (cells.has(`${x},${row.y}`)) score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestX0 = x0;
    }
  }

  return { x0: bestX0, x1: bestX0 + PLAYER_LANE_WIDTH };
}

function playerGridSharedStartRow(cells, component, spawnEdge, originY) {
  const sharedRows = componentBuildRows(cells, component).filter((row) => row.width > PLAYER_LANE_WIDTH);
  if (!sharedRows.length) return PLAYER_OWN_ROWS_BEFORE_LANE;

  if (spawnEdge === "top") {
    const firstSharedY = Math.min(...sharedRows.map((row) => row.y));
    return Math.max(0, firstSharedY - originY);
  }

  const lastSharedY = Math.max(...sharedRows.map((row) => row.y));
  return Math.max(0, originY - lastSharedY - 1);
}

function buildPlayerLaneGrids(cells, components) {
  const sorted = [...components].sort((a, b) => a.minX - b.minX || a.minY - b.minY);
  const sideSplit = Math.ceil(sorted.length / 2);

  return sorted.map((component, index) => {
    const columns = laneColumnsForComponent(cells, component);
    const side = index < sideSplit ? "west" : "east";
    const laneIndex = index < sideSplit ? index : index - sideSplit;
    const bound = PLAYER_BUILD_WORLD_BOUNDS[index];
    const lane = {
      id: `${side}-${laneIndex}`,
      side,
      laneIndex,
      component,
      x0: columns.x0,
      x1: columns.x1,
      y0: component.minY,
      y1: component.maxY + 1,
      playerIds: bound?.playerIds || [],
    };

    lane.players = lane.playerIds.map((playerId, playerInLane) => {
      const spawnEdge = playerInLane === 0 ? "top" : "bottom";
      const originY = spawnEdge === "top" ? lane.y0 : lane.y1;
      return {
        id: `${lane.id}-${spawnEdge}`,
        lane,
        playerId,
        spawnEdge,
        originX: lane.x0,
        originY,
        rowDir: spawnEdge === "top" ? 1 : -1,
        sharedStartRow: playerGridSharedStartRow(cells, component, spawnEdge, originY),
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

function componentBuildRowAt(cells, component, y) {
  return componentBuildRows(cells, component).find((row) => row.y === y);
}

function playerGridCellY(grid, row) {
  return grid.rowDir > 0 ? grid.originY + row : grid.originY - row - 1;
}

function playerGridRowBounds(cells, grid, row) {
  const maxRows = playerGridMaxRows(grid);
  const clampedRow = clamp(Math.floor(Number(row) || 0), 0, Math.max(0, maxRows - 1));
  const y = playerGridCellY(grid, clampedRow);
  const componentRow = componentBuildRowAt(cells, grid.lane.component, y);
  const adjacentSharedRow = componentBuildRowAt(cells, grid.lane.component, y + grid.rowDir);
  const sharedRow =
    componentRow && componentRow.width > PLAYER_LANE_WIDTH
      ? componentRow
      : clampedRow >= grid.sharedStartRow && adjacentSharedRow && adjacentSharedRow.width > PLAYER_LANE_WIDTH
        ? adjacentSharedRow
        : undefined;

  return {
    y,
    left: sharedRow ? sharedRow.left : grid.originX,
    right: sharedRow ? sharedRow.right + 1 : grid.originX + PLAYER_LANE_WIDTH,
    shared: Boolean(sharedRow),
  };
}

function addInferredPlayerGridBuildCells(cells, lanes) {
  const sourceBuildCells = new Set(cells);
  const result = new Set(cells);

  for (const lane of lanes) {
    for (const grid of lane.players) {
      const rows = playerGridMaxRows(grid);
      for (let row = 0; row < rows; row += 1) {
        const bounds = playerGridRowBounds(result, grid, row);
        let sourceRowWidth = 0;
        for (let x = grid.lane.component.minX; x <= grid.lane.component.maxX; x += 1) {
          if (sourceBuildCells.has(`${x},${bounds.y}`)) sourceRowWidth += 1;
        }
        if (sourceRowWidth === 0) continue;

        const keepSharedEdgeAsSource = bounds.shared && sourceRowWidth <= PLAYER_LANE_WIDTH;
        for (let x = bounds.left; x < bounds.right; x += 1) {
          const key = `${x},${bounds.y}`;
          if (keepSharedEdgeAsSource && !sourceBuildCells.has(key)) continue;
          result.add(key);
        }
      }
    }
  }

  return result;
}

function assertRow(cells, component, y, left, right, label) {
  const xs = rowCells(cells, component, y);
  assert.deepEqual(xs, range(left, right), label);
}

function assertNoRowCells(cells, component, y, label) {
  assert.deepEqual(rowCells(cells, component, y), [], label);
}

function assertLaneGeometry(cells, component, meta, label) {
  const narrowWidth = meta.narrowRight - meta.narrowLeft + 1;
  const pocketWidth = meta.pocketRight - meta.pocketLeft + 1;
  const laneRows = range(meta.laneTop, meta.laneBottom);
  const pocketRows = range(meta.pocketTop, meta.pocketBottom);
  const topTerrainRows = range(meta.laneTop, meta.pocketTop - 1);
  const bottomTerrainRows = range(meta.pocketBottom + 1, meta.laneBottom);
  const pocketSide = meta.narrowAnchorsLeft ? "right" : "left";
  const fullLeft = Math.min(meta.narrowLeft, meta.pocketLeft);
  const fullRight = Math.max(meta.narrowRight, meta.pocketRight);

  assert.equal(narrowWidth, BUILD_SPAWN_BAND_WIDTH, `${label}: spawn band width`);
  assert.equal(pocketWidth, BUILD_SIDE_POCKET_WIDTH, `${label}: side pocket width`);
  assert.equal(laneRows.length, PLAYER_LANE_VERTICAL_SPAN, `${label}: main lane height`);
  assert.equal(pocketRows.length, BUILD_SIDE_POCKET_HEIGHT, `${label}: side pocket height`);
  assert.equal(topTerrainRows.length, BUILD_SPAWN_RUN_ROWS, `${label}: spawn-to-pocket terrain above`);
  assert.equal(bottomTerrainRows.length, BUILD_SPAWN_RUN_ROWS + 1, `${label}: spawn-to-pocket terrain below half-cell offset`);
  assert.equal(meta.pocketVisualTop, meta.pocketTop + BUILD_SIDE_POCKET_Y_OFFSET, `${label}: side pocket visual half-cell offset`);
  assert.equal(meta.pocketVisualBottom, meta.pocketVisualTop + BUILD_SIDE_POCKET_HEIGHT, `${label}: side pocket visual height`);
  assert.equal(
    meta.pocketVisualTop - meta.laneTop,
    meta.laneBottom + 1 - meta.pocketVisualBottom,
    `${label}: side pocket is visually centered in the lane`,
  );
  assert.equal(component.count, BUILD_SPAWN_BAND_WIDTH * PLAYER_LANE_VERTICAL_SPAN + BUILD_SIDE_POCKET_WIDTH * BUILD_SIDE_POCKET_HEIGHT, `${label}: cell count`);
  assert.equal(component.minY, meta.laneTop, `${label}: component starts at lane top`);
  assert.equal(component.maxY, meta.laneBottom, `${label}: component ends at lane bottom`);

  if (pocketSide === "right") {
    assert.equal(meta.pocketLeft, meta.narrowRight + 1, `${label}: right pocket touches lane`);
  } else {
    assert.equal(meta.pocketRight, meta.narrowLeft - 1, `${label}: left pocket touches lane`);
  }

  for (const y of laneRows) {
    const rowLabel = `${label}: row ${y}`;
    if (y >= meta.pocketTop && y <= meta.pocketBottom) {
      assertRow(cells, component, y, fullLeft, fullRight, `${rowLabel} includes centered side pocket`);
    } else {
      assertRow(cells, component, y, meta.narrowLeft, meta.narrowRight, `${rowLabel} keeps only the 13-wide lane`);
    }
  }

  for (let x = meta.pocketLeft; x <= meta.pocketRight; x += 1) {
    const greenRows = laneRows.filter((y) => cells.has(`${x},${y}`));
    assert.deepEqual(greenRows, pocketRows, `${label}: pocket column ${x} is green only for the 12 centered rows`);
  }
}

assert.equal(PLAYER_LANE_WIDTH, BUILD_SPAWN_BAND_WIDTH, "player lane width follows spawn band width");
assert.equal(PLAYER_SPAWN_RUN_ROWS, BUILD_SPAWN_RUN_ROWS, "player spawn run follows build spawn run");

const { cells: sourceCells, metas } = buildBuildGridCells();
const components = buildGridComponents(sourceCells).slice(0, PLAYER_BUILD_WORLD_BOUNDS.length);
const lanes = buildPlayerLaneGrids(sourceCells, components);
const finalCells = addInferredPlayerGridBuildCells(sourceCells, lanes);

assert.equal(components.length, 4, "four two-player lane components");
assert.equal(metas.length, 4, "four player build geometry records");
assert.equal(lanes.flatMap((lane) => lane.players).length, 8, "eight player spawn sites");
assert.deepEqual(
  playerBuildDisplayOffset(lanes, 1),
  { x: 1, y: 0.5 },
  "leftmost player build coordinates start one cell left of the generated grid",
);
assert.deepEqual(
  playerBuildDisplayOffset(lanes, 3),
  { x: 0, y: 0.5 },
  "second west player build coordinates already align horizontally with the generated grid",
);
assert.deepEqual(
  replayBuildCenterPoint(-6592, 3584, 1, lanes),
  { x: 13.5, y: 52.5 },
  "leftmost player replay build coordinates are converted from footprint edge to visual center on both axes",
);
assert.deepEqual(
  replayBuildCenterPoint(-6336, 1920, 1, lanes),
  { x: 15.5, y: 65.5 },
  "leftmost player replay build coordinates preserve known Y centering while shifting X to the correct cell",
);
assert.deepEqual(
  replayBuildCenterPoint(-2752, 4224, 3, lanes),
  { x: 42.5, y: 47.5 },
  "second west player replay build coordinates keep their native X alignment while centering Y",
);

for (const [index, lane] of lanes.entries()) {
  assert.equal(lane.y1 - lane.y0, PLAYER_LANE_VERTICAL_SPAN, `${lane.id}: player-to-player lane span`);
  assertLaneGeometry(finalCells, components[index], metas[index], lane.id);
}

console.log("Replay geometry tests passed.");
