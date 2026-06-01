import type { RowDataPacket } from "mysql2";
import { getDatabasePool } from "./database";
import {
  cachedW3ChampionsMmrForMode,
  getCachedW3ChampionsMmrByModeMap,
  w3ChampionsGameModeForTeamSize
} from "./playerElo";
import { unitTooltipDetail, unitTooltipDetailById, type UnitTooltipDetail, type UnitTooltipStats } from "./unitTooltipDetails";
import { iconPathForUnit } from "./unitIcons";
import { displayNameForUnit } from "./unitOverrides";
import { waveCreepForLevel, type WaveCreep } from "./waveCreeps";
import type { Player, Team } from "./replayTypes";

export type ReplayBuildUnit = {
  actionId: number;
  playerId: number;
  timeMillis: number;
  removedAtMillis: number | null;
  unitType: string;
  unitName: string;
  locationX: number;
  locationY: number;
  goldCost: number | null;
  totalGoldCost: number | null;
  sellGold: number | null;
  upgradeGroup: string | null;
  iconPath: string;
  description: string | null;
  stats: UnitTooltipStats | null;
  stateChanges: ReplayBuildUnitState[];
};

export type ReplayBuildUnitState = {
  actionId: number;
  timeMillis: number;
  level: number;
  unitType: string;
  unitName: string;
  goldCost: number | null;
  totalGoldCost: number | null;
  sellGold: number | null;
  upgradeGroup: string | null;
  iconPath: string;
  description: string | null;
  stats: UnitTooltipStats | null;
};

export type ReplayPlayerStatSnapshot = {
  actionId: number;
  playerId: number;
  timeMillis: number;
  levelNumber: number;
  gold: number;
  lumber: number;
  income: number;
  leakedAmountCumulative: number;
  bounty: number;
  value: number;
  leaksCaught: number | null;
};

export type ReplayEconomyEvent = {
  actionId: number;
  playerId: number;
  timeMillis: number;
  type: "LUMBER_WISP" | "LUMBER_UPGRADE";
};

export type ReplayResourceEvent = {
  actionId: number;
  playerId: number;
  timeMillis: number;
  type: string;
  goldDelta: number | null;
  lumberDelta: number | null;
  incomeDelta: number | null;
  bountyDelta: number | null;
};

export type ReplayUnitSend = {
  actionId: number;
  playerId: number;
  teamId: number | null;
  timeMillis: number;
  unitType: string;
  unitName: string;
  isAura: boolean | null;
  lumberCost: number | null;
  bounty: number | null;
  income: number | null;
  iconPath: string;
  description: string | null;
  stats: UnitTooltipStats | null;
};

export type ReplayRollUnit = {
  unitType: string;
  unitName: string;
  iconPath: string;
  description: string | null;
  stats: UnitTooltipStats | null;
};

export type ReplayPlayerRoll = {
  actionId: number;
  playerId: number;
  timeMillis: number;
  units: ReplayRollUnit[];
};

export type ReplayKingUpgrade = {
  actionId: number;
  playerId: number;
  teamId: number | null;
  timeMillis: number;
  upgradeType: "ATTACK" | "HP" | "REGEN";
  level: number;
};

export type ReplayTimelineEvent = {
  actionId: number;
  playerId: number;
  timeMillis: number;
  type: string;
  title: string;
  detail: string | null;
};

export type ReplayWaveEvent = {
  level: number;
  startMillis: number;
  endMillis: number | null;
  creepName: string | null;
  creep: WaveCreep | null;
  description: string | null;
  sendSummary: {
    senderCount: number;
    receivingPlayers: number;
    auraCount: number;
    nonAuraCount: number;
  } | null;
};

export type ReplayViewerData = {
  source: string;
  replay: {
    id: number;
    matchId: string;
    startedAt: string;
    finishedAt: string;
    duration: string;
    durationMillis: number;
    gameMode: string;
    mapVersion: string;
    kingSpell: string | null;
    kingSpellUnlockedAtMillis: number | null;
    winningTeamId: number | null;
  };
  teams: Team[];
  buildUnits: ReplayBuildUnit[];
  playerStats: ReplayPlayerStatSnapshot[];
  economyEvents: ReplayEconomyEvent[];
  resourceEvents: ReplayResourceEvent[];
  unitSends: ReplayUnitSend[];
  playerRolls: ReplayPlayerRoll[];
  kingUpgrades: ReplayKingUpgrade[];
  timelineEvents: ReplayTimelineEvent[];
  waveEvents: ReplayWaveEvent[];
};

type ReplayMatchRow = RowDataPacket & {
  id: number;
  mmId: string;
  startedAt: string;
  finishedAt: string;
  winningTeamId: number | null;
  mapVersion: string;
  gameMode: string | null;
  kingSpell: string | null;
};

type ReplayPlayerRow = RowDataPacket & {
  playerId: number;
  battleTag: string;
};

type ReplayDurationRow = RowDataPacket & {
  maxTimeMillis: number | null;
};

type ReplayBuildRow = RowDataPacket & {
  actionId: number;
  playerId: number;
  timeMillis: number;
  unitType: string;
  unitName: string | null;
  locationX: string | number;
  locationY: string | number;
  goldCost: number | null;
  totalGoldCost: number | null;
  sellGold: number | null;
  upgradeGroup: string | null;
};

type ReplayPlayerStatRow = RowDataPacket & {
  actionId: number;
  playerId: number;
  timeMillis: number;
  levelNumber: number;
  gold: number;
  lumber: number;
  income: number;
  leakedAmountCumulative: number;
  bounty: number;
  value: number;
  leaksCaught: number | null;
};

type ReplayEconomyRow = RowDataPacket & {
  actionId: number;
  playerId: number;
  timeMillis: number;
  type: "LUMBER_WISP" | "LUMBER_UPGRADE";
};

