-- CreateTable
CREATE TABLE "OrderActivity" (
    "activity_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderActivity_pkey" PRIMARY KEY ("activity_id")
);

-- CreateIndex
CREATE INDEX "OrderActivity_order_id_created_at_idx" ON "OrderActivity"("order_id", "created_at");

-- AddForeignKey
ALTER TABLE "OrderActivity" ADD CONSTRAINT "OrderActivity_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderActivity" ADD CONSTRAINT "OrderActivity_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
