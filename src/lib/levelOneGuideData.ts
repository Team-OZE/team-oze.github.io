import type { RowDataPacket } from "mysql2";
import { getDatabasePool } from "./database";
import { getW3ChampionsLegion4v4MmrMap, normalizeBattleTag } from "./playerElo";
import { iconPathForUnit } from "./unitIcons";

export type LevelOneUnitIcon = {
  unitType: string;
  unitName: string;
  iconPath: string;
};

export type LevelOneGrid = {
  cols: number;
  rows: number;
};

export type LevelOneBuildUnit = LevelOneUnitIcon & {
  actionId: number;
  col: number;
  goldCost: number | null;
  level: number;
  locationX: number;
  locationY: number;
  row: number;
  timeMillis: number;
  totalGoldCost: number | null;
};

export type LevelOnePlay = {
  id: string;
  gameMode: string;
  grid: LevelOneGrid;
  income: number;
  levelEndMillis: number;
  mapVersion: string;
  matchId: string;
  player: {
    battleTag: string;
    elo: number;
    id: number;
    name: string;
  };
  replayId: number;
  roll: LevelOneUnitIcon[];
  startedAt: string;
  units: LevelOneBuildUnit[];
  value: number;
};

export type LevelOneUnitGuide = LevelOneUnitIcon & {
  examples: LevelOnePlay[];
  examplesCount: number;
  playersCount: number;
};

export type LevelOneGuideData = {
  source: string;
  minElo: number;
  scope: {
    gameMode: string;
    mode: string;
  };
  highPlayerCount: number;
  playCount: number;
  unitCount: number;
  units: LevelOneUnitGuide[];
};

type LevelOneStatRow = RowDataPacket & {
  battleTag: string;
  gameMode: string | null;
  income: number;
  levelEndMillis: number;
  mapVersion: string | null;
  matchId: number;
  mmId: string;
  playerId: number;
  startedAt: string;
  value: number;
};

type BuildRow = RowDataPacket & {
  actionId: number;
  locationX: string | number;
  locationY: string | number;
  matchId: number;
  playerId: number;
  timeMillis: number;
  unitType: string;
};

type UpgradeRow = BuildRow;

type SellRow = RowDataPacket & {
  actionId: number;
  locationX: string | number;
  locationY: string | number;
  matchId: number;
  playerId: number;
  timeMillis: number;
};

type RollRow = RowDataPacket & {
  actionId: number;
  item1: string;
  item2: string;
  item3: string;
  item4: string;
  item5: string;
  item6: string | null;
  matchId: number;
  playerId: number;
  timeMillis: number;
};

type UnitDetailRow = RowDataPacket & {
  goldCost: number | null;
  id: string;
  mapVersion: string;
  name: string | null;
  totalGoldCost: number | null;
  upgradeGroup: string | null;
};

type UnitDetail = {
  goldCost: number | null;
  id: string;
  mapVersion: string;
  name: string;
  totalGoldCost: number | null;
  upgradeGroup: string | null;
};

type UnitLifecycle = {
  actionId: number;
  locationX: number;
  locationY: number;
  removedAtMillis: number | null;
  states: UnitState[];
  timeMillis: number;
};

type UnitState = {
  actionId: number;
  level: number;
  timeMillis: number;
  unitType: string;
};

type PlaySeed = {
  row: LevelOneStatRow;
  elo: number;
};

const guideScope = {
  gameMode: "X3",
  mode: "Legion TD 4v4"
};
const minElo = 1600;
const guideCacheMs = 20_000;
const gridStep = 64;

let guideCache: { data: LevelOneGuideData; loadedAt: number } | null = null;