type ReplayActionEventRow = RowDataPacket & {
  actionId: number;
  playerId: number;
  timeMillis: number;
};

type ReplayUnitUpgradeRow = RowDataPacket & {
  actionId: number;
  playerId: number;
  timeMillis: number;
  unitType: string;
  unitName: string | null;
  locationX: string | number;
  locationY: string | number;
  goldCost: number | null;
  totalGoldCost: number | null;
  sellGold: number | null;
  upgradeGroup: string | null;
};

type ReplayUnitSellRow = RowDataPacket & {
  actionId: number;
  playerId: number;
  timeMillis: number;
  locationX: string | number;
  locationY: string | number;
};

type ReplayUnitSendRow = RowDataPacket & {
  actionId: number;
  playerId: number;
  timeMillis: number;
  unitType: string;
  unitName: string | null;
  isAura: number | null;
  lumberCost: number | null;
  bounty: number | null;
  income: number | null;
};

type ReplayKingUpgradeRow = RowDataPacket & {
  actionId: number;
  playerId: number;
  timeMillis: number;
  upgradeType: "ATTACK" | "HP" | "REGEN";
  level: number;
};

type ReplayPresenceUpgradeRow = RowDataPacket & {
  actionId: number;
  playerId: number;
  timeMillis: number;
  presenceType: string;
};

type ReplaySendDetailsRow = RowDataPacket & {
  actionId: number;
  playerId: number;
  timeMillis: number;
  receivingPlayers: number;
  auraCount: number;
  nonAuraCount: number;
};

type ReplayRollRow = RowDataPacket & {
  actionId: number;
  playerId: number;
  timeMillis: number;
  item1: string;
  item2: string;
  item3: string;
  item4: string;
  item5: string;
  item6?: string;
};

type UnitDetailRow = RowDataPacket & {
  goldCost: number | null;
  id: string;
  mapVersion: string;
  name: string | null;
  totalGoldCost: number | null;
  upgradeGroup: string | null;
};

type HeroDetailRow = RowDataPacket & {
  goldCost: number | null;
  id: string;
  level: number;
  name: string;
  techtreeUpgradeId: string | null;
  totalGoldCost: number | null;
};

type UnitDetail = {
  goldCost: number | null;
  id: string;
  mapVersion: string;
  name: string;
  totalGoldCost: number | null;
  upgradeGroup: string | null;
};

