export const SAVED_WORDS_KEY = "mimic_saved_words";

export interface SavedWordEntry {
  word: string;
  translation: string;
  phonetic: string;
  savedAt: string;
}

export const getSavedWords = (): SavedWordEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_WORDS_KEY) || "[]");
  } catch {
    return [];
  }
};

export const saveWord = (entry: SavedWordEntry) => {
  const list = getSavedWords().filter((w) => w.word !== entry.word);
  localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify([...list, entry]));
  window.dispatchEvent(new CustomEvent("mimic_words_changed"));
};

export const removeSavedWord = (word: string) => {
  const list = getSavedWords().filter((w) => w.word !== word);
  localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("mimic_words_changed"));
};
