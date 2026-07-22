import axios from 'axios'
import type { Story, Chapter, Foreshadow, GenerateOptions, GeneratedChapter, GeneratedOutline, OutlineChapter, PlotData, StoryArc, TimelineEvent, WorldItem, WritingPlan } from './types'

const api = axios.create({
  baseURL: '/api',
  timeout: 600000, // 10 minutes for AI generation
})

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; details?: Array<{ field: string; message: string }> } | undefined
    if (data?.details?.length) return data.details.map(item => `${item.field}: ${item.message}`).join('；')
    return data?.error || error.message
  }
  return error instanceof Error ? error.message : '未知错误'
}

export interface ApiErrorDiagnostic {
  title: string
  message: string
  code?: string
  status?: number
  method?: string
  url?: string
  details?: Array<{ field?: string; message?: string }> | unknown
  raw?: unknown
  createdAt: string
}

export function getApiErrorDiagnostic(error: unknown, title = 'AI 生成失败'): ApiErrorDiagnostic {
  const createdAt = new Date().toLocaleString()
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as {
      error?: string
      code?: string
      details?: Array<{ field?: string; message?: string }> | unknown
      diagnostic?: unknown
    } | undefined
    return {
      title,
      message: data?.error || error.message,
      code: data?.code || error.code,
      status: error.response?.status,
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      details: data?.details,
      raw: data?.diagnostic || data,
      createdAt,
    }
  }
  return {
    title,
    message: error instanceof Error ? error.message : String(error || '未知错误'),
    createdAt,
  }
}

// Stories
export async function fetchStories(): Promise<Story[]> {
  const { data } = await api.get('/stories')
  return data
}

export async function fetchStory(id: string): Promise<Story> {
  const { data } = await api.get(`/stories/${id}`)
  return data
}

export async function createStory(story: Partial<Story>): Promise<Story> {
  const { data } = await api.post('/stories', story)
  return data
}

export async function updateStory(id: string, updates: Partial<Story>): Promise<Story> {
  const { data } = await api.put(`/stories/${id}`, updates)
  return data
}

export async function analyzeStoryStyle(id: string): Promise<{ profile: string; sourceLength: number; analyzedLength: number }> {
  const { data } = await api.post(`/stories/${id}/analyze-style`)
  return data
}

export async function deleteStory(id: string): Promise<void> {
  await api.delete(`/stories/${id}`)
}

// Chapters
export async function fetchChapters(storyId: string): Promise<Chapter[]> {
  const { data } = await api.get(`/stories/${storyId}/chapters`)
  return data
}

export async function fetchChapter(storyId: string, num: number): Promise<Chapter> {
  const { data } = await api.get(`/stories/${storyId}/chapters/${num}`)
  return data
}

export async function saveChapter(storyId: string, num: number, chapter: Partial<Chapter>): Promise<Chapter> {
  const { data } = await api.put(`/stories/${storyId}/chapters/${num}`, chapter)
  return data
}

export async function deleteChapter(storyId: string, num: number): Promise<void> {
  await api.delete(`/stories/${storyId}/chapters/${num}`)
}

// AI Generation
export async function generateOutline(storyId: string, options: GenerateOptions): Promise<GeneratedOutline> {
  const { data } = await api.post(`/stories/${storyId}/chapters/generate-outline`, options)
  return data
}

export async function generateChapter(storyId: string, options: GenerateOptions): Promise<GeneratedChapter> {
  const { data } = await api.post(`/stories/${storyId}/chapters/generate`, options)
  return data
}

export async function generateWritingPlan(storyId: string, input: { chapterStart?: number; chapterCount?: number; focus?: string }): Promise<WritingPlan> {
  return (await api.post(`/stories/${storyId}/writing-plan/generate`, input)).data
}

export async function fetchWorldItems(storyId: string): Promise<WorldItem[]> {
  return (await api.get(`/stories/${storyId}/world-items`)).data
}
export async function createWorldItem(storyId: string, item: Omit<WorldItem, 'id'>): Promise<WorldItem> {
  return (await api.post(`/stories/${storyId}/world-items`, item)).data
}
export async function updateWorldItem(storyId: string, itemId: string, item: Omit<WorldItem, 'id'>): Promise<WorldItem> {
  return (await api.put(`/stories/${storyId}/world-items/${itemId}`, item)).data
}
export async function deleteWorldItem(storyId: string, itemId: string): Promise<void> {
  await api.delete(`/stories/${storyId}/world-items/${itemId}`)
}
export async function generateWorldItemDraft(storyId: string, input: { category: string; name?: string; hints?: string }): Promise<Partial<WorldItem> & { tags?: string }> {
  return (await api.post(`/stories/${storyId}/world-items/generate`, input)).data
}
export async function fetchPlot(storyId: string): Promise<PlotData> {
  return (await api.get(`/stories/${storyId}/plot`)).data
}
export async function savePlotStructure(storyId: string, structureModel: string): Promise<void> {
  await api.put(`/stories/${storyId}/plot/structure`, { structureModel })
}
export async function createStoryArc(storyId: string, arc: Omit<StoryArc, 'id' | 'status'>): Promise<StoryArc> {
  return (await api.post(`/stories/${storyId}/plot/arcs`, arc)).data
}
export async function deleteStoryArc(storyId: string, arcId: string): Promise<void> {
  await api.delete(`/stories/${storyId}/plot/arcs/${arcId}`)
}
export async function createTimelineEvent(storyId: string, event: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent> {
  return (await api.post(`/stories/${storyId}/plot/events`, event)).data
}
export async function deleteTimelineEvent(storyId: string, eventId: string): Promise<void> {
  await api.delete(`/stories/${storyId}/plot/events/${eventId}`)
}
export async function createForeshadow(storyId: string, item: Omit<Foreshadow, 'id'>): Promise<Foreshadow> {
  return (await api.post(`/stories/${storyId}/plot/foreshadows`, item)).data
}
export async function deleteForeshadow(storyId: string, foreshadowId: string): Promise<void> {
  await api.delete(`/stories/${storyId}/plot/foreshadows/${foreshadowId}`)
}
export async function generatePlotDraft(storyId: string, input: { kind: 'arc' | 'event' | 'foreshadow'; startChapter?: string; endChapter?: string; hints?: string }): Promise<any> {
  return (await api.post(`/stories/${storyId}/plot/generate`, input)).data
}
export async function fetchOutline(storyId: string): Promise<OutlineChapter[]> {
  return (await api.get(`/stories/${storyId}/outline`)).data
}
export async function saveOutline(storyId: string, chapters: OutlineChapter[]): Promise<void> {
  await api.put(`/stories/${storyId}/outline`, { chapters })
}

// Export
export function getExportUrl(storyId: string, format: 'markdown' | 'txt' | 'html'): string {
  return `/api/stories/${storyId}/export/${format}`
}