export async function getLevelOneGuideData(): Promise<LevelOneGuideData> {
  if (guideCache && Date.now() - guideCache.loadedAt < guideCacheMs) {
    return guideCache.data;
  }

  const pool = await getDatabasePool();
  if (!pool) {
    throw new Error("Replay database is not configured or does not contain the replay tables");
  }

  const [levelRows] = await pool.query<LevelOneStatRow[]>(
    `SELECT
       m.id AS matchId,
       m.mm_id AS mmId,
       DATE_FORMAT(m.started_at, '%Y-%m-%d %H:%i:%s') AS startedAt,
       m.gamemode AS gameMode,
       COALESCE(gi.map_version, m.map_version) AS mapVersion,
       p.player_id AS playerId,
       p.battle_tag AS battleTag,
       a.time_milis AS levelEndMillis,
       s.player_value AS value,
       s.player_income AS income
     FROM records_level_end_player_stats s
     INNER JOIN actions a ON a.id = s.action_id
     INNER JOIN matches m ON m.id = a.match_id
     INNER JOIN players p ON p.match_id = m.id AND p.player_id = a.player_id
     LEFT JOIN (
       SELECT a.match_id, r.map_version
       FROM records_game_init r
       INNER JOIN actions a ON a.id = r.action_id
     ) gi ON gi.match_id = m.id
     INNER JOIN (
       SELECT match_id
       FROM players
       WHERE battle_tag <> '' AND battle_tag <> 'FLO'
       GROUP BY match_id
       HAVING COUNT(*) = 8
     ) pc ON pc.match_id = m.id
     WHERE s.level_number = 1
       AND m.gamemode = ?
       AND p.battle_tag <> ''
       AND p.battle_tag <> 'FLO'
     ORDER BY m.started_at DESC, m.id DESC, p.player_id`,
    [guideScope.gameMode]
  );
  const playerEloByBattleTag = await getW3ChampionsLegion4v4MmrMap(levelRows.map((row) => row.battleTag));
  const playSeeds = levelRows
    .map((row): PlaySeed | null => {
      const elo = playerEloByBattleTag.get(normalizeBattleTag(row.battleTag));
      return elo && elo >= minElo ? { row, elo } : null;
    })
    .filter((seed): seed is PlaySeed => seed !== null);
  const matchIds = [...new Set(playSeeds.map((seed) => Number(seed.row.matchId)))];

  if (matchIds.length === 0) {
    const emptyData = {
      source: "database",
      minElo,
      scope: guideScope,
      highPlayerCount: 0,
      playCount: 0,
      unitCount: 0,
      units: []
    };
    guideCache = { data: emptyData, loadedAt: Date.now() };
    return emptyData;
  }

  const [buildRows] = await pool.query<BuildRow[]>(
    `SELECT
       a.id AS actionId,
       a.match_id AS matchId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       b.unit_type AS unitType,
       CAST(b.location_x AS CHAR) AS locationX,
       CAST(b.location_y AS CHAR) AS locationY
     FROM records_unit_build b
     INNER JOIN actions a ON a.id = b.action_id
     WHERE a.match_id IN (?) AND a.type = 'UNIT_BUILD'
     ORDER BY a.match_id, a.player_id, a.time_milis, a.id`,
    [matchIds]
  );
  const [upgradeRows] = await pool.query<UpgradeRow[]>(
    `SELECT
       a.id AS actionId,
       a.match_id AS matchId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       u.unit_type AS unitType,
       CAST(u.location_x AS CHAR) AS locationX,
       CAST(u.location_y AS CHAR) AS locationY
     FROM records_unit_upgrade u
     INNER JOIN actions a ON a.id = u.action_id
     WHERE a.match_id IN (?) AND a.type = 'UNIT_UPGRADE'
     ORDER BY a.match_id, a.player_id, a.time_milis, a.id`,
    [matchIds]
  );
  const [sellRows] = await pool.query<SellRow[]>(
    `SELECT
       a.id AS actionId,
       a.match_id AS matchId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       CAST(s.location_x AS CHAR) AS locationX,
       CAST(s.location_y AS CHAR) AS locationY
     FROM records_unit_sell s
     INNER JOIN actions a ON a.id = s.action_id
     WHERE a.match_id IN (?) AND a.type = 'UNIT_SELL'
     ORDER BY a.match_id, a.player_id, a.time_milis, a.id`,
    [matchIds]
  );
  const [rollRows] = await pool.query<RollRow[]>(
    `SELECT
       a.id AS actionId,
       a.match_id AS matchId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       r.unit_1 AS item1,
       r.unit_2 AS item2,
       r.unit_3 AS item3,
       r.unit_4 AS item4,
       r.unit_5 AS item5,
       r.unit_6 AS item6
     FROM records_player_roll r
     INNER JOIN actions a ON a.id = r.action_id
     WHERE a.match_id IN (?) AND a.type = 'PLAYER_ROLL'
     ORDER BY a.match_id, a.player_id, a.time_milis, a.id`,
    [matchIds]
  );
  const unitDetails = await loadUnitDetails(
    [...buildRows.map((row) => row.unitType), ...upgradeRows.map((row) => row.unitType), ...rollRows.flatMap(rollUnitIds)]
      .filter(Boolean),
    pool
  );
  const buildRowsByPlay = groupRowsByPlay(buildRows);
  const upgradeRowsByPlay = groupRowsByPlay(upgradeRows);
  const sellRowsByPlay = groupRowsByPlay(sellRows);
  const rollRowsByPlay = groupRowsByPlay(rollRows);
  const plays = playSeeds
    .map(({ row, elo }) =>
      buildLevelOnePlay({
        buildRows: buildRowsByPlay.get(playKey(row.matchId, row.playerId)) ?? [],
        elo,
        rollRows: rollRowsByPlay.get(playKey(row.matchId, row.playerId)) ?? [],
        row,
        sellRows: sellRowsByPlay.get(playKey(row.matchId, row.playerId)) ?? [],
        unitDetails,
        upgradeRows: upgradeRowsByPlay.get(playKey(row.matchId, row.playerId)) ?? []
      })
    )
    .filter((play): play is LevelOnePlay => play !== null);
  const units = groupPlaysByUnit(plays);
  const data = {
    source: "database",
    minElo,
    scope: guideScope,
    highPlayerCount: new Set(plays.map((play) => normalizeBattleTag(play.player.battleTag))).size,
    playCount: plays.length,
    unitCount: units.length,
    units
  };

  guideCache = { data, loadedAt: Date.now() };
  return data;
}

