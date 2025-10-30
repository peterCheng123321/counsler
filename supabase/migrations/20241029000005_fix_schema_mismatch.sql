-- Fix messages table - Make chat_id optional and ensure conversation_id/role work
-- This allows the code to work with both old and new schema

-- Step 1: Make chat_id nullable (remove NOT NULL constraint)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'chat_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE messages ALTER COLUMN chat_id DROP NOT NULL;
    RAISE NOTICE 'Made chat_id nullable';
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'type' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE messages ALTER COLUMN type DROP NOT NULL;
    RAISE NOTICE 'Made type nullable';
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'conversation_id'
  ) THEN
    UPDATE messages 
    SET conversation_id = (
      SELECT id::text FROM conversations 
      WHERE conversations.id::text = messages.chat_id::text 
      LIMIT 1
    )::uuid
    WHERE conversation_id IS NULL AND chat_id IS NOT NULL;
    
    RAISE NOTICE 'Migrated conversation_id from chat_id';
  END IF;
END $$;


DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'role'
  ) THEN
    UPDATE messages 
    SET role = CASE 
      WHEN type = 'bot' THEN 'assistant'
      WHEN type = 'user' THEN 'user'
      ELSE COALESCE(role, 'assistant')
    END
    WHERE role IS NULL AND type IS NOT NULL;
    
    RAISE NOTICE 'Migrated role from type';
  END IF;
END $$;
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'role'
  ) THEN
    -- Add default if not exists
    ALTER TABLE messages ALTER COLUMN role SET DEFAULT 'user';
    RAISE NOTICE 'Set default for role';
  END IF;
END $$;
DELETE FROM messages 
WHERE conversation_id IS NULL 
AND chat_id IS NULL 
AND created_at < NOW() - INTERVAL '1 day';