export async function getReplayViewerData(id: string): Promise<ReplayViewerData | null> {
  const pool = await getDatabasePool();

  if (!pool) {
    throw new Error("Replay database is not configured or does not contain the replay tables");
  }

  const numericId = Number(id);
  const isNumericId = Number.isInteger(numericId) && String(numericId) === id;
  const [matches] = await pool.execute<ReplayMatchRow[]>(
    `SELECT
       m.id,
       m.mm_id AS mmId,
       DATE_FORMAT(m.started_at, '%Y-%m-%d %H:%i:%s') AS startedAt,
       DATE_FORMAT(m.finished_at, '%Y-%m-%d %H:%i:%s') AS finishedAt,
       m.winning_team_id AS winningTeamId,
       COALESCE(gi.map_version, m.map_version) AS mapVersion,
       m.gamemode AS gameMode,
       gi.king_spell AS kingSpell
     FROM matches m
     LEFT JOIN (
       SELECT a.match_id, r.king_spell, r.map_version
       FROM records_game_init r
       INNER JOIN actions a ON a.id = r.action_id
     ) gi ON gi.match_id = m.id
     WHERE ${isNumericId ? "m.id = ?" : "m.mm_id = ?"}
     LIMIT 1`,
    [isNumericId ? numericId : id]
  );
  const match = matches[0];

  if (!match) {
    return null;
  }

  const matchId = Number(match.id);
  const [players] = await pool.execute<ReplayPlayerRow[]>(
    `SELECT player_id AS playerId, battle_tag AS battleTag
     FROM players
     WHERE match_id = ? AND battle_tag <> '' AND battle_tag <> 'FLO'
     ORDER BY player_id`,
    [matchId]
  );
  const [durationRows] = await pool.execute<ReplayDurationRow[]>(
    `SELECT MAX(time_milis) AS maxTimeMillis
     FROM actions
     WHERE match_id = ?`,
    [matchId]
  );
  const mapVersion = match.mapVersion || "";
  const [buildRows] = await pool.execute<ReplayBuildRow[]>(
    `SELECT
       a.id AS actionId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       b.unit_type AS unitType,
       CAST(b.location_x AS CHAR) AS locationX,
       CAST(b.location_y AS CHAR) AS locationY,
       COALESCE((
         SELECT du.name
         FROM data_units du
         WHERE du.id = b.unit_type
         ORDER BY (du.map_version = ?) DESC, du.map_version DESC
         LIMIT 1
       ), (
         SELECT CASE
           WHEN dh.level > 0 THEN CONCAT(dh.name, ' - Level ', dh.level)
           WHEN dh.name = 'ALTAR_OF_HEROES' THEN 'Altar of Heroes'
           ELSE dh.name
         END
         FROM data_heroes dh
         WHERE dh.id = b.unit_type
         LIMIT 1
       )) AS unitName,
       COALESCE((
         SELECT du.gold_cost
         FROM data_units du
         WHERE du.id = b.unit_type
         ORDER BY (du.map_version = ?) DESC, du.map_version DESC
         LIMIT 1
       ), (
         SELECT dh.gold_cost
         FROM data_heroes dh
         WHERE dh.id = b.unit_type
         LIMIT 1
       )) AS goldCost,
       COALESCE((
         SELECT du.total_gold_cost
         FROM data_units du
         WHERE du.id = b.unit_type
         ORDER BY (du.map_version = ?) DESC, du.map_version DESC
         LIMIT 1
       ), (
         SELECT dh.total_gold_cost
         FROM data_heroes dh
         WHERE dh.id = b.unit_type
         LIMIT 1
       )) AS totalGoldCost,
       (
         SELECT du.sell_gold
         FROM data_units du
         WHERE du.id = b.unit_type
         ORDER BY (du.map_version = ?) DESC, du.map_version DESC
         LIMIT 1
       ) AS sellGold,
       COALESCE((
         SELECT du.upgrade_group
         FROM data_units du
         WHERE du.id = b.unit_type
         ORDER BY (du.map_version = ?) DESC, du.map_version DESC
         LIMIT 1
       ), (
         SELECT 'h996'
         FROM data_heroes dh
         WHERE dh.id = b.unit_type AND dh.level > 0
         LIMIT 1
       )) AS upgradeGroup
     FROM records_unit_build b
     INNER JOIN actions a ON a.id = b.action_id
     WHERE a.match_id = ? AND a.type = 'UNIT_BUILD'
     ORDER BY a.time_milis, a.id`,
    [mapVersion, mapVersion, mapVersion, mapVersion, mapVersion, matchId]
  );
  const [playerStatRows] = await pool.execute<ReplayPlayerStatRow[]>(
    `SELECT
       a.id AS actionId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       s.level_number AS levelNumber,
       s.player_gold AS gold,
       s.player_lumber AS lumber,
       s.player_income AS income,
       s.leaked_amount_cum AS leakedAmountCumulative,
       s.player_bounty AS bounty,
       s.player_value AS value,
       s.leaks_caught AS leaksCaught
     FROM records_level_end_player_stats s
     INNER JOIN actions a ON a.id = s.action_id
     WHERE a.match_id = ?
     ORDER BY a.time_milis, a.id`,
    [matchId]
  );
  const [economyRows] = await pool.execute<ReplayEconomyRow[]>(
    `SELECT
       id AS actionId,
       player_id AS playerId,
       time_milis AS timeMillis,
       type
     FROM actions
     WHERE match_id = ? AND type IN ('LUMBER_WISP', 'LUMBER_UPGRADE')
     ORDER BY time_milis, id`,
    [matchId]
  );
  const [challengeRows] = await pool.execute<ReplayActionEventRow[]>(
    `SELECT
       id AS actionId,
       player_id AS playerId,
       time_milis AS timeMillis
     FROM actions
     WHERE match_id = ? AND type = 'CHAMPION_CHALLENGED'
     ORDER BY time_milis, id`,
    [matchId]
  );
  const [unitUpgradeRows] = await pool.execute<ReplayUnitUpgradeRow[]>(
    `SELECT
       a.id AS actionId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       u.unit_type AS unitType,
       CAST(u.location_x AS CHAR) AS locationX,
       CAST(u.location_y AS CHAR) AS locationY,
       COALESCE((
         SELECT du.name
         FROM data_units du
         WHERE du.id = u.unit_type
         ORDER BY (du.map_version = ?) DESC, du.map_version DESC
         LIMIT 1
       ), (
         SELECT CASE
           WHEN dh.level > 0 THEN CONCAT(dh.name, ' - Level ', dh.level)
           WHEN dh.name = 'ALTAR_OF_HEROES' THEN 'Altar of Heroes'
           ELSE dh.name
         END
         FROM data_heroes dh
         WHERE dh.id = u.unit_type
         LIMIT 1
       )) AS unitName,
       COALESCE((
         SELECT du.gold_cost
         FROM data_units du
         WHERE du.id = u.unit_type
         ORDER BY (du.map_version = ?) DESC, du.map_version DESC
         LIMIT 1
       ), (
         SELECT dh.gold_cost
         FROM data_heroes dh
         WHERE dh.id = u.unit_type
         LIMIT 1
       )) AS goldCost,
       COALESCE((
         SELECT du.total_gold_cost
         FROM data_units du
         WHERE du.id = u.unit_type
         ORDER BY (du.map_version = ?) DESC, du.map_version DESC
         LIMIT 1
       ), (
         SELECT dh.total_gold_cost
         FROM data_heroes dh
         WHERE dh.id = u.unit_type
         LIMIT 1
       )) AS totalGoldCost,
       (
         SELECT du.sell_gold
         FROM data_units du
         WHERE du.id = u.unit_type
         ORDER BY (du.map_version = ?) DESC, du.map_version DESC
         LIMIT 1
       ) AS sellGold,
       COALESCE((
         SELECT du.upgrade_group
         FROM data_units du
         WHERE du.id = u.unit_type
         ORDER BY (du.map_version = ?) DESC, du.map_version DESC
         LIMIT 1
       ), (
         SELECT 'h996'
         FROM data_heroes dh
         WHERE dh.id = u.unit_type AND dh.level > 0
         LIMIT 1
       )) AS upgradeGroup
     FROM records_unit_upgrade u
     INNER JOIN actions a ON a.id = u.action_id
     WHERE a.match_id = ? AND a.type = 'UNIT_UPGRADE'
     ORDER BY a.time_milis, a.id`,
    [mapVersion, mapVersion, mapVersion, mapVersion, mapVersion, matchId]
  );
  const [unitSellRows] = await pool.execute<ReplayUnitSellRow[]>(
    `SELECT
       a.id AS actionId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       CAST(s.location_x AS CHAR) AS locationX,
       CAST(s.location_y AS CHAR) AS locationY
     FROM records_unit_sell s
     INNER JOIN actions a ON a.id = s.action_id
     WHERE a.match_id = ? AND a.type = 'UNIT_SELL'
     ORDER BY a.time_milis, a.id`,
    [matchId]
  );
  const [unitSendRows] = await pool.execute<ReplayUnitSendRow[]>(
    `SELECT
       a.id AS actionId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       s.unit_type AS unitType,
       b.name AS unitName,
       b.is_aura AS isAura,
       b.lumber_cost AS lumberCost,
       b.bounty,
       b.income
     FROM records_unit_send s
     INNER JOIN actions a ON a.id = s.action_id
     LEFT JOIN data_barrack_units b ON b.id = s.unit_type
     WHERE a.match_id = ? AND a.type = 'UNIT_SEND'
     ORDER BY a.time_milis, a.id`,
    [matchId]
  );
  const [kingUpgradeRows] = await pool.execute<ReplayKingUpgradeRow[]>(
    `SELECT
       a.id AS actionId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       k.type AS upgradeType,
       k.level
     FROM records_king_upgrade k
     INNER JOIN actions a ON a.id = k.action_id
     WHERE a.match_id = ? AND a.type = 'KING_UPGRADE'
     ORDER BY a.time_milis, a.id`,
    [matchId]
  );
  const [presenceUpgradeRows] = await pool.execute<ReplayPresenceUpgradeRow[]>(
    `SELECT
       a.id AS actionId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       p.type AS presenceType
     FROM records_presence_upgrade p
     INNER JOIN actions a ON a.id = p.action_id
     WHERE a.match_id = ? AND a.type = 'PRESENCE_UPGRADE'
     ORDER BY a.time_milis, a.id`,
    [matchId]
  );
  const [sendDetailsRows] = await pool.execute<ReplaySendDetailsRow[]>(
    `SELECT
       a.id AS actionId,
       a.player_id AS playerId,
       a.time_milis AS timeMillis,
       d.count_receiving_players AS receivingPlayers,
       d.count_auras AS auraCount,
       d.count_non_auras AS nonAuraCount
     FROM records_send_details d
     INNER JOIN actions a ON a.id = d.action_id
     WHERE a.match_id = ? AND a.type = 'SEND_DETAILS'
     ORDER BY a.time_milis, a.id`,
    [matchId]
  );
  const [playerRollRows] = await pool.execute<ReplayRollRow[]>(
    `SELECT
       a.id AS actionId,
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
     WHERE a.match_id = ? AND a.type = 'PLAYER_ROLL'
     ORDER BY a.time_milis, a.id`,
    [matchId]
  );
  const rollUnitDetails = await loadUnitDetails(playerRollRows.flatMap(rollUnitIds), pool);
  const w3cGameMode = w3ChampionsGameModeForTeamSize(Math.ceil(players.length / 2));
  const playerMmrByBattleTag = await getCachedW3ChampionsMmrByModeMap(players.map((player) => player.battleTag));
  const playerList = players.map((player) => ({
    id: Number(player.playerId),
    battleTag: player.battleTag,
    name: playerName(player.battleTag),
    elo: cachedW3ChampionsMmrForMode(playerMmrByBattleTag, player.battleTag, w3cGameMode)
  }));
  const winningTeamId = match.winningTeamId === null ? null : Number(match.winningTeamId);
  const teams = buildTeams(playerList, winningTeamId);
  const durationMillis = replayDurationMillis(match.startedAt, match.finishedAt, Number(durationRows[0]?.maxTimeMillis ?? 0));
  const teamIdByPlayer = teamMap(teams);

  return {
    source: "database",
    replay: {
      id: matchId,
      matchId: match.mmId,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      duration: formatDurationMillis(durationMillis),
      durationMillis,
      gameMode: match.gameMode || "Unknown",
      mapVersion,
      kingSpell: match.kingSpell,
      kingSpellUnlockedAtMillis: kingSpellUnlockedAtMillis(playerStatRows),
      winningTeamId
    },
    teams,
    buildUnits: buildUnitLifecycles(buildRows, unitUpgradeRows, unitSellRows),
    playerStats: playerStatRows.map(playerStatFromRow),
    economyEvents: economyRows.map(economyEventFromRow),
    resourceEvents: buildResourceEvents(buildRows, unitUpgradeRows, unitSellRows, unitSendRows),
    unitSends: unitSendRows.map((row) => unitSendFromRow(row, teamIdByPlayer)),
    playerRolls: playerRollRows.map((row) => playerRollFromRow(row, mapVersion, rollUnitDetails)),
    kingUpgrades: kingUpgradeRows.map((row) => kingUpgradeFromRow(row, teamIdByPlayer)),
    timelineEvents: buildTimelineEvents({
      buildRows,
      challengeRows,
      economyRows,
      kingUpgradeRows,
      presenceUpgradeRows,
      teamIdByPlayer,
      unitSellRows,
      unitSendRows,
      unitUpgradeRows
    }),
    waveEvents: buildWaveEvents(sendDetailsRows, playerStatRows, unitSendRows, {
      buildRows,
      unitSellRows,
      unitUpgradeRows
    })
  };
}