async function loadUnitDetails(unitIds: string[], pool: Awaited<ReturnType<typeof getDatabasePool>>) {
  const uniqueUnitIds = [...new Set(unitIds.filter(Boolean))];
  const detailsByUnitId = new Map<string, UnitDetail[]>();

  if (!pool || uniqueUnitIds.length === 0) {
    return detailsByUnitId;
  }

  const [rows] = await pool.query<UnitDetailRow[]>(
    `SELECT id, name, gold_cost AS goldCost, total_gold_cost AS totalGoldCost, upgrade_group AS upgradeGroup, map_version AS mapVersion
     FROM data_units
     WHERE id IN (?)
     ORDER BY id, map_version DESC`,
    [uniqueUnitIds]
  );

  for (const row of rows) {
    const rowsForUnit = detailsByUnitId.get(row.id) ?? [];
    rowsForUnit.push({
      goldCost: nullableNumber(row.goldCost),
      id: row.id,
      mapVersion: row.mapVersion,
      name: row.name ?? row.id,
      totalGoldCost: nullableNumber(row.totalGoldCost),
      upgradeGroup: row.upgradeGroup
    });
    detailsByUnitId.set(row.id, rowsForUnit);
  }

  return detailsByUnitId;
}

function buildLevelOnePlay({
  buildRows,
  elo,
  rollRows,
  row,
  sellRows,
  unitDetails,
  upgradeRows
}: {
  buildRows: BuildRow[];
  elo: number;
  rollRows: RollRow[];
  row: LevelOneStatRow;
  sellRows: SellRow[];
  unitDetails: Map<string, UnitDetail[]>;
  upgradeRows: UpgradeRow[];
}) {
  const levelEndMillis = Number(row.levelEndMillis);
  const unitLifecycles = buildUnitLifecycles(buildRows, upgradeRows, sellRows)
    .filter((unit) => unit.timeMillis <= levelEndMillis && (unit.removedAtMillis === null || unit.removedAtMillis > levelEndMillis))
    .map((unit) => currentUnitAtLevelEnd(unit, row.mapVersion, levelEndMillis, unitDetails))
    .filter((unit): unit is Omit<LevelOneBuildUnit, "col" | "row"> => unit !== null);

  if (unitLifecycles.length === 0) {
    return null;
  }

  const grid = buildGrid(unitLifecycles);
  const units = unitLifecycles.map((unit) => ({
    ...unit,
    col: gridCellX(unit.locationX, grid.minX),
    row: gridCellY(unit.locationY, grid.maxY)
  }));
  const roll = levelBuildRoll(rollRows, units, row.mapVersion, unitDetails);

  return {
    id: `${row.matchId}-${row.playerId}`,
    gameMode: row.gameMode ?? "Unknown",
    grid: {
      cols: grid.cols,
      rows: grid.rows
    },
    income: Number(row.income),
    levelEndMillis,
    mapVersion: row.mapVersion ?? "",
    matchId: row.mmId,
    player: {
      battleTag: row.battleTag,
      elo,
      id: Number(row.playerId),
      name: playerName(row.battleTag)
    },
    replayId: Number(row.matchId),
    roll,
    startedAt: row.startedAt,
    units,
    value: Number(row.value)
  };
}

