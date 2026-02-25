-- Migration: add allow_online_authorization to promise share settings
-- Purpose: control whether the "Autorizar" button is shown on the public quote view.
-- Affected: studios, studio_promises

-- studios: default for all promises of the studio
alter table studios
  add column if not exists promise_share_default_allow_online_authorization boolean default true;

comment on column studios.promise_share_default_allow_online_authorization is
  'Si true, el prospecto puede ver el botón Autorizar en la vista pública de cotización y formalizar el apartado en línea.';

-- studio_promises: optional override per promise (null = use studio default)
alter table studio_promises
  add column if not exists share_allow_online_authorization boolean;

comment on column studio_promises.share_allow_online_authorization is
  'Override por promesa: permitir autorización en línea. Null = usar default del estudio.';
