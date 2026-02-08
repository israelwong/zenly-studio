-- Fase 1 Plan Maestro: Entidad de Locaciones y Multimedia
-- Crea studio_locations, studio_location_media y añade location_media_bytes a studio_storage_usage.
-- Relaciones: onDelete Cascade para limpiar multimedia al borrar locación.

-- CreateTable: studio_locations
create table if not exists "studio_locations" (
    "id" text not null,
    "studio_id" text not null,
    "name" text not null,
    "address" text,
    "maps_link" text,
    "phone" text,
    "tags" text[] default array[]::text[],
    "created_at" timestamp(3) not null default current_timestamp,
    "updated_at" timestamp(3) not null,

    constraint "studio_locations_pkey" primary key ("id")
);

-- CreateTable: studio_location_media
create table if not exists "studio_location_media" (
    "id" text not null,
    "location_id" text not null,
    "studio_id" text not null,
    "file_url" text not null,
    "file_type" text not null,
    "filename" text not null,
    "storage_bytes" bigint not null,
    "mime_type" text not null,
    "dimensions" jsonb,
    "duration_seconds" integer,
    "display_order" integer not null default 0,
    "alt_text" text,
    "thumbnail_url" text,
    "storage_path" text not null,
    "created_at" timestamp(3) not null default current_timestamp,
    "updated_at" timestamp(3) not null,

    constraint "studio_location_media_pkey" primary key ("id")
);

-- AddForeignKey
alter table "studio_locations" add constraint "studio_locations_studio_id_fkey"
    foreign key ("studio_id") references "studios"("id") on delete cascade on update cascade;

alter table "studio_location_media" add constraint "studio_location_media_location_id_fkey"
    foreign key ("location_id") references "studio_locations"("id") on delete cascade on update cascade;

alter table "studio_location_media" add constraint "studio_location_media_studio_id_fkey"
    foreign key ("studio_id") references "studios"("id") on delete cascade on update cascade;

-- CreateIndex
create index if not exists "studio_locations_studio_id_idx" on "studio_locations"("studio_id");
create index if not exists "studio_locations_studio_id_tags_idx" on "studio_locations"("studio_id", "tags");

create index if not exists "studio_location_media_location_id_idx" on "studio_location_media"("location_id");
create index if not exists "studio_location_media_studio_id_idx" on "studio_location_media"("studio_id");
create index if not exists "studio_location_media_display_order_idx" on "studio_location_media"("display_order");
create index if not exists "studio_location_media_storage_bytes_idx" on "studio_location_media"("storage_bytes");

-- AlterTable: cuota de storage para multimedia de locaciones
alter table "studio_storage_usage"
    add column if not exists "location_media_bytes" bigint not null default 0;
