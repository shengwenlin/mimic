-- Add unique constraints for upsert operations
ALTER TABLE public.scene_progress ADD CONSTRAINT scene_progress_user_scene_unique UNIQUE (user_id, scene_id);
ALTER TABLE public.user_vocab ADD CONSTRAINT user_vocab_user_phrase_unique UNIQUE (user_id, phrase_id);