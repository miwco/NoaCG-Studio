-- ── documents.kind grows 'graphic' (the graphics LIBRARY sync kind). ─────────────────────────
-- docs/SAVED_CONTENT_MODEL.md: every durably saved graphic is one GraphicDoc record with a
-- stable uuid; packages (kind 'packet') become folders referencing them by id. Clients that
-- ship the library migrate embedded packet graphics into these rows on read.

alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents add constraint documents_kind_check
  check (kind in ('packet', 'look', 'project', 'brand', 'show', 'video', 'graphic'));
