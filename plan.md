Claude’s Plan
自定义课程 & 课程切换 — 实现方案
Context
当前 app 只有一套硬编码的 "Alex's Journey" 课程，所有 scenes 无课程归属。
目标：

用户描述角色背景 → Claude 生成一个月（30天 × 5句）的课程
用户可手动切换不同课程，首页 & 地图页同步
数据库变更（Migration）
新建 courses 表

CREATE TABLE courses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  character_context TEXT DEFAULT '',
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = 系统课程
  is_system   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 插入系统课程（Alex's Journey）
INSERT INTO courses (id, title, is_system)
VALUES ('00000000-0000-0000-0000-000000000001', 'Alex''s Journey', TRUE);
修改 scenes 表

ALTER TABLE scenes
  ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- 将已有 scenes 归入系统课程
UPDATE scenes SET course_id = '00000000-0000-0000-0000-000000000001';

-- 设置 NOT NULL（迁移完成后）
ALTER TABLE scenes ALTER COLUMN course_id SET NOT NULL;
RLS 策略

-- courses: 系统课程全员可读；自定义课程仅本人可读
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_courses_public" ON courses FOR SELECT
  USING (is_system = TRUE OR owner_id = auth.uid());
CREATE POLICY "owner_insert" ON courses FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- scenes: 系统课程全员可读；自定义课程仅 owner 可读
DROP POLICY IF EXISTS "Public scenes are viewable by all" ON scenes;
CREATE POLICY "scenes_readable" ON scenes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = scenes.course_id
        AND (courses.is_system = TRUE OR courses.owner_id = auth.uid())
    )
  );
CREATE POLICY "scenes_insert_by_owner" ON scenes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_id AND courses.owner_id = auth.uid()
    )
  );
新 Edge Function：generate-course
文件：supabase/functions/generate-course/index.ts

输入（POST body）：


{ "title": "...", "character_name": "...", "context": "...", "user_id": "..." }
处理流程：

调用 Claude API（分两批：day 1–15，day 16–30），避免超出 8K token 输出限制
解析返回的 JSON
插入 courses → scenes → sentences → phrases（service role key）
返回 { course_id }
Claude Prompt 核心：


你是英语学习课程设计师。为以下角色设计 {day_from}–{day_to} 天的职场英语练习：

角色：{character_name}
背景：{context}

每天生成一个场景，包含 5 个该角色在工作中实际会说的英语句子。

返回严格 JSON 格式，不带 markdown：
[{
  "day": 1, "week": 1,
  "title": "Scene title",
  "situation": "Brief situation description",
  "sentences": [{
    "text": "English sentence",
    "translation": "中文翻译",
    "phrase": { "english": "key phrase", "chinese": "短语释义", "usage_tip": "tip" }
  }]
}]
环境变量：需在 Supabase 项目 → Settings → Edge Functions Secrets 添加：

ANTHROPIC_API_KEY
前端 — 活跃课程状态
新文件：src/contexts/CourseContext.tsx

// localStorage 持久化，跨页面同步
const [activeCourseId, setActiveCourseId] = useState(
  localStorage.getItem('activeCourseId') || '00000000-0000-0000-0000-000000000001'
);
暴露：activeCourseId, setActiveCourse(id)

更新 src/hooks/use-scenes.ts
useScenes(courseId) — 查询加 .eq("course_id", courseId)
useCourses(userId) — 新 hook：查询系统课程 + 本人课程
前端 — 新建课程页
文件：src/pages/CreateCourse.tsx
路由：/courses/create（在 App.tsx 添加）

UI 流程：

表单：课程名称 / 角色名 / 角色背景描述（textarea）
点击「生成课程」→ 调用 Edge Function → loading 状态（约 20–40s）
生成完成 → 自动切换到新课程 → 跳转 /map
前端 — 课程切换
StoryMapScreen.tsx 改动
顶部增加课程选择器（Dropdown 或横向 Scroll Tabs）
选项：「Alex's Journey」+ 用户所有自定义课程 + 「＋ 新建课程」按钮
切换时调用 setActiveCourse(id)，useScenes(activeCourseId) 自动刷新
Index.tsx 改动
将 useScenes() 改为 useScenes(activeCourseId)
"Today's Lesson" 自动对应当前课程的第一个未完成场景
关键文件清单
文件	操作
supabase/migrations/xxx.sql	新建 — courses 表 + scenes.course_id
supabase/functions/generate-course/index.ts	新建 — Claude 生成 Edge Function
src/contexts/CourseContext.tsx	新建 — 活跃课程状态
src/hooks/use-scenes.ts	修改 — useScenes 接受 courseId；新增 useCourses
src/pages/CreateCourse.tsx	新建 — 课程创建表单页
src/pages/StoryMapScreen.tsx	修改 — 添加课程切换器
src/pages/Index.tsx	修改 — 使用 activeCourseId 过滤
src/App.tsx	修改 — 添加 /courses/create 路由 + CourseContext
src/integrations/supabase/types.ts	修改 — 添加 courses 类型
注意事项
ANTHROPIC_API_KEY：实施前需在 Supabase Dashboard → Settings → Secrets 添加
生成耗时：两次 Claude 调用约 20–40 秒，前端需显示明显的进度提示
Supabase types：Edge Function 里用 service_role key 插入数据，绕过 RLS
已有 scene_progress：不需改动，因为 scene_id 还是唯一的，进度记录仍有效
