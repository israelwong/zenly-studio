-- CreateTable
CREATE TABLE "studio_top_shots" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_top_shots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "studio_top_shots_studio_id_idx" ON "studio_top_shots"("studio_id");

-- AddForeignKey
ALTER TABLE "studio_top_shots" ADD CONSTRAINT "studio_top_shots_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
