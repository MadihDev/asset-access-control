/*
  Clean Slate Migration: Location Hierarchy Implementation
  
  This migration implements the Address → Locations → Locks hierarchy.
  We're using a clean slate approach - all existing locks, permissions, 
  access logs, and RFID keys will be removed and recreated with the new structure.
  
  Only essential data is preserved: users, addresses, cities, projects.
*/

-- Step 1: Clean up existing data (Clean Slate Approach)
-- Delete all dependent data in the correct order to avoid foreign key constraints

-- Clear access logs first (depends on locks, rfid_keys, users)
DELETE FROM "access_logs";

-- Clear user permissions (depends on locks and users)
DELETE FROM "user_permissions";

-- Clear RFID keys (depends on users)
DELETE FROM "rfid_keys";

-- Clear locks (depends on addresses)
DELETE FROM "locks";

-- Step 2: Drop existing constraints and indexes
-- DropForeignKey
ALTER TABLE "locks" DROP CONSTRAINT "locks_addressId_fkey";

-- DropIndex
DROP INDEX "idx_locks_address";

-- Step 3: Modify locks table structure
-- AlterTable - since we cleared all data, we can safely modify the structure
ALTER TABLE "locks" DROP COLUMN "addressId",
ADD COLUMN     "locationId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "addressId" TEXT NOT NULL,
    "projectCityId" TEXT,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_locations_address" ON "locations"("addressId");

-- CreateIndex
CREATE INDEX "idx_locations_project_city" ON "locations"("projectCityId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_locations_name_address" ON "locations"("name", "addressId");

-- CreateIndex
CREATE INDEX "idx_locks_location" ON "locks"("locationId");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_projectCityId_fkey" FOREIGN KEY ("projectCityId") REFERENCES "project_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locks" ADD CONSTRAINT "locks_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
