-- Asignación de personal (crew) a tareas del scheduler (tareas manuales sin ítem de cotización)
alter table "studio_scheduler_event_tasks"
  add column if not exists "assigned_to_crew_member_id" text;

create index if not exists "studio_scheduler_event_tasks_assigned_to_crew_member_id_idx"
  on "studio_scheduler_event_tasks" ("assigned_to_crew_member_id");

alter table "studio_scheduler_event_tasks"
  add constraint "studio_scheduler_event_tasks_assigned_to_crew_member_id_fkey"
  foreign key ("assigned_to_crew_member_id")
  references "studio_crew_members" ("id")
  on delete set null
  on update no action;
