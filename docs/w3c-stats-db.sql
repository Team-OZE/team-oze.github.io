-- Team OZE Legion TD W3C stats database schema.
--
-- Run this against the separate W3C stats DB:
--   mysql --default-character-set=utf8mb4 -h HOST -u USER -p W3C_STATS_DATABASE < docs/w3c-stats-db.sql
--
-- The Next app also creates these tables automatically before refreshes, but this file is useful for hosts
-- that prefer explicit SQL setup. Configure the app with W3C_STATS_* env vars so this database is not the
-- same database as the original replay data.

CREATE TABLE IF NOT EXISTS w3c_player_stats (
  battle_tag VARCHAR(64) NOT NULL,
  normalized_battle_tag VARCHAR(64) NOT NULL,
  player_name VARCHAR(64) NULL,
  w3c_season SMALLINT UNSIGNED NULL,
  w3c_gateway SMALLINT UNSIGNED NULL,
  legion_4v4_mmr SMALLINT UNSIGNED NULL,
  legion_4v4_rank INT UNSIGNED NULL,
  legion_4v4_wins INT UNSIGNED NULL,
  legion_4v4_losses INT UNSIGNED NULL,
  legion_4v4_games INT UNSIGNED NULL,
  legion_4v4_winrate DECIMAL(7,6) NULL,
  local_games INT UNSIGNED NOT NULL DEFAULT 0,
  local_wins INT UNSIGNED NOT NULL DEFAULT 0,
  local_losses INT UNSIGNED NOT NULL DEFAULT 0,
  local_last_game_at DATETIME NULL,
  profile_payload_json LONGTEXT NULL,
  w3c_profile_json LONGTEXT NULL,
  w3c_game_mode_stats_json LONGTEXT NULL,
  w3c_race_stats_json LONGTEXT NULL,
  local_stats_json LONGTEXT NULL,
  fetch_error VARCHAR(255) NULL,
  fetched_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (battle_tag),
  UNIQUE KEY idx_w3c_player_stats_normalized (normalized_battle_tag),
  KEY idx_w3c_player_stats_fetched_at (fetched_at),
  KEY idx_w3c_player_stats_local_last_game_at (local_last_game_at),
  KEY idx_w3c_player_stats_4v4_mmr_normalized (legion_4v4_mmr, normalized_battle_tag)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS w3c_player_season_stats (
  battle_tag VARCHAR(64) NOT NULL,
  normalized_battle_tag VARCHAR(64) NOT NULL,
  season SMALLINT UNSIGNED NOT NULL,
  player_name VARCHAR(64) NULL,
  w3c_gateway SMALLINT UNSIGNED NULL,
  season_started_at DATETIME NULL,
  season_ended_at DATETIME NULL,
  legion_4v4_mmr SMALLINT UNSIGNED NULL,
  legion_4v4_rank INT UNSIGNED NULL,
  legion_4v4_wins INT UNSIGNED NULL,
  legion_4v4_losses INT UNSIGNED NULL,
  legion_4v4_games INT UNSIGNED NULL,
  legion_4v4_winrate DECIMAL(7,6) NULL,
  local_games INT UNSIGNED NOT NULL DEFAULT 0,
  local_wins INT UNSIGNED NOT NULL DEFAULT 0,
  local_losses INT UNSIGNED NOT NULL DEFAULT 0,
  local_last_game_at DATETIME NULL,
  season_payload_json LONGTEXT NULL,
  w3c_game_mode_stats_json LONGTEXT NULL,
  w3c_race_stats_json LONGTEXT NULL,
  season_window_json LONGTEXT NULL,
  fetch_error VARCHAR(255) NULL,
  fetched_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (normalized_battle_tag, season),
  KEY idx_w3c_player_season_stats_battle_tag (battle_tag),
  KEY idx_w3c_player_season_stats_fetched_at (fetched_at),
  KEY idx_w3c_player_season_stats_window (season_started_at, season_ended_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