function teamMap(teams: Team[]) {
  const ids = new Map<number, number>();

  teams.forEach((team, index) => {
    for (const player of team.players) {
      ids.set(player.id, index);
    }
  });

  return ids;
}

function buildEventFromRow(row: ReplayBuildRow): ReplayBuildUnit {
  const state = unitStateFromRow(row, 1);

  return {
    actionId: Number(row.actionId),
    playerId: Number(row.playerId),
    timeMillis: Number(row.timeMillis),
    removedAtMillis: null,
    unitType: state.unitType,
    unitName: state.unitName,
    locationX: Number(row.locationX),
    locationY: Number(row.locationY),
    goldCost: state.goldCost,
    totalGoldCost: state.totalGoldCost,
    sellGold: state.sellGold,
    upgradeGroup: state.upgradeGroup,
    iconPath: state.iconPath,
    description: state.description,
    stats: state.stats,
    stateChanges: [state]
  };
}

function buildUnitLifecycles(
  buildRows: ReplayBuildRow[],
  unitUpgradeRows: ReplayUnitUpgradeRow[],
  unitSellRows: ReplayUnitSellRow[]
): ReplayBuildUnit[] {
  const units: ReplayBuildUnit[] = [];
  const openByLocation = new Map<string, ReplayBuildUnit>();
  const events = [
    ...buildRows.map((row) => ({ kind: "build" as const, row })),
    ...unitUpgradeRows.map((row) => ({ kind: "upgrade" as const, row })),
    ...unitSellRows.map((row) => ({ kind: "sell" as const, row }))
  ].sort((a, b) => Number(a.row.timeMillis) - Number(b.row.timeMillis) || Number(a.row.actionId) - Number(b.row.actionId));

  for (const event of events) {
    const key = unitLocationKey(event.row);
    const openUnit = openByLocation.get(key);
    const timeMillis = Number(event.row.timeMillis);

    if (event.kind === "build") {
      if (openUnit && openUnit.removedAtMillis === null) {
        openUnit.removedAtMillis = timeMillis;
        openByLocation.delete(key);
      }

      const unit = buildEventFromRow(event.row);
      units.push(unit);
      openByLocation.set(key, unit);
      continue;
    }

    if (event.kind === "upgrade") {
      if (openUnit && openUnit.removedAtMillis === null) {
        openUnit.stateChanges.push(unitStateFromRow(event.row, openUnit.stateChanges.length + 1));
      }
      continue;
    }

    if (openUnit && openUnit.removedAtMillis === null) {
      openUnit.removedAtMillis = timeMillis;
      openByLocation.delete(key);
    }
  }

  return units;
}

