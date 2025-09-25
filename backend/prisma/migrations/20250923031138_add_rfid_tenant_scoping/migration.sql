-- AlterTable
ALTER TABLE "rfid_keys" ADD COLUMN     "projectCityId" TEXT;

-- CreateIndex
CREATE INDEX "idx_rfid_keys_project_city" ON "rfid_keys"("projectCityId");

-- AddForeignKey
ALTER TABLE "rfid_keys" ADD CONSTRAINT "rfid_keys_projectCityId_fkey" FOREIGN KEY ("projectCityId") REFERENCES "project_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
