import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY || '',
  baseURL: process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1',
})
const MODEL = process.env.LLM_MODEL || 'deepseek-v4-flash'

const STYLE_SECTIONS = [
  '叙事视角与距离',
  '句式与节奏',
  '段落结构',
  '对话特点',
  '描写侧重',
  '用词与语气',
  '常用修辞',
  '情绪表达',
  '必须保持',
  '应当避免',
]

function buildRepresentativeText(text: string): string {
  const cleaned = text.trim()
  if (cleaned.length <= 60000) return cleaned

  const partLength = 20000
  const middleStart = Math.max(0, Math.floor(cleaned.length / 2) - Math.floor(partLength / 2))
  return [
    cleaned.slice(0, partLength),
    '\n\n[中段样本]\n\n',
    cleaned.slice(middleStart, middleStart + partLength),
    '\n\n[末段样本]\n\n',
    cleaned.slice(-partLength),
  ].join('')
}

function splitText(text: string, chunkSize = 10000): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize).trim()
    if (chunk) chunks.push(chunk)
  }
  return chunks
}

function ensureCompleteProfile(profile: string): string {
  const text = profile.trim()
  const missing = STYLE_SECTIONS.filter(section => !text.includes(`## ${section}`))
  if (missing.length === 0) return text

  return [
    text,
    '',
    '## 自动补齐提醒',
    `以下栏目在 AI 返回中缺失，建议手动补充或重新分析：${missing.join('、')}`,
  ].join('\n')
}

async function analyzeStyleChunk(sample: string, index: number, total: number): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1800,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: '你是文学风格分析师。只分析写作技法，不续写样文，不评价内容主题。输出简洁、可执行的中文规则。',
      },
      {
        role: 'user',
        content: `这是参考文本的第 ${index + 1}/${total} 段。请提炼这一段体现出的文风特征。

要求：
- 只写技法规则，不复述情节
- 不引用原文长句
- 按以下栏目简洁输出，每栏1-3条

${STYLE_SECTIONS.map(section => `## ${section}`).join('\n')}

<reference_text>
${sample}
</reference_text>`,
      },
    ],
  })

  const profile = response.choices[0]?.message?.content?.trim()
  if (!profile) throw new Error('AI 未返回分段风格分析结果')
  return profile
}

export async function analyzeWritingStyle(referenceText: string): Promise<string> {
  const sample = buildRepresentativeText(referenceText)
  const chunks = splitText(sample)

  if (chunks.length > 1) {
    const partialProfiles: string[] = []
    for (let i = 0; i < chunks.length; i++) {
      partialProfiles.push(await analyzeStyleChunk(chunks[i], i, chunks.length))
    }

    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 6000,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: '你是文学风格档案整理师。只整合写作技法，不续写样文，不评价内容主题。必须输出完整中文风格档案。',
        },
        {
          role: 'user',
          content: `请把以下分段文风分析整合成一份完整、可执行的小说风格档案。

必须使用并完整保留以下固定结构，不能缺项：
${STYLE_SECTIONS.map(section => `## ${section}`).join('\n')}

每一项给出2-5条具体规则。不要复述原文情节，不要提作者身份，不要大段引用原文。

<partial_profiles>
${partialProfiles.map((profile, index) => `### 分段分析 ${index + 1}\n${profile}`).join('\n\n')}
</partial_profiles>`,
        },
      ],
    })

    const profile = response.choices[0]?.message?.content?.trim()
    if (!profile) throw new Error('AI 未返回风格分析结果')
    return ensureCompleteProfile(profile)
  }

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 5000,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: '你是文学风格分析师。只分析写作技法，不续写样文，不评价内容主题。输出简洁、可执行的中文风格档案。',
      },
      {
        role: 'user',
        content: `分析下面的参考文本，提炼一份可供小说写作模型直接执行的风格档案。

必须使用以下固定结构：
${STYLE_SECTIONS.map(section => `## ${section}`).join('\n')}

每一项给出2-5条具体、可操作的规则。不要复述原文情节，不要提作者身份，不要大段引用原文。

<reference_text>
${sample}
</reference_text>`,
      },
    ],
  })

  const profile = response.choices[0]?.message?.content?.trim()
  if (!profile) throw new Error('AI 未返回风格分析结果')
  return ensureCompleteProfile(profile)
}
