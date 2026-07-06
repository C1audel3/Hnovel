export interface Story {
  id: string
  title: string
  genre: string
  sub_genre?: string
  setting_era?: string
  status: 'planning' | 'in-progress' | 'completed' | 'hiatus'
  rating: 'nsfw' | 'safe'
  nsfw_tags: string[]
  explicit_level: 'mild' | 'moderate' | 'graphic'
  target_audience: 'male' | 'female' | 'general'
  pov: string
  tense: string
  synopsis?: string
  tone_style?: string
  reference_style?: string
  themes: string[]
  chapter_count: number
  character_count: number
  total_words: number
  created_at: string
  updated_at: string
}

export interface Character {
  id: string
  story_id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  status: 'alive' | 'deceased' | 'unknown'
  gender?: string
  age?: string
  appearance?: string
  personality?: string
  background?: string
  sexual_orientation?: string
  preferences: string[]
  body_features?: string
  tags: string[]
  affection_level: number
  created_at: string
  updated_at: string
}

export interface CharacterRelationship {
  id: number
  story_id: string
  source_id: string
  target_id: string
  rel_type: string
  intimacy_level: number
  description?: string
}

export interface Chapter {
  id: string
  story_id: string
  chapter_number: number
  title: string
  pov_character?: string
  location?: string
  status: 'draft' | 'revised' | 'final'
  word_count: number
  outline?: string
  content?: string
  scene_type: string
  explicit_level?: string
  created_at: string
  updated_at: string
}

export interface GenerateOptions {
  focusCharacters?: string[]
  sceneType?: string
  explicitLevel?: string
  intensityLevel?: number
  minWords?: number
  maxWords?: number
  additionalInstructions?: string
  referenceStyle?: string
  chapterCount?: number
  chapterNumber?: number
  chapterTitle?: string
  chapterSummary?: string
}

export interface OutlineChapter {
  number: number
  title: string
  summary: string
  nsfw: boolean
  estimatedWords: number
}

export interface GeneratedOutline {
  title: string
  chapters: OutlineChapter[]
}

export interface GeneratedChapter {
  chapterNumber: number
  title: string
  outline: string
  content: string
  wordCount: number
}
