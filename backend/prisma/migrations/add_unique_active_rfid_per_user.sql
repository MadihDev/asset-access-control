-- Migration: Add unique constraint for one active RFID card per user
-- This ensures that each user can only have one active RFID card at a time

-- First, let's identify and resolve any existing duplicate active cards
-- We'll keep the most recent card and deactivate older ones

DO $$
DECLARE
    user_record RECORD;
    card_record RECORD;
    keep_card_id TEXT;
BEGIN
    -- For each user with multiple active cards
    FOR user_record IN 
        SELECT "userId", COUNT(*) as card_count
        FROM "rfid_keys" 
        WHERE "isActive" = true 
        GROUP BY "userId" 
        HAVING COUNT(*) > 1
    LOOP
        -- Get the most recent card to keep
        SELECT "id" INTO keep_card_id
        FROM "rfid_keys" 
        WHERE "userId" = user_record."userId" 
        AND "isActive" = true 
        ORDER BY "issuedAt" DESC 
        LIMIT 1;
        
        -- Deactivate all other cards for this user
        UPDATE "rfid_keys" 
        SET "isActive" = false, 
            "updatedAt" = NOW()
        WHERE "userId" = user_record."userId" 
        AND "isActive" = true 
        AND "id" != keep_card_id;
        
        -- Log the cleanup
        RAISE NOTICE 'User % had % active cards. Kept card % and deactivated others.', 
                     user_record."userId", user_record.card_count, keep_card_id;
    END LOOP;
END $$;

-- Now add the unique constraint to prevent future duplicates
-- This constraint ensures only one active card per user
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_rfid_keys_user_active_unique
ON "rfid_keys" ("userId") 
WHERE "isActive" = true;

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_rfid_keys_user_active_unique IS 
'Ensures each user can have only one active RFID card at a time for security and access control simplicity';

-- Verify the constraint works by checking current state
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT "userId"
        FROM "rfid_keys" 
        WHERE "isActive" = true 
        GROUP BY "userId" 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % users still have multiple active cards', duplicate_count;
    ELSE
        RAISE NOTICE 'Migration successful: All users now have at most one active RFID card';
    END IF;
END $$;