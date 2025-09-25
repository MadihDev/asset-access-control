/*
  Warnings:

  - You are about to drop the column `cityId` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_cityId_fkey";

-- DropIndex
DROP INDEX "idx_access_logs_city_ts";

-- DropIndex
DROP INDEX "idx_addresses_city";

-- DropIndex
DROP INDEX "idx_users_city";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "cityId";
