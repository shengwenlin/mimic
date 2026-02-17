import { createContext, useContext, useState, ReactNode } from "react";

const SYSTEM_COURSE_ID = "00000000-0000-0000-0000-000000000001";

interface CourseContextType {
  activeCourseId: string;
  setActiveCourse: (id: string) => void;
}

const CourseContext = createContext<CourseContextType>({
  activeCourseId: SYSTEM_COURSE_ID,
  setActiveCourse: () => {},
});

export const useCourse = () => useContext(CourseContext);

export const CourseProvider = ({ children }: { children: ReactNode }) => {
  const [activeCourseId, setActiveCourseId] = useState(
    () => localStorage.getItem("activeCourseId") || SYSTEM_COURSE_ID
  );

  const setActiveCourse = (id: string) => {
    localStorage.setItem("activeCourseId", id);
    setActiveCourseId(id);
  };

  return (
    <CourseContext.Provider value={{ activeCourseId, setActiveCourse }}>
      {children}
    </CourseContext.Provider>
  );
};
