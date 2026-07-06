import axios from 'axios'
import type { Story, Chapter, GenerateOptions, GeneratedChapter, GeneratedOutline } from './types'

const api = axios.create({
  baseURL: '/api',
  timeout: 600000, // 10 minutes for AI generation
})

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

// AI Generation
export async function generateOutline(storyId: string, options: GenerateOptions): Promise<GeneratedOutline> {
  const { data } = await api.post(`/stories/${storyId}/chapters/generate-outline`, options)
  return data
}

export async function generateChapter(storyId: string, options: GenerateOptions): Promise<GeneratedChapter> {
  const { data } = await api.post(`/stories/${storyId}/chapters/generate`, options)
  return data
}

// Export
export function getExportUrl(storyId: string, format: 'markdown' | 'txt' | 'html'): string {
  return `/api/stories/${storyId}/export/${format}`
}
