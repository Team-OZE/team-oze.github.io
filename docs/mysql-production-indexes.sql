-- Team OZE Legion TD production indexes for the original replay database.
--
-- Run this file against the replay DB only:
--   mysql --default-character-set=utf8mb4 -h HOST -u USER -p REPLAY_DATABASE < docs/mysql-production-indexes.sql
--
-- This intentionally does not add columns and does not create W3C cache/profile tables.
-- W3C player profile storage belongs in a separate database; see docs/w3c-stats-db.sql.
-- The helper procedure makes this file re-runnable.

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

DELIMITER ;

-- Games page newest-game scans and filters.
CALL team_oze_add_index_if_missing(
  'matches',
  'idx_matches_gamemode_started_id',
  'CREATE INDEX idx_matches_gamemode_started_id ON matches (gamemode, started_at, id)'
);

CALL team_oze_add_index_if_missing(
  'matches',
  'idx_matches_started_id',
  'CREATE INDEX idx_matches_started_id ON matches (started_at, id)'
);

-- Player roster lookups for games, ELO range filtering, profile candidate discovery, and player search.
CALL team_oze_add_index_if_missing(
  'players',
  'idx_players_match_battle_tag_player',
  'CREATE INDEX idx_players_match_battle_tag_player ON players (match_id, battle_tag, player_id)'
);

CALL team_oze_add_index_if_missing(
  'players',
  'idx_players_battle_tag_match_player',
  'CREATE INDEX idx_players_battle_tag_match_player ON players (battle_tag, match_id, player_id)'
);

-- Replay viewer: load all actions of a given match/type ordered by timeline.
CALL team_oze_add_index_if_missing(
  'actions',
  'idx_actions_match_type_time_id_player',
  'CREATE INDEX idx_actions_match_type_time_id_player ON actions (match_id, type, time_milis, id, player_id)'
);

-- Player profile/favorites/opening units: start from a specific player in a match and action type.
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

-- Existing original-table keys that the app also relies on and should keep:
--   matches.PRIMARY(id)
--   matches.UNIQUE(mm_id)
--   players.PRIMARY(match_id, player_id)
--   actions.PRIMARY(id)
--   records_* .PRIMARY(action_id)
--   data_units.PRIMARY(id, map_version)
--   data_barrack_units.PRIMARY(id)

DROP PROCEDURE IF EXISTS team_oze_add_index_if_missing;
