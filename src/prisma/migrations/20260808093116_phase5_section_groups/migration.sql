-- AlterTable
ALTER TABLE "page_sections" ADD COLUMN     "group_id" TEXT;

-- CreateTable
CREATE TABLE "section_groups" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "section_groups_page_id_order_idx" ON "section_groups"("page_id", "order");

-- AddForeignKey
ALTER TABLE "section_groups" ADD CONSTRAINT "section_groups_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "section_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
