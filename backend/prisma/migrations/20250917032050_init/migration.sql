-- CreateIndex
CREATE INDEX "idx_addresses_city" ON "addresses"("cityId");

-- CreateIndex
CREATE INDEX "idx_locks_address" ON "locks"("addressId");

-- CreateIndex
CREATE INDEX "idx_locks_active_online" ON "locks"("isActive", "isOnline");

-- CreateIndex
CREATE INDEX "idx_rfid_keys_user" ON "rfid_keys"("userId");

-- CreateIndex
CREATE INDEX "idx_rfid_keys_active_exp" ON "rfid_keys"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "idx_user_permissions_lock" ON "user_permissions"("lockId");

-- CreateIndex
CREATE INDEX "idx_user_permissions_user" ON "user_permissions"("userId");

-- CreateIndex
CREATE INDEX "idx_users_city" ON "users"("cityId");