function unitStateFromRow(row: ReplayBuildRow | ReplayUnitUpgradeRow, level: number): ReplayBuildUnitState {
  const unitType = row.unitType;
  const upgradeGroup = "upgradeGroup" in row ? row.upgradeGroup : null;
  const unitName = displayNameForUnit(unitType, row.unitName);
  const tooltipDetail = unitTooltipDetail(unitName);

  return {
    actionId: Number(row.actionId),
    timeMillis: Number(row.timeMillis),
    level,
    unitType,
    unitName,
    goldCost: nullableNumber(row.goldCost),
    totalGoldCost: nullableNumber(row.totalGoldCost),
    sellGold: nullableNumber(row.sellGold),
    upgradeGroup,
    iconPath: iconPathForUnit(unitType, upgradeGroup),
    description: tooltipDetail?.description ?? null,
    stats: tooltipDetail?.stats ?? null
  };
}

function unitLocationKey(row: { playerId: number; locationX: string | number; locationY: string | number }) {
  return `${Number(row.playerId)}:${coordinateKey(row.locationX)}:${coordinateKey(row.locationY)}`;
}

function coordinateKey(value: string | number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(3) : String(value);
}

function soldUnitStatesByActionId(
  buildRows: ReplayBuildRow[],
  unitUpgradeRows: ReplayUnitUpgradeRow[],
  unitSellRows: ReplayUnitSellRow[]
) {
  const soldStates = new Map<number, ReplayBuildUnitState>();
  const openByLocation = new Map<string, ReplayBuildUnitState>();
  const events = [
    ...buildRows.map((row) => ({ kind: "build" as const, row })),
    ...unitUpgradeRows.map((row) => ({ kind: "upgrade" as const, row })),
    ...unitSellRows.map((row) => ({ kind: "sell" as const, row }))
  ].sort((a, b) => Number(a.row.timeMillis) - Number(b.row.timeMillis) || Number(a.row.actionId) - Number(b.row.actionId));

  for (const event of events) {
    const key = unitLocationKey(event.row);

    if (event.kind === "build") {
      openByLocation.set(key, unitStateFromRow(event.row, 1));
      continue;
    }

    if (event.kind === "upgrade") {
      const previous = openByLocation.get(key);
      openByLocation.set(key, unitStateFromRow(event.row, (previous?.level ?? 1) + 1));
      continue;
    }

    const soldState = openByLocation.get(key);
    if (soldState) {
      soldStates.set(Number(event.row.actionId), soldState);
      openByLocation.delete(key);
    }
  }

  return soldStates;
}

function buildResourceEvents(
  buildRows: ReplayBuildRow[],
  unitUpgradeRows: ReplayUnitUpgradeRow[],
  unitSellRows: ReplayUnitSellRow[],
  unitSendRows: ReplayUnitSendRow[]
) {
  const events: ReplayResourceEvent[] = [];
  const soldUnitStateByActionId = soldUnitStatesByActionId(buildRows, unitUpgradeRows, unitSellRows);

  for (const row of buildRows) {
    events.push(resourceEvent(row, "UNIT_BUILD", { goldDelta: negativeNumber(row.goldCost) }));
  }

  for (const row of unitUpgradeRows) {
    events.push(resourceEvent(row, "UNIT_UPGRADE", { goldDelta: negativeNumber(row.goldCost) }));
  }

  for (const row of unitSellRows) {
    const soldState = soldUnitStateByActionId.get(Number(row.actionId));
    events.push(resourceEvent(row, "UNIT_SELL", { goldDelta: nullableNumber(soldState?.sellGold ?? null) }));
  }

  for (const row of unitSendRows) {
    events.push(
      resourceEvent(row, "UNIT_SEND", {
        lumberDelta: negativeNumber(row.lumberCost),
        incomeDelta: nullableNumber(row.income),
        bountyDelta: nullableNumber(row.bounty)
      })
    );
  }

  return events
    .filter((event) => event.goldDelta !== null || event.lumberDelta !== null || event.incomeDelta !== null || event.bountyDelta !== null)
    .sort((a, b) => a.timeMillis - b.timeMillis || a.actionId - b.actionId);
}

