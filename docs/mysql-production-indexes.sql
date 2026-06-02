-- Team OZE Legion TD production indexes for a large replay database.
--
-- Run against the app database, for example:
--   mysql --default-character-set=utf8mb4 -h HOST -u USER -p DATABASE_NAME < docs/mysql-production-indexes.sql
--
-- This file is intentionally re-runnable. The helper procedures skip indexes/columns that already exist.
-- Use a migration/admin DB user with ALTER TABLE plus CREATE/ALTER ROUTINE privileges. If your app DB user cannot
-- create routines, run this file as root/admin or apply the CREATE INDEX/ALTER TABLE statements manually.
-- For very large tables, add these during a quiet window or with your host's online-DDL tooling.

DELIMITER $$

DROP PROCEDURE IF EXISTS team_oze_add_index_if_missing $$
CREATE PROCEDURE team_oze_add_index_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_ddl TEXT
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = p_table_name
    LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table_name
      AND index_name = p_index_name
    LIMIT 1
  ) THEN
    SET @team_oze_ddl = p_ddl;
    PREPARE team_oze_stmt FROM @team_oze_ddl;
    EXECUTE team_oze_stmt;
    DEALLOCATE PREPARE team_oze_stmt;
  END IF;
END $$

DROP PROCEDURE IF EXISTS team_oze_add_column_if_missing $$
CREATE PROCEDURE team_oze_add_column_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_ddl TEXT
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = p_table_name
    LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = p_table_name
      AND column_name = p_column_name
    LIMIT 1
  ) THEN
    SET @team_oze_ddl = p_ddl;
    PREPARE team_oze_stmt FROM @team_oze_ddl;
    EXECUTE team_oze_stmt;
    DEALLOCATE PREPARE team_oze_stmt;
  END IF;
END $$

DELIMITER ;

-- Player profile/search hot path.
-- Many app queries normalize battle tags with LOWER(players.battle_tag). This generated column gives the DB
-- something indexable for exact/prefix player lookup, profile refresh candidate selection, and local profile stats.
-- MySQL 8 can usually match LOWER(battle_tag) to this generated column. On MariaDB, check EXPLAIN; if it does not
-- use this index, switch the app predicates from LOWER(battle_tag) to battle_tag_normalized.
CALL team_oze_add_column_if_missing(
  'players',
  'battle_tag_normalized',
  'ALTER TABLE players ADD COLUMN battle_tag_normalized VARCHAR(48) GENERATED ALWAYS AS (LOWER(battle_tag)) STORED'
);

CALL team_oze_add_column_if_missing(
  'players',
  'battle_tag_name_normalized',
  'ALTER TABLE players ADD COLUMN battle_tag_name_normalized VARCHAR(48) GENERATED ALWAYS AS (LOWER(SUBSTRING_INDEX(battle_tag, ''#'', 1))) STORED'
);

CALL team_oze_add_index_if_missing(
  'players',
  'idx_players_battle_tag_normalized_match_player',
  'CREATE INDEX idx_players_battle_tag_normalized_match_player ON players (battle_tag_normalized, match_id, player_id)'
);

CALL team_oze_add_index_if_missing(
  'players',
  'idx_players_battle_tag_name_normalized_match_player',
  'CREATE INDEX idx_players_battle_tag_name_normalized_match_player ON players (battle_tag_name_normalized, match_id, player_id)'
);

-- Useful for GROUP BY battle_tag / DISTINCT battle_tag scans used by the W3C refresh queue.
CALL team_oze_add_index_if_missing(
  'players',
  'idx_players_battle_tag_match_player',
  'CREATE INDEX idx_players_battle_tag_match_player ON players (battle_tag, match_id, player_id)'
);

-- Games ELO slider hot path.
-- The range filter first narrows candidate matches, then checks whether at least one non-FLO player in the match has
-- cached W3C MMR inside the selected range. These match-first covering indexes keep that per-match player lookup small.
CALL team_oze_add_index_if_missing(
  'players',
  'idx_players_match_battle_tag_player',
  'CREATE INDEX idx_players_match_battle_tag_player ON players (match_id, battle_tag, player_id)'
);

CALL team_oze_add_index_if_missing(
  'players',
  'idx_players_match_battle_tag_normalized_player',
  'CREATE INDEX idx_players_match_battle_tag_normalized_player ON players (match_id, battle_tag_normalized, player_id)'
);

-- Exact W3C profile lookups are covered by UNIQUE(normalized_battle_tag). Legion 4v4 MMR is also a scalar column, so
-- this supports future/range-first 4v4 ELO plans. Legion 1v1/2v2 MMR currently lives in w3c_game_mode_stats_json; a true
-- B-tree range index for those modes requires materializing per-mode MMR into columns or a child table.
CALL team_oze_add_index_if_missing(
  'w3c_player_stats',
  'idx_w3c_player_stats_4v4_mmr_normalized',
  'CREATE INDEX idx_w3c_player_stats_4v4_mmr_normalized ON w3c_player_stats (legion_4v4_mmr, normalized_battle_tag)'
);

-- Games page filters by gamemode and sorts newest first.
CALL team_oze_add_index_if_missing(
  'matches',
  'idx_matches_gamemode_started_id',
  'CREATE INDEX idx_matches_gamemode_started_id ON matches (gamemode, started_at, id)'
);

-- General newest-match scans, cron candidate ordering, and date-window profile stats.
CALL team_oze_add_index_if_missing(
  'matches',
  'idx_matches_started_id',
  'CREATE INDEX idx_matches_started_id ON matches (started_at, id)'
);

-- Replay viewer: load all actions of a given match/type ordered by timeline.
-- This supports UNIT_BUILD, UNIT_UPGRADE, UNIT_SEND, PLAYER_ROLL, economy actions, king/presence upgrades, etc.
CALL team_oze_add_index_if_missing(
  'actions',
  'idx_actions_match_type_time_id_player',
  'CREATE INDEX idx_actions_match_type_time_id_player ON actions (match_id, type, time_milis, id, player_id)'
);

-- Player profile/favorites/opening units: start from a specific player in a specific match and action type.
CALL team_oze_add_index_if_missing(
  'actions',
  'idx_actions_match_player_type_time_id',
  'CREATE INDEX idx_actions_match_player_type_time_id ON actions (match_id, player_id, type, time_milis, id)'
);

-- Level-one guide filters level-end records by level_number before joining to actions/matches.
CALL team_oze_add_index_if_missing(
  'records_level_end_player_stats',
  'idx_level_end_level_action',
  'CREATE INDEX idx_level_end_level_action ON records_level_end_player_stats (level_number, action_id)'
);

-- Replay/unit detail lookups search heroes both by id and by techtree_upgrade_id.
CALL team_oze_add_index_if_missing(
  'data_heroes',
  'idx_data_heroes_techtree_upgrade_id',
  'CREATE INDEX idx_data_heroes_techtree_upgrade_id ON data_heroes (techtree_upgrade_id, id)'
);

-- Existing indexes that the app already relies on and should keep:
--   matches.PRIMARY(id)
--   matches.UNIQUE(mm_id)
--   players.PRIMARY(match_id, player_id)
--   actions.PRIMARY(id)
--   records_* .PRIMARY(action_id)
--   data_units.PRIMARY(id, map_version)
--   data_barrack_units.PRIMARY(id)
--   w3c_player_stats.UNIQUE(normalized_battle_tag)
--   w3c_player_season_stats.PRIMARY(normalized_battle_tag, season)

DROP PROCEDURE IF EXISTS team_oze_add_index_if_missing;
DROP PROCEDURE IF EXISTS team_oze_add_column_if_missing;
