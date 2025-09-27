-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('RFID_READER', 'LOCK_CONTROLLER', 'GATEWAY', 'SENSOR');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR');

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL DEFAULT 'RFID_READER',
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "firmwareVersion" TEXT,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3),
    "lastPing" TIMESTAMP(3),
    "batteryLevel" INTEGER,
    "signalStrength" INTEGER,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "pingInterval" INTEGER NOT NULL DEFAULT 300,
    "configuration" JSONB,
    "metadata" JSONB,
    "locationId" TEXT,
    "projectCityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_commands" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "parameters" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "response" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_health_metrics" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceId_key" ON "devices"("deviceId");

-- CreateIndex
CREATE INDEX "idx_devices_status" ON "devices"("status");

-- CreateIndex
CREATE INDEX "idx_devices_online" ON "devices"("isOnline");

-- CreateIndex
CREATE INDEX "idx_devices_location" ON "devices"("locationId");

-- CreateIndex
CREATE INDEX "idx_devices_project_city" ON "devices"("projectCityId");

-- CreateIndex
CREATE INDEX "idx_devices_type" ON "devices"("deviceType");

-- CreateIndex
CREATE INDEX "idx_device_commands_device" ON "device_commands"("deviceId");

-- CreateIndex
CREATE INDEX "idx_device_commands_status" ON "device_commands"("status");

-- CreateIndex
CREATE INDEX "idx_device_health_device" ON "device_health_metrics"("deviceId");

-- CreateIndex
CREATE INDEX "idx_device_health_timestamp" ON "device_health_metrics"("timestamp");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_projectCityId_fkey" FOREIGN KEY ("projectCityId") REFERENCES "project_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_health_metrics" ADD CONSTRAINT "device_health_metrics_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add relationship between devices and locks
ALTER TABLE "locks" ADD COLUMN "deviceId_new" TEXT;
CREATE INDEX "idx_locks_device" ON "locks"("deviceId_new");
ALTER TABLE "locks" ADD CONSTRAINT "locks_deviceId_new_fkey" FOREIGN KEY ("deviceId_new") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;