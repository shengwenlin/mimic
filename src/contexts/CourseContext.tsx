import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CourseContextType {
  activeCourseId: string | null;
  setActiveCourse: (id: string | null) => void;
}

const CourseContext = createContext<CourseContextType>({
  activeCourseId: null,
  setActiveCourse: () => {},
});

export const useCourse = () => useContext(CourseContext);

export const CourseProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeCourseId, setActiveCourseId] = useState<string | null>(
    () => localStorage.getItem("activeCourseId")
  );

  // Auto-detect user's first course if none is set in localStorage
  useEffect(() => {
    if (!user || activeCourseId) return;

    const detectCourse = async () => {
      const { data } = await supabase
        .from("courses")
        .select("id")
        .eq("is_system", false)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const id = data[0].id;
        localStorage.setItem("activeCourseId", id);
        setActiveCourseId(id);
      }
    };
    detectCourse();
  }, [user, activeCourseId]);

  const setActiveCourse = (id: string | null) => {
    if (id) {
      localStorage.setItem("activeCourseId", id);
      setActiveCourseId(id);
    } else {
      localStorage.removeItem("activeCourseId");
      setActiveCourseId(null);
    }
  };

  return (
    <CourseContext.Provider value={{ activeCourseId, setActiveCourse }}>
      {children}
    </CourseContext.Provider>
  );
};
