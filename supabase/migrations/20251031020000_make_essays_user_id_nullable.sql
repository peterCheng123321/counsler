-- Make user_id nullable in essays table
-- This allows essays to be created without a user_id for demo purposes

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'essays' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE essays ALTER COLUMN user_id DROP NOT NULL;
    RAISE NOTICE 'Made user_id nullable in essays table';
  END IF;
END $$;
