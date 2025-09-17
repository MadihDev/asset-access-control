-- AlterTable
ALTER TABLE "access_logs" ADD COLUMN     "cityId" TEXT;

-- CreateIndex
CREATE INDEX "idx_access_logs_city_ts" ON "access_logs"("cityId", "timestamp");

-- CreateIndex
CREATE INDEX "idx_access_logs_result" ON "access_logs"("result");

-- CreateIndex
CREATE INDEX "idx_access_logs_user" ON "access_logs"("userId");

-- CreateIndex
CREATE INDEX "idx_access_logs_lock" ON "access_logs"("lockId");
