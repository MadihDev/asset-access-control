-- AlterTable
ALTER TABLE "access_logs" ADD COLUMN     "projectCityId" TEXT;

-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "projectCityId" TEXT;

-- AlterTable
ALTER TABLE "locks" ADD COLUMN     "projectCityId" TEXT;

-- AlterTable
ALTER TABLE "user_permissions" ADD COLUMN     "projectCityId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "projectCityId" TEXT;

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_cities" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_name_key" ON "projects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "idx_project_cities_project" ON "project_cities"("projectId");

-- CreateIndex
CREATE INDEX "idx_project_cities_city" ON "project_cities"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_project_cities_project_city" ON "project_cities"("projectId", "cityId");

-- CreateIndex
CREATE INDEX "idx_access_logs_project_city_ts" ON "access_logs"("projectCityId", "timestamp");

-- CreateIndex
CREATE INDEX "idx_addresses_project_city" ON "addresses"("projectCityId");

-- CreateIndex
CREATE INDEX "idx_locks_project_city" ON "locks"("projectCityId");

-- CreateIndex
CREATE INDEX "idx_user_permissions_project_city" ON "user_permissions"("projectCityId");

-- CreateIndex
CREATE INDEX "idx_users_project_city" ON "users"("projectCityId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_projectCityId_fkey" FOREIGN KEY ("projectCityId") REFERENCES "project_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_projectCityId_fkey" FOREIGN KEY ("projectCityId") REFERENCES "project_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locks" ADD CONSTRAINT "locks_projectCityId_fkey" FOREIGN KEY ("projectCityId") REFERENCES "project_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_projectCityId_fkey" FOREIGN KEY ("projectCityId") REFERENCES "project_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_projectCityId_fkey" FOREIGN KEY ("projectCityId") REFERENCES "project_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cities" ADD CONSTRAINT "project_cities_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cities" ADD CONSTRAINT "project_cities_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
