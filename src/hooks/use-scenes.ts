import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useScenes(courseId?: string | null) {
  return useQuery({
    queryKey: ["scenes", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from("scenes")
        .select("*")
        .eq("course_id", courseId)
        .order("week")
        .order("day");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}

export function useCourses(userId: string | null) {
  return useQuery({
    queryKey: ["courses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useScene(sceneId: string | null) {
  return useQuery({
    queryKey: ["scene", sceneId],
    queryFn: async () => {
      if (!sceneId) return null;
      const { data, error } = await supabase
        .from("scenes")
        .select("*")
        .eq("id", sceneId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sceneId,
  });
}

export function useSentences(sceneId: string | null) {
  return useQuery({
    queryKey: ["sentences", sceneId],
    queryFn: async () => {
      if (!sceneId) return [];
      const { data, error } = await supabase
        .from("sentences")
        .select("*")
        .eq("scene_id", sceneId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!sceneId,
  });
}

export function usePhrases(sentenceIds: string[]) {
  return useQuery({
    queryKey: ["phrases", sentenceIds],
    queryFn: async () => {
      if (!sentenceIds.length) return [];
      const { data, error } = await supabase
        .from("phrases")
        .select("*")
        .in("sentence_id", sentenceIds);
      if (error) throw error;
      return data;
    },
    enabled: sentenceIds.length > 0,
  });
}

export function useSceneProgress(userId: string | null) {
  return useQuery({
    queryKey: ["scene_progress", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("scene_progress")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
