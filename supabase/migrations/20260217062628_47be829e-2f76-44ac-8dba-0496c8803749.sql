
-- =============================
-- STEP 1: Create new tables
-- =============================

-- Scenes table (replaces topics/lessons)
CREATE TABLE public.scenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week INTEGER NOT NULL DEFAULT 1,
  day INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  situation TEXT NOT NULL DEFAULT '',
  skill_tags TEXT[] NOT NULL DEFAULT '{}',
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scenes are publicly readable"
  ON public.scenes FOR SELECT
  USING (true);

-- Sentences table
CREATE TABLE public.sentences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  audio_url TEXT,
  translation TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  phoneme_hints TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sentences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sentences are publicly readable"
  ON public.sentences FOR SELECT
  USING (true);

-- Phrases table
CREATE TABLE public.phrases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sentence_id UUID NOT NULL REFERENCES public.sentences(id) ON DELETE CASCADE,
  english TEXT NOT NULL,
  chinese TEXT NOT NULL DEFAULT '',
  usage_tip TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Phrases are publicly readable"
  ON public.phrases FOR SELECT
  USING (true);

-- User vocab (spaced repetition)
CREATE TABLE public.user_vocab (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phrase_id UUID NOT NULL REFERENCES public.phrases(id) ON DELETE CASCADE,
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leitner_box INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, phrase_id)
);

ALTER TABLE public.user_vocab ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vocab"
  ON public.user_vocab FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vocab"
  ON public.user_vocab FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vocab"
  ON public.user_vocab FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vocab"
  ON public.user_vocab FOR DELETE
  USING (auth.uid() = user_id);

-- Scene-based user progress (new version)
CREATE TABLE public.scene_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE,
  avg_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, scene_id)
);

ALTER TABLE public.scene_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scene progress"
  ON public.scene_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scene progress"
  ON public.scene_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scene progress"
  ON public.scene_progress FOR UPDATE
  USING (auth.uid() = user_id);
