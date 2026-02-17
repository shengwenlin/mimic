export const streakDays = [true, true, true, true, true, false, false];

export const todayLesson = {
  week: 1,
  day: 6,
  title: "Defending under pushback",
  duration: "12 min",
  sentences: 8,
};

export const completedLessons = [
  { id: 1, title: "Introducing your design rationale", score: 92, day: 5 },
  { id: 2, title: "Asking clarifying questions", score: 88, day: 4 },
  { id: 3, title: "Presenting trade-offs clearly", score: 85, day: 3 },
];

export const situationText =
  "Alex presents a simplified checkout flow. The tech lead pushes back. Alex needs to stay confident and cite data.";

export const skillTags = ["Assertive", "Data-backed", "Collaborative"];

export const steps = ["Listen", "Mimic", "Review", "Done"];

export const transcriptText = {
  before: "That's a fair point, and I hear you on the ",
  highlight1: "control concern",
  middle: ". But our research showed ",
  highlight2: "74% of drop-offs",
  after: " happened on that screen.",
};

export const mimicSentence = [
  { word: "That's", stressed: false },
  { word: "a", stressed: false },
  { word: "fair", stressed: true },
  { word: "point,", stressed: false },
  { word: "and", stressed: false },
  { word: "I", stressed: false },
  { word: "hear", stressed: true },
  { word: "you", stressed: false },
  { word: "on", stressed: false },
  { word: "the", stressed: false },
  { word: "control", stressed: true },
  { word: "concern.", stressed: false },
];

export const stressLabels = "FAIR · point · HEAR · you · CONTROL · concern";

export const wordScores = [
  { word: "That's", score: 98, tip: "Great! Clear pronunciation." },
  { word: "a", score: 95, tip: "Natural and relaxed." },
  { word: "fair", score: 91, tip: "Good stress on this word." },
  { word: "point", score: 88, tip: "Slightly sharper 'p' sound would help." },
  { word: "and", score: 72, tip: "Try reducing to 'n' sound — more natural in connected speech." },
  { word: "concern", score: 54, tip: "Stress the second syllable: con-CERN. The 'er' sound needs to be longer." },
];

export const savedPhrases = [
  { en: "fair point", zh: "承认对方有道理" },
  { en: "I hear you on…", zh: "理解顾虑" },
];

export const flashcards = [
  {
    id: 1,
    zh: "我理解你对可控性的顾虑",
    en: "I hear you on the control concern",
    tip: "Use when acknowledging someone's worry before countering",
  },
  {
    id: 2,
    zh: "这是个合理的观点",
    en: "That's a fair point",
    tip: "Good for showing respect before disagreeing",
  },
];

export const storyMapLessons = [
  { id: 1, title: "Greeting the team", status: "done" as const, score: 92 },
  { id: 2, title: "Small talk before meetings", status: "done" as const, score: 88 },
  { id: 3, title: "Presenting trade-offs clearly", status: "done" as const, score: 85 },
  { id: 4, title: "Asking clarifying questions", status: "done" as const, score: 90 },
  { id: 5, title: "Introducing your design rationale", status: "done" as const, score: 87 },
  { id: 6, title: "Defending under pushback", status: "current" as const, score: 0 },
  { id: 7, title: "Wrapping up with action items", status: "locked" as const, score: 0 },
];

export const week2Lessons = [
  { id: 8, title: "Responding to timeline concerns", status: "locked" as const },
  { id: 9, title: "Negotiating scope changes", status: "locked" as const },
  { id: 10, title: "Explaining user research findings", status: "locked" as const },
  { id: 11, title: "Handling conflicting feedback", status: "locked" as const },
  { id: 12, title: "Proposing alternatives diplomatically", status: "locked" as const },
  { id: 13, title: "Summarizing decisions for alignment", status: "locked" as const },
  { id: 14, title: "Closing a productive design review", status: "locked" as const },
];

// ─── New practice flow data ───

export interface PracticeSentence {
  pattern: string;
  words: string[];
  translation: string;
  sceneTitle: string;
  sceneDescription: string;
}

export const practiceSentences: PracticeSentence[] = [
  {
    pattern: "Could I get ___?",
    words: ["That's", "a", "fair", "point,", "and", "I", "hear", "you", "on", "the", "control", "concern."],
    translation: "这是个合理的观点，我理解你对可控性的顾虑。",
    sceneTitle: "设计评审会议",
    sceneDescription: "你正在和技术负责人讨论新的结账流程设计方案。对方对你的简化方案提出了质疑，你需要先表达理解，再用数据反驳。",
  },
  {
    pattern: "I hear you on ___.",
    words: ["But", "our", "research", "showed", "74%", "of", "drop-offs", "happened", "on", "that", "screen."],
    translation: "但我们的研究显示74%的流失发生在那个页面。",
    sceneTitle: "用数据说话",
    sceneDescription: "你已经表达了理解，现在需要用具体的用户研究数据来支撑你的设计决策，让对方信服。",
  },
  {
    pattern: "Our research showed ___.",
    words: ["I", "think", "we", "can", "find", "a", "middle", "ground", "that", "works", "for", "everyone."],
    translation: "我觉得我们可以找到一个大家都满意的折中方案。",
    sceneTitle: "寻找共识",
    sceneDescription: "讨论进入了僵局，你需要提出一个折中方案，让双方都能接受，推动项目继续前进。",
  },
];