function resourceEvent(
  row: { actionId: number; playerId: number; timeMillis: number },
  type: string,
  deltas: Partial<Pick<ReplayResourceEvent, "goldDelta" | "lumberDelta" | "incomeDelta" | "bountyDelta">>
): ReplayResourceEvent {
  return {
    actionId: Number(row.actionId),
    playerId: Number(row.playerId),
    timeMillis: Number(row.timeMillis),
    type,
    goldDelta: deltas.goldDelta ?? null,
    lumberDelta: deltas.lumberDelta ?? null,
    incomeDelta: deltas.incomeDelta ?? null,
    bountyDelta: deltas.bountyDelta ?? null
  };
}

function playerStatFromRow(row: ReplayPlayerStatRow): ReplayPlayerStatSnapshot {
  return {
    actionId: Number(row.actionId),
    playerId: Number(row.playerId),
    timeMillis: Number(row.timeMillis),
    levelNumber: Number(row.levelNumber),
    gold: Number(row.gold),
    lumber: Number(row.lumber),
    income: Number(row.income),
    leakedAmountCumulative: Number(row.leakedAmountCumulative),
    bounty: Number(row.bounty),
    value: Number(row.value),
    leaksCaught: nullableNumber(row.leaksCaught)
  };
}

function economyEventFromRow(row: ReplayEconomyRow): ReplayEconomyEvent {
  return {
    actionId: Number(row.actionId),
    playerId: Number(row.playerId),
    timeMillis: Number(row.timeMillis),
    type: row.type
  };
}

function unitSendFromRow(row: ReplayUnitSendRow, teamIdByPlayer: Map<number, number>): ReplayUnitSend {
  const playerId = Number(row.playerId);
  const tooltipDetail = unitSendTooltipDetail(row.unitType, row.unitName);

  return {
    actionId: Number(row.actionId),
    playerId,
    teamId: teamIdByPlayer.get(playerId) ?? null,
    timeMillis: Number(row.timeMillis),
    unitType: row.unitType,
    unitName: row.unitName || row.unitType,
    isAura: row.isAura === null || row.isAura === undefined ? null : row.isAura === 1,
    lumberCost: nullableNumber(row.lumberCost),
    bounty: nullableNumber(row.bounty),
    income: nullableNumber(row.income),
    iconPath: iconPathForUnit(row.unitType),
    description: tooltipDetail?.description ?? null,
    stats: tooltipDetail?.stats ?? null
  };
}

function unitSendTooltipDetail(unitType: string, unitName: string | null | undefined): UnitTooltipDetail | null {
  const byId = unitTooltipDetailById(unitType);
  if (byId) return byId;

  if (!unitName) return null;

  const direct = unitTooltipDetail(unitName);
  if (direct) return direct;

  for (const part of unitName.split("/")) {
    const detail = unitTooltipDetail(part.trim());
    if (detail) return detail;
  }

  return null;
}

function playerRollFromRow(row: ReplayRollRow, mapVersion: string, unitDetails: Map<string, UnitDetail[]>): ReplayPlayerRoll {
  return {
    actionId: Number(row.actionId),
    playerId: Number(row.playerId),
    timeMillis: Number(row.timeMillis),
    units: rollUnitIds(row).map((unitType) => rollUnit(unitType, mapVersion, unitDetails))
  };
}

function kingUpgradeFromRow(row: ReplayKingUpgradeRow, teamIdByPlayer: Map<number, number>): ReplayKingUpgrade {
  const playerId = Number(row.playerId);

  return {
    actionId: Number(row.actionId),
    playerId,
    teamId: teamIdByPlayer.get(playerId) ?? null,
    timeMillis: Number(row.timeMillis),
    upgradeType: row.upgradeType,
    level: Number(row.level)
  };
}

function kingSpellUnlockedAtMillis(playerStatRows: ReplayPlayerStatRow[]) {
  const unlockRows = playerStatRows.filter((row) => Number(row.levelNumber) >= 3);
  if (!unlockRows.length) return null;
  return Math.min(...unlockRows.map((row) => Number(row.timeMillis)));
}

const WAVE_START_CLUSTER_MILLIS = 2000;

function buildWaveEvents(
  sendDetailsRows: ReplaySendDetailsRow[],
  playerStatRows: ReplayPlayerStatRow[],
  unitSendRows: ReplayUnitSendRow[],
  buildPhaseRows: {
    buildRows: ReplayBuildRow[];
    unitSellRows: ReplayUnitSellRow[];
    unitUpgradeRows: ReplayUnitUpgradeRow[];
  }
): ReplayWaveEvent[] {
  const waveStartGroups = clusterRowsByTime(sendDetailsRows, WAVE_START_CLUSTER_MILLIS);
  const levelEndMillis = new Map<number, number>();
  const buildPhaseActionMillis = [...buildPhaseRows.buildRows, ...buildPhaseRows.unitUpgradeRows, ...buildPhaseRows.unitSellRows]
    .map((row) => Number(row.timeMillis))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  for (const row of playerStatRows) {
    const level = Number(row.levelNumber);
    const timeMillis = Number(row.timeMillis);
    levelEndMillis.set(level, Math.max(levelEndMillis.get(level) ?? 0, timeMillis));
  }

  return waveStartGroups.map((group, index) => {
    const level = index + 1;
    const creep = waveCreepForLevel(level);
    const startMillis = Math.min(...group.map((row) => Number(row.timeMillis)));
    const nextStartMillis =
      index + 1 < waveStartGroups.length ? Math.min(...waveStartGroups[index + 1].map((row) => Number(row.timeMillis))) : Number.POSITIVE_INFINITY;
    const statEndMillis = levelEndMillis.get(level) ?? null;
    const firstBuildPhaseMillis = buildPhaseActionMillis.find((timeMillis) => timeMillis > startMillis && timeMillis < nextStartMillis);
    const previousStartMillis = index > 0 ? Math.min(...waveStartGroups[index - 1].map((row) => Number(row.timeMillis))) : 0;
    const unitSendsForWave = unitSendRows.filter((row) => {
      const timeMillis = Number(row.timeMillis);
      return timeMillis >= previousStartMillis && timeMillis < startMillis;
    });
    const hasUnitSendRows = unitSendsForWave.length > 0;
    const sendSummary = group.length
      ? {
          senderCount: hasUnitSendRows ? new Set(unitSendsForWave.map((row) => Number(row.playerId))).size : 0,
          receivingPlayers: group.reduce((sum, row) => sum + Number(row.receivingPlayers ?? 0), 0),
          auraCount: hasUnitSendRows
            ? unitSendsForWave.filter((row) => row.isAura === 1).length
            : group.reduce((sum, row) => sum + Number(row.auraCount ?? 0), 0),
          nonAuraCount: hasUnitSendRows
            ? unitSendsForWave.filter((row) => row.isAura === 0).length
            : group.reduce((sum, row) => sum + Number(row.nonAuraCount ?? 0), 0)
        }
      : null;

    return {
      level,
      startMillis,
      endMillis:
        statEndMillis !== null && firstBuildPhaseMillis !== undefined && firstBuildPhaseMillis < statEndMillis
          ? firstBuildPhaseMillis
          : statEndMillis,
      creepName: creep?.unitName ?? null,
      creep,
      description: null,
      sendSummary
    };
  });
}

