DELETE FROM public.phrases WHERE sentence_id IN (
  SELECT s.id FROM public.sentences s
  JOIN public.scenes sc ON s.scene_id = sc.id
  WHERE sc.course_id = '00000000-0000-0000-0000-000000000001'
);
DELETE FROM public.sentences WHERE scene_id IN (
  SELECT id FROM public.scenes WHERE course_id = '00000000-0000-0000-0000-000000000001'
);
DELETE FROM public.scenes WHERE course_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.courses WHERE id = '00000000-0000-0000-0000-000000000001';
