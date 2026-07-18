-- AlterTable
ALTER TABLE "education_versions" ADD COLUMN     "published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "experience_versions" ADD COLUMN     "published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "technology_versions" ADD COLUMN     "published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "timeline_entry_versions" ADD COLUMN     "published_at" TIMESTAMP(3);
