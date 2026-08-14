-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3),
    "description" TEXT,
    "credential_id" TEXT,
    "credential_url" TEXT,
    "media_id" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nav_items" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nav_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certifications_order_idx" ON "certifications"("order");

-- CreateIndex
CREATE INDEX "nav_items_order_idx" ON "nav_items"("order");

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
