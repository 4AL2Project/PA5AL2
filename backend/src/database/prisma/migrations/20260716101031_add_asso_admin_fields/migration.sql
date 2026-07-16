-- AlterTable
ALTER TABLE "Association" ADD COLUMN     "agrement_numero" TEXT,
ADD COLUMN     "agrement_valide" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blacklisted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AssociationNote" (
    "note_id" TEXT NOT NULL,
    "association_id" TEXT NOT NULL,
    "admin_email" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssociationNote_pkey" PRIMARY KEY ("note_id")
);

-- CreateTable
CREATE TABLE "AssociationLog" (
    "log_id" TEXT NOT NULL,
    "association_id" TEXT NOT NULL,
    "admin_email" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssociationLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE INDEX "AssociationNote_association_id_created_at_idx" ON "AssociationNote"("association_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "AssociationLog_association_id_created_at_idx" ON "AssociationLog"("association_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "AssociationNote" ADD CONSTRAINT "AssociationNote_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "Association"("association_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssociationLog" ADD CONSTRAINT "AssociationLog_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "Association"("association_id") ON DELETE CASCADE ON UPDATE CASCADE;
