-- CreateTable: studio_item_links (vínculos padre-hijo entre ítems del catálogo)
-- Permite que al agregar un servicio "Padre" se sugieran/agreguen automáticamente los "Hijos" vinculados.
create table if not exists "studio_item_links" (
    "id" text not null,
    "studio_id" text not null,
    "source_item_id" text not null,
    "linked_item_id" text not null,
    "order" integer not null default 0,
    "created_at" timestamp(3) not null default current_timestamp,
    "updated_at" timestamp(3) not null,
    constraint "studio_item_links_pkey" primary key ("id")
);

-- FK: studio -> studio_item_links
alter table "studio_item_links" add constraint "studio_item_links_studio_id_fkey"
    foreign key ("studio_id") references "studios"("id") on delete cascade on update cascade;

-- FK: source_item (padre) -> studio_items
alter table "studio_item_links" add constraint "studio_item_links_source_item_id_fkey"
    foreign key ("source_item_id") references "studio_items"("id") on delete cascade on update cascade;

-- FK: linked_item (hijo) -> studio_items
alter table "studio_item_links" add constraint "studio_item_links_linked_item_id_fkey"
    foreign key ("linked_item_id") references "studio_items"("id") on delete cascade on update cascade;

-- Unicidad: un mismo par (studio, padre, hijo) una sola vez
create unique index "studio_item_links_studio_id_source_item_id_linked_item_id_key"
    on "studio_item_links"("studio_id", "source_item_id", "linked_item_id");

create index "studio_item_links_studio_id_idx" on "studio_item_links"("studio_id");
create index "studio_item_links_source_item_id_idx" on "studio_item_links"("source_item_id");
