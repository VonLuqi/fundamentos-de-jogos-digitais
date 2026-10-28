-- MySQL 8 / MariaDB 10.5+ (HostGator). Idempotente.
-- Estado de O Despertar. Acesso só pelo PHP, sem RLS.
-- Sem DELETE, UPDATE, DROP, TRUNCATE ou MODIFY COLUMN.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS despertar_states (
  user_id INT NOT NULL,
  souls DECIMAL(38, 2) NOT NULL DEFAULT 0.00,
  obols DECIMAL(38, 2) NOT NULL DEFAULT 0.00,
  mnemosyne DECIMAL(38, 2) NOT NULL DEFAULT 0.00,
  lifetime_souls DECIMAL(38, 2) NOT NULL DEFAULT 0.00,
  run_souls DECIMAL(38, 2) NOT NULL DEFAULT 0.00,
  prestige_count INT NOT NULL DEFAULT 0,
  generators_state JSON NULL,
  shiny_counts JSON NULL,
  gold_counts JSON NULL,
  upgrades_state JSON NULL,
  talents_state JSON NULL,
  edu_logs_seen JSON NULL,
  milestones JSON NULL,
  stats JSON NULL,
  verdicts INT NOT NULL DEFAULT 0,
  juizo_best_streak INT NOT NULL DEFAULT 0,
  juizo_current_streak INT NOT NULL DEFAULT 0,
  juizo_milestones_claimed JSON NULL,
  verdict_purchases JSON NULL,
  juizo_run JSON NULL,
  last_sync_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  KEY despertar_states_juizo_best_idx (juizo_best_streak),
  KEY despertar_states_prestige_idx (prestige_count),
  KEY despertar_states_lifetime_souls_idx (lifetime_souls),
  CONSTRAINT despertar_states_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