function levelBuildRoll(
  rollRows: RollRow[],
  units: Array<{ unitType: string }>,
  mapVersion: string | null,
  unitDetails: Map<string, UnitDetail[]>
) {
  const firstRollMillis = Math.min(...rollRows.map((roll) => Number(roll.timeMillis)));
  const firstRollRows = rollRows
    .filter((roll) => Number(roll.timeMillis) === firstRollMillis)
    .sort((a, b) => Number(a.actionId) - Number(b.actionId));
  const builtUnitIds = new Set(
    units.flatMap((unit) => {
      const detail = unitDetail(unit.unitType, mapVersion, unitDetails);
      return [unit.unitType, detail.upgradeGroup].filter(Boolean) as string[];
    })
  );
  const firstRoll = firstRollRows
    .map((roll) => ({
      roll,
      score: rollUnitIds(roll).filter((unitId) => builtUnitIds.has(unitId)).length
    }))
    .sort((a, b) => b.score - a.score || Number(a.roll.actionId) - Number(b.roll.actionId))[0]?.roll;

  return firstRoll ? rollUnitIds(firstRoll).map((unitId) => unitIcon(unitId, mapVersion, unitDetails)) : [];
}

function buildUnitLifecycles(buildRows: BuildRow[], upgradeRows: UpgradeRow[], sellRows: SellRow[]) {
  const units: UnitLifecycle[] = [];
  const openByLocation = new Map<string, UnitLifecycle>();
  const events = [
    ...buildRows.map((row) => ({ kind: "build" as const, row })),
    ...upgradeRows.map((row) => ({ kind: "upgrade" as const, row })),
    ...sellRows.map((row) => ({ kind: "sell" as const, row }))
  ].sort((a, b) => Number(a.row.timeMillis) - Number(b.row.timeMillis) || Number(a.row.actionId) - Number(b.row.actionId));

  for (const event of events) {
    const key = locationKey(event.row);
    const openUnit = openByLocation.get(key);

    if (event.kind === "build") {
      const unit: UnitLifecycle = {
        actionId: Number(event.row.actionId),
        locationX: Number(event.row.locationX),
        locationY: Number(event.row.locationY),
        removedAtMillis: null,
        states: [
          {
            actionId: Number(event.row.actionId),
            level: 1,
            timeMillis: Number(event.row.timeMillis),
            unitType: event.row.unitType
          }
        ],
        timeMillis: Number(event.row.timeMillis)
      };

      if (openUnit && openUnit.removedAtMillis === null) {
        openUnit.removedAtMillis = unit.timeMillis;
      }

      units.push(unit);
      openByLocation.set(key, unit);
      continue;
    }

    if (event.kind === "upgrade") {
      if (openUnit && openUnit.removedAtMillis === null) {
        openUnit.states.push({
          actionId: Number(event.row.actionId),
          level: openUnit.states.length + 1,
          timeMillis: Number(event.row.timeMillis),
          unitType: event.row.unitType
        });
      }
      continue;
    }

    if (openUnit && openUnit.removedAtMillis === null) {
      openUnit.removedAtMillis = Number(event.row.timeMillis);
      openByLocation.delete(key);
    }
  }

  return units;
}

function currentUnitAtLevelEnd(
  unit: UnitLifecycle,
  mapVersion: string | null,
  levelEndMillis: number,
  unitDetails: Map<string, UnitDetail[]>
) {
  const state = [...unit.states]
    .filter((candidate) => candidate.timeMillis <= levelEndMillis)
    .sort((a, b) => b.timeMillis - a.timeMillis || b.actionId - a.actionId)[0];

  if (!state) {
    return null;
  }

  const detail = unitDetail(state.unitType, mapVersion, unitDetails);

  return {
    actionId: state.actionId,
    goldCost: detail.goldCost,
    iconPath: iconPathForUnit(state.unitType, detail.upgradeGroup),
    level: state.level,
    locationX: unit.locationX,
    locationY: unit.locationY,
    timeMillis: state.timeMillis,
    totalGoldCost: detail.totalGoldCost,
    unitName: detail.name,
    unitType: state.unitType
  };
}

