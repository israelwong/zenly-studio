-- Migration: Create studio_calendar and studio_calendar_participants
-- Plan: .cursor/docs/plans/01-calendar-unification-master-plan.md
-- Fase 1: Esquema Calendario Maestro

-- =============================================================================
-- studio_calendar
-- =============================================================================
CREATE TABLE IF NOT EXISTS studio_calendar (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  studio_id            TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  created_by_user_id   TEXT REFERENCES studio_users(id) ON DELETE SET NULL,
  start_at             TIMESTAMPTZ NOT NULL,
  end_at               TIMESTAMPTZ NOT NULL,
  type                 TEXT NOT NULL,
  source_id            TEXT NOT NULL,
  event_id             TEXT,
  promise_id           TEXT,
  scheduler_task_id    TEXT REFERENCES studio_scheduler_event_tasks(id) ON DELETE SET NULL,
  metadata             JSONB,
  status               TEXT NOT NULL DEFAULT 'active',
  google_event_id      TEXT,
  google_sync_id       TEXT,
  last_synced_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_studio_calendar_end_after_start CHECK (end_at > start_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_calendar_source_type ON studio_calendar(source_id, type);
CREATE INDEX IF NOT EXISTS idx_studio_calendar_studio_dates ON studio_calendar(studio_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_studio_calendar_studio_type ON studio_calendar(studio_id, type);
CREATE INDEX IF NOT EXISTS idx_studio_calendar_event_id ON studio_calendar(event_id);
CREATE INDEX IF NOT EXISTS idx_studio_calendar_promise_id ON studio_calendar(promise_id);
CREATE INDEX IF NOT EXISTS idx_studio_calendar_scheduler_task_id ON studio_calendar(scheduler_task_id);
CREATE INDEX IF NOT EXISTS idx_studio_calendar_google_sync_id ON studio_calendar(google_sync_id);

COMMENT ON TABLE studio_calendar IS 'Calendario Maestro: entidad unificada para citas, eventos, tareas y recordatorios';
COMMENT ON COLUMN studio_calendar.type IS 'PROMISE | EVENT | AGENDA | SCHEDULER_TASK | REMINDER | SCHEDULER_REMINDER | EVENT_TASK | NOTIFICATION';

-- =============================================================================
-- studio_calendar_participants
-- =============================================================================
CREATE TABLE IF NOT EXISTS studio_calendar_participants (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  calendar_id    TEXT NOT NULL REFERENCES studio_calendar(id) ON DELETE CASCADE,
  user_id        TEXT REFERENCES user_studio_roles(id) ON DELETE CASCADE,
  crew_member_id TEXT REFERENCES studio_crew_members(id) ON DELETE CASCADE,
  role           TEXT DEFAULT 'invitee',
  status         TEXT DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_participant_has_identity CHECK (user_id IS NOT NULL OR crew_member_id IS NOT NULL)
);

-- Unique: un usuario por calendario (user_id no nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_participants_calendar_user
  ON studio_calendar_participants(calendar_id, user_id) WHERE user_id IS NOT NULL;

-- Unique: un crew_member por calendario (crew_member_id no nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_participants_calendar_crew
  ON studio_calendar_participants(calendar_id, crew_member_id) WHERE crew_member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_participants_calendar_id ON studio_calendar_participants(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_participants_user_id ON studio_calendar_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_participants_crew_member_id ON studio_calendar_participants(crew_member_id);

COMMENT ON TABLE studio_calendar_participants IS 'Multi-staff: múltiples invitados por evento/tarea del calendario';