function clusterRowsByTime<T extends { timeMillis: number }>(rows: T[], thresholdMillis: number): T[][] {
  const groups: T[][] = [];

  for (const row of [...rows].sort((a, b) => Number(a.timeMillis) - Number(b.timeMillis))) {
    const current = groups.at(-1);
    const firstTime = current?.[0] ? Number(current[0].timeMillis) : undefined;

    if (!current || firstTime === undefined || Number(row.timeMillis) - firstTime > thresholdMillis) {
      groups.push([row]);
    } else {
      current.push(row);
    }
  }

  return groups;
}

function buildTimelineEvents({
  buildRows,
  challengeRows,
  economyRows,
  kingUpgradeRows,
  presenceUpgradeRows,
  teamIdByPlayer,
  unitSellRows,
  unitSendRows,
  unitUpgradeRows
}: {
  buildRows: ReplayBuildRow[];
  challengeRows: ReplayActionEventRow[];
  economyRows: ReplayEconomyRow[];
  kingUpgradeRows: ReplayKingUpgradeRow[];
  presenceUpgradeRows: ReplayPresenceUpgradeRow[];
  teamIdByPlayer: Map<number, number>;
  unitSellRows: ReplayUnitSellRow[];
  unitSendRows: ReplayUnitSendRow[];
  unitUpgradeRows: ReplayUnitUpgradeRow[];
}) {
  const events: ReplayTimelineEvent[] = [];
  const soldUnitStateByActionId = soldUnitStatesByActionId(buildRows, unitUpgradeRows, unitSellRows);

  for (const row of buildRows) {
    const goldCost = formatGoldCost(row.goldCost);
    events.push(
      timelineEvent(
        row,
        "UNIT_BUILD",
        `Built ${displayNameForUnit(row.unitType, row.unitName)}${goldCost ? ` for ${goldCost}` : ""}`,
        formatLocation(row.locationX, row.locationY)
      )
    );
  }

  for (const row of unitUpgradeRows) {
    events.push(timelineEvent(row, "UNIT_UPGRADE", `Upgraded ${displayNameForUnit(row.unitType, row.unitName)}`, formatLocation(row.locationX, row.locationY)));
  }

  for (const row of unitSellRows) {
    const soldState = soldUnitStateByActionId.get(Number(row.actionId));
    const detail = [
      formatLocation(row.locationX, row.locationY),
      soldState?.sellGold === null || soldState?.sellGold === undefined ? null : `${soldState.sellGold} gold returned`
    ]
      .filter(Boolean)
      .join(" | ");
    events.push(timelineEvent(row, "UNIT_SELL", soldState ? `Sold ${soldState.unitName}` : "Sold unit", detail || null));
  }

  for (const row of unitSendRows) {
    const detail = [
      nullableNumber(row.lumberCost) === null ? null : `${row.lumberCost} lumber`,
      nullableNumber(row.income) === null ? null : `+${row.income} income`,
      nullableNumber(row.bounty) === null ? null : `${row.bounty} bounty`
    ]
      .filter(Boolean)
      .join(" | ");
    events.push(timelineEvent(row, "UNIT_SEND", `Sent ${row.unitName ?? row.unitType}`, detail || null));
  }

  for (const row of economyRows) {
    events.push(
      timelineEvent(
        row,
        row.type,
        row.type === "LUMBER_WISP" ? "Added lumber wisp" : "Upgraded lumber",
        null
      )
    );
  }

  for (const row of challengeRows) {
    events.push(timelineEvent(row, "CHAMPION_CHALLENGED", "Challenged champion", null));
  }

  const previousKingUpgradeLevelByTeamAndType = new Map<string, number>();
  const sortedKingUpgradeRows = [...kingUpgradeRows].sort(
    (a, b) => Number(a.timeMillis) - Number(b.timeMillis) || Number(a.actionId) - Number(b.actionId)
  );

  for (const row of sortedKingUpgradeRows) {
    const teamId = teamIdByPlayer.get(Number(row.playerId));
    const key = `${teamId ?? `player:${Number(row.playerId)}`}:${row.upgradeType}`;
    const previousLevel = previousKingUpgradeLevelByTeamAndType.get(key) ?? 0;
    const currentLevel = Number(row.level);
    const increment = currentLevel - previousLevel;
    previousKingUpgradeLevelByTeamAndType.set(key, currentLevel);
    events.push(timelineEvent(row, "KING_UPGRADE", kingUpgradeTimelineTitle(row.upgradeType, increment), null));
  }

  for (const row of presenceUpgradeRows) {
    events.push(timelineEvent(row, "PRESENCE_UPGRADE", `${formatEnumLabel(row.presenceType)} presence`, null));
  }

  return events.sort((a, b) => a.timeMillis - b.timeMillis || a.actionId - b.actionId);
}

