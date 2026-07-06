import { create } from 'zustand'
import type { OutlineChapter, GeneratedChapter } from '../lib/types'

interface WritePageState {
  phase: 'idle' | 'outline' | 'writing'
  outlineChapters: OutlineChapter[]
  generatedChapters: Set<number>
  generatedChapter: GeneratedChapter | null

  // Config
  chapterCount: number
  intensityLevel: number
  explicitLevel: string
  minWords: number
  maxWords: number
  focusCharacters: string
  chapterPrompts: Record<number, string>

  // Actions
  setPhase: (phase: 'idle' | 'outline' | 'writing') => void
  setOutlineChapters: (chapters: OutlineChapter[]) => void
  addGeneratedChapter: (num: number) => void
  setGeneratedChapter: (ch: GeneratedChapter | null) => void
  setConfig: (config: Partial<Pick<WritePageState, 'chapterCount' | 'intensityLevel' | 'explicitLevel' | 'minWords' | 'maxWords' | 'focusCharacters' | 'chapterPrompts'>>) => void
  setChapterPrompt: (num: number, prompt: string) => void
  updateChapter: (num: number, updates: Partial<Pick<OutlineChapter, 'title' | 'summary' | 'nsfw'>>) => void
  deleteChapter: (num: number) => void
  addChapter: (isNsfw: boolean) => void
  reset: () => void
}

const initialState = {
  phase: 'idle' as const,
  outlineChapters: [] as OutlineChapter[],
  generatedChapters: new Set<number>(),
  generatedChapter: null as GeneratedChapter | null,
  chapterCount: 5,
  intensityLevel: 5,
  explicitLevel: 'moderate',
  minWords: 2000,
  maxWords: 5000,
  focusCharacters: '',
  chapterPrompts: {} as Record<number, string>,
}

export const useWriteStore = create<WritePageState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setOutlineChapters: (chapters) => set({ outlineChapters: chapters, generatedChapters: new Set(), generatedChapter: null }),
  addGeneratedChapter: (num) => set((s) => ({ generatedChapters: new Set(s.generatedChapters).add(num) })),
  setGeneratedChapter: (ch) => set({ generatedChapter: ch }),
  setConfig: (config) => set(config),
  setChapterPrompt: (num, prompt) => set((s) => ({
    chapterPrompts: { ...s.chapterPrompts, [num]: prompt },
  })),
  updateChapter: (num, updates) => set((s) => ({
    outlineChapters: s.outlineChapters.map((c) =>
      c.number === num ? { ...c, ...updates } : c
    ),
  })),
  deleteChapter: (num) => set((s) => ({
    outlineChapters: s.outlineChapters.filter((c) => c.number !== num),
  })),
  addChapter: (isNsfw) => set((s) => {
    const maxNum = s.outlineChapters.length > 0 ? Math.max(...s.outlineChapters.map(c => c.number)) : 0
    return {
      outlineChapters: [...s.outlineChapters, {
        number: maxNum + 1, title: '新章节', summary: '在此编辑章节概要...',
        nsfw: isNsfw, estimatedWords: 3000,
      }],
    }
  }),
  reset: () => set(initialState),
}))
