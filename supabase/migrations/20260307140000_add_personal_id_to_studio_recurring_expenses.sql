-- add personal_id to studio_recurring_expenses
-- purpose: associate recurring expense with a crew member (optional)
-- affected: studio_recurring_expenses
-- references: studio_crew_members(id)

comment on table studio_recurring_expenses is 'Recurring expenses; optional link to crew member via personal_id.';

alter table studio_recurring_expenses
  add column if not exists personal_id text;

comment on column studio_recurring_expenses.personal_id is 'Optional crew member (studio_crew_members.id) this expense is tied to.';

alter table studio_recurring_expenses
  add constraint studio_recurring_expenses_personal_id_fkey
  foreign key (personal_id) references studio_crew_members(id) on delete set null;

create index if not exists ix_studio_recurring_expenses_personal_id
  on studio_recurring_expenses(personal_id);
