/*
  Warnings:

  - You are about to drop the column `deviceId_new` on the `locks` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "locks" DROP CONSTRAINT "locks_deviceId_new_fkey";

-- DropIndex
DROP INDEX "idx_locks_device";

-- AlterTable
ALTER TABLE "locks" DROP COLUMN "deviceId_new",
ADD COLUMN     "hardwareDeviceID" TEXT;

-- CreateIndex
CREATE INDEX "idx_locks_device" ON "locks"("hardwareDeviceID");

-- AddForeignKey
ALTER TABLE "locks" ADD CONSTRAINT "locks_hardwareDeviceID_fkey" FOREIGN KEY ("hardwareDeviceID") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
