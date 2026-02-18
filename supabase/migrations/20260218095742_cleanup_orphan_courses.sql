-- Delete all orphan "Alex" courses (keeping system course and the latest user course)
-- Manual cascade: phrases → sentences → scenes → courses

DELETE FROM public.phrases
WHERE sentence_id IN (
  SELECT s.id FROM public.sentences s
  JOIN public.scenes sc ON s.scene_id = sc.id
  JOIN public.courses c ON sc.course_id = c.id
  WHERE c.is_system = false AND c.title LIKE 'Alex%'
);

DELETE FROM public.sentences
WHERE scene_id IN (
  SELECT sc.id FROM public.scenes sc
  JOIN public.courses c ON sc.course_id = c.id
  WHERE c.is_system = false AND c.title LIKE 'Alex%'
);

DELETE FROM public.scenes
WHERE course_id IN (
  SELECT id FROM public.courses
  WHERE is_system = false AND title LIKE 'Alex%'
);

DELETE FROM public.courses
WHERE is_system = false AND title LIKE 'Alex%';