function timelineEvent(
  row: { actionId: number; playerId: number; timeMillis: number },
  type: string,
  title: string,
  detail: string | null
): ReplayTimelineEvent {
  return {
    actionId: Number(row.actionId),
    playerId: Number(row.playerId),
    timeMillis: Number(row.timeMillis),
    type,
    title,
    detail
  };
}

function kingUpgradeTimelineTitle(upgradeType: ReplayKingUpgradeRow["upgradeType"], increment: number) {
  const label = upgradeType === "HP" ? "HP" : formatEnumLabel(upgradeType);
  if (Number.isFinite(increment) && increment > 0) {
    return `King ${label} +${increment}`;
  }
  return `King ${label} Upgrade`;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatLocation(x: string | number, y: string | number) {
  return `@ ${formatCoordinate(x)}, ${formatCoordinate(y)}`;
}

function formatGoldCost(value: number | string | null) {
  const numericValue = nullableNumber(value);
  if (numericValue === null) return "";
  return `${formatCoordinate(numericValue)} gold`;
}

function formatCoordinate(value: string | number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, "");
}

async function loadUnitDetails(unitIds: string[], pool: NonNullable<Awaited<ReturnType<typeof getDatabasePool>>>) {
  const uniqueUnitIds = [...new Set(unitIds.filter(Boolean))];
  const detailsByUnitId = new Map<string, UnitDetail[]>();

  if (uniqueUnitIds.length === 0) {
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
    appendUnitDetail(detailsByUnitId, row.id, {
      goldCost: nullableNumber(row.goldCost),
      id: row.id,
      mapVersion: row.mapVersion,
      name: row.name ?? row.id,
      totalGoldCost: nullableNumber(row.totalGoldCost),
      upgradeGroup: row.upgradeGroup
    });
  }

  const [heroRows] = await pool.query<HeroDetailRow[]>(
    `SELECT
       id,
       name,
       level,
       techtree_upgrade_id AS techtreeUpgradeId,
       gold_cost AS goldCost,
       total_gold_cost AS totalGoldCost
     FROM data_heroes
     WHERE id IN (?) OR techtree_upgrade_id IN (?)
     ORDER BY id`,
    [uniqueUnitIds, uniqueUnitIds]
  );

  for (const row of heroRows) {
    const heroName =
      row.level > 0 ? `${row.name} - Level ${row.level}` : row.name === "ALTAR_OF_HEROES" ? "Altar of Heroes" : row.name;
    const detail = {
      goldCost: nullableNumber(row.goldCost),
      id: row.id,
      mapVersion: "",
      name: heroName,
      totalGoldCost: nullableNumber(row.totalGoldCost),
      upgradeGroup: row.level > 0 ? "h996" : null
    };

    appendUnitDetail(detailsByUnitId, row.id, detail);
    if (row.techtreeUpgradeId) {
      appendUnitDetail(detailsByUnitId, row.techtreeUpgradeId, { ...detail, id: row.techtreeUpgradeId });
    }
  }

  return detailsByUnitId;
}

function appendUnitDetail(detailsByUnitId: Map<string, UnitDetail[]>, unitType: string, detail: UnitDetail) {
  const rowsForUnit = detailsByUnitId.get(unitType) ?? [];
  rowsForUnit.push(detail);
  detailsByUnitId.set(unitType, rowsForUnit);
}

function rollUnitIds(row: ReplayRollRow) {
  return [row.item1, row.item2, row.item3, row.item4, row.item5, row.item6].filter(Boolean) as string[];
}

function rollUnit(unitType: string, mapVersion: string, unitDetails: Map<string, UnitDetail[]>): ReplayRollUnit {
  const detail = unitDetail(unitType, mapVersion, unitDetails);
  const unitName = displayNameForUnit(unitType, detail.name);
  const tooltipDetail = unitTooltipDetail(unitName);

  return {
    iconPath: iconPathForUnit(unitType, detail.upgradeGroup),
    unitName,
    unitType,
    description: tooltipDetail?.description ?? null,
    stats: tooltipDetail?.stats ?? null
  };
}

function unitDetail(unitType: string, mapVersion: string, unitDetails: Map<string, UnitDetail[]>): UnitDetail {
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

function buildTeams(players: Player[], winningTeamId: number | null): Team[] {
  const splitAt = Math.ceil(players.length / 2);

  return [
    {
      id: 0,
      result: winningTeamId === null ? "unknown" : winningTeamId === 0 ? "win" : "loss",
      players: players.slice(0, splitAt)
    },
    {
      id: 1,
      result: winningTeamId === null ? "unknown" : winningTeamId === 1 ? "win" : "loss",
      players: players.slice(splitAt)
    }
  ];
}

function replayDurationMillis(startedAt: string, finishedAt: string, maxActionMillis: number) {
  return maxActionMillis > 0 ? maxActionMillis : secondsBetween(startedAt, finishedAt) * 1000;
}

function secondsBetween(startedAt: string, finishedAt: string) {
  const start = Date.parse(`${startedAt.replace(" ", "T")}Z`);
  const finish = Date.parse(`${finishedAt.replace(" ", "T")}Z`);
  return Math.max(0, Math.round((finish - start) / 1000));
}

function formatDurationMillis(totalMillis: number) {
  const totalSeconds = Math.floor(totalMillis / 1000);
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = Math.floor(totalMinutes % 60).toString().padStart(2, "0");
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours}:${minutes}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

function nullableNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function negativeNumber(value: number | string | null) {
  const numberValue = nullableNumber(value);
  return numberValue === null ? null : -numberValue;
}

function playerName(battleTag: string) {
  return battleTag.split("#")[0] || battleTag;
}
