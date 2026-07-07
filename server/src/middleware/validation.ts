import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'

export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: '请求参数不合法',
        code: 'VALIDATION_ERROR',
        details: result.error.issues.map(issue => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      })
    }
    req.body = result.data
    next()
  }
}

export function validateChapterNumber(req: Request, res: Response, next: NextFunction) {
  const result = z.coerce.number().int().positive().safeParse(req.params.num)
  if (!result.success) {
    return res.status(400).json({
      error: '章节编号必须是正整数',
      code: 'VALIDATION_ERROR',
      details: [{ field: 'num', message: '章节编号必须是正整数' }],
    })
  }
  next()
}

export const storyCreateSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(200),
  genre: z.string().trim().min(1).max(50).optional(),
  sub_genre: z.string().max(100).optional(),
  setting_era: z.string().max(100).optional(),
  rating: z.enum(['nsfw', 'safe']).optional(),
  nsfw_tags: z.array(z.string()).optional(),
  explicit_level: z.enum(['mild', 'moderate', 'graphic']).optional(),
  target_audience: z.enum(['male', 'female', 'general']).optional(),
  pov: z.string().max(100).optional(),
  tense: z.string().max(100).optional(),
  synopsis: z.string().max(10000).optional(),
  themes: z.array(z.string()).optional(),
})

export const storyUpdateSchema = storyCreateSchema.partial().extend({
  status: z.enum(['planning', 'in-progress', 'completed', 'hiatus']).optional(),
  tone_style: z.string().max(10000).optional(),
  reference_style: z.string().max(100000).optional(),
  style_profile: z.string().max(20000).optional(),
})

export const chapterSchema = z.object({
  title: z.string().trim().min(1, '章节标题不能为空').max(300),
  content: z.string().max(1000000).optional(),
  outline: z.string().max(100000).optional(),
  pov_character: z.string().max(200).optional(),
  location: z.string().max(300).optional(),
  status: z.enum(['draft', 'revised', 'final']).optional(),
  scene_type: z.string().max(100).optional(),
  explicit_level: z.string().max(50).optional(),
  word_count: z.number().nonnegative().optional(),
})

export const generateSchema = z.object({
  focusCharacters: z.array(z.string()).max(30).optional(),
  sceneType: z.string().max(100).optional(),
  explicitLevel: z.string().max(50).optional(),
  intensityLevel: z.number().min(0).max(10).optional(),
  minWords: z.number().int().min(100).max(100000).optional(),
  maxWords: z.number().int().min(100).max(100000).optional(),
  additionalInstructions: z.string().max(100000).optional(),
  outlineDirection: z.string().max(20000).optional(),
  referenceStyle: z.string().max(100000).optional(),
  styleProfile: z.string().max(20000).optional(),
  chapterCount: z.number().int().min(1).max(50).optional(),
  chapterNumber: z.number().int().positive().optional(),
  chapterTitle: z.string().max(300).optional(),
  chapterSummary: z.string().max(100000).optional(),
}).refine(value => !value.minWords || !value.maxWords || value.minWords <= value.maxWords, {
  message: '最少字数不能大于最多字数', path: ['minWords'],
})

export const worldItemSchema = z.object({
  category: z.enum(['locations', 'systems', 'factions', 'artifacts']),
  name: z.string().trim().min(1, '名称不能为空').max(200),
  type: z.string().trim().min(1).max(100),
  description: z.string().max(10000).optional(),
})

export const structureSchema = z.object({ structureModel: z.enum(['qichengzhuanhe', 'three-act', 'heros-journey', 'chapter-style']) })
export const arcSchema = z.object({
  name: z.string().trim().min(1, '故事线名称不能为空').max(200),
  type: z.enum(['main', 'sub', 'hidden', 'character']),
  characters: z.string().max(2000).optional(),
  description: z.string().max(10000).optional(),
})
export const timelineEventSchema = z.object({
  chapter: z.string().max(100).optional(),
  description: z.string().trim().min(1, '事件描述不能为空').max(10000),
  arc: z.string().optional(),
})
export const outlineSchema = z.object({
  chapters: z.array(z.object({
    number: z.number().int().positive(),
    title: z.string().trim().min(1, '章节标题不能为空').max(300),
    summary: z.string().max(100000),
    nsfw: z.boolean(),
    estimatedWords: z.number().int().min(100).max(100000),
  })).max(500).refine(items => new Set(items.map(item => item.number)).size === items.length, '章节编号不能重复'),
})
