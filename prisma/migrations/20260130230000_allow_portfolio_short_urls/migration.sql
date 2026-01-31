-- Allow portfolio short URLs: promise_id and post_id can both be NULL (original_url points to ?portfolio=slug)
ALTER TABLE "studio_short_urls"
  DROP CONSTRAINT IF EXISTS "studio_short_urls_promise_or_post_check";

ALTER TABLE "studio_short_urls"
  ADD CONSTRAINT "studio_short_urls_promise_or_post_check"
  CHECK (
    ("promise_id" IS NOT NULL AND "post_id" IS NULL) OR
    ("promise_id" IS NULL AND "post_id" IS NOT NULL) OR
    ("promise_id" IS NULL AND "post_id" IS NULL)
  );
