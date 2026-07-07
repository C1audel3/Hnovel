import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY || '',
  baseURL: process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1',
})
const MODEL = process.env.LLM_MODEL || 'deepseek-v4-flash'

export async function analyzeWritingStyle(referenceText: string): Promise<string> {
  const sample = referenceText.slice(0, 12000)
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 2200,
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
## 叙事视角与距离
## 句式与节奏
## 段落结构
## 对话特点
## 描写侧重
## 用词与语气
## 常用修辞
## 情绪表达
## 必须保持
## 应当避免

每一项给出具体、可操作的规则。不要复述原文情节，不要提作者身份，不要大段引用原文。

<reference_text>
${sample}
</reference_text>`,
      },
    ],
  })

  const profile = response.choices[0]?.message?.content?.trim()
  if (!profile) throw new Error('AI 未返回风格分析结果')
  return profile
}