function buildGrid(units: Array<{ locationX: number; locationY: number }>) {
  const minX = Math.floor(Math.min(...units.map((unit) => unit.locationX)) / gridStep) * gridStep - gridStep;
  const maxX = Math.ceil(Math.max(...units.map((unit) => unit.locationX)) / gridStep) * gridStep + gridStep;
  const minY = Math.floor(Math.min(...units.map((unit) => unit.locationY)) / gridStep) * gridStep - gridStep;
  const maxY = Math.ceil(Math.max(...units.map((unit) => unit.locationY)) / gridStep) * gridStep + gridStep;

  return {
    cols: Math.max(3, Math.round((maxX - minX) / gridStep) + 1),
    maxY,
    minX,
    rows: Math.max(3, Math.round((maxY - minY) / gridStep) + 1)
  };
}

function gridCellX(locationX: number, minX: number) {
  return Math.round((locationX - minX) / gridStep) + 1;
}

function gridCellY(locationY: number, maxY: number) {
  return Math.round((maxY - locationY) / gridStep) + 1;
}

function groupPlaysByUnit(plays: LevelOnePlay[]) {
  const unitsByType = new Map<string, LevelOneUnitGuide>();

  for (const play of plays) {
    const seenInPlay = new Set<string>();

    for (const unit of play.units) {
      if (seenInPlay.has(unit.unitType)) {
        continue;
      }
      seenInPlay.add(unit.unitType);

      const guide = unitsByType.get(unit.unitType) ?? {
        examples: [],
        examplesCount: 0,
        iconPath: unit.iconPath,
        playersCount: 0,
        unitName: unit.unitName,
        unitType: unit.unitType
      };

      guide.examples.push(play);
      guide.examplesCount = guide.examples.length;
      guide.playersCount = new Set(guide.examples.map((example) => normalizeBattleTag(example.player.battleTag))).size;
      unitsByType.set(unit.unitType, guide);
    }
  }

  return [...unitsByType.values()]
    .map((unit) => ({
      ...unit,
      examples: unit.examples.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    }))
    .sort((a, b) => b.examplesCount - a.examplesCount || a.unitName.localeCompare(b.unitName));
}

function groupRowsByPlay<Row extends { matchId: number; playerId: number }>(rows: Row[]) {
  const byPlay = new Map<string, Row[]>();

  for (const row of rows) {
    const key = playKey(row.matchId, row.playerId);
    const rowsForPlay = byPlay.get(key) ?? [];
    rowsForPlay.push(row);
    byPlay.set(key, rowsForPlay);
  }

  return byPlay;
}

function playKey(matchId: number, playerId: number) {
  return `${Number(matchId)}:${Number(playerId)}`;
}

function locationKey(row: { playerId: number; locationX: string | number; locationY: string | number }) {
  return `${Number(row.playerId)}:${coordinateKey(row.locationX)}:${coordinateKey(row.locationY)}`;
}

function coordinateKey(value: string | number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(3) : String(value);
}

function rollUnitIds(row: RollRow) {
  return [row.item1, row.item2, row.item3, row.item4, row.item5, row.item6].filter(Boolean) as string[];
}

function unitIcon(unitType: string, mapVersion: string | null, unitDetails: Map<string, UnitDetail[]>): LevelOneUnitIcon {
  const detail = unitDetail(unitType, mapVersion, unitDetails);

  return {
    iconPath: iconPathForUnit(unitType, detail.upgradeGroup),
    unitName: detail.name,
    unitType
  };
}

function unitDetail(unitType: string, mapVersion: string | null, unitDetails: Map<string, UnitDetail[]>): UnitDetail {
  const rows = unitDetails.get(unitType) ?? [];
  const detail = rows.find((row) => row.mapVersion === mapVersion) ?? rows[0];

  return (
    detail ?? {
      goldCost: null,
      id: unitType,
      mapVersion: "",
      name: unitType,
      totalGoldCost: null,
      upgradeGroup: null
    }
  );
}

function nullableNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function playerName(battleTag: string) {
  return battleTag.split("#")[0] || battleTag;
}
