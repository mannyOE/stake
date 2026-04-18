import OpenAI from 'openai'
import { AIClient, AIResponse } from './ai.interfaces'
import { withRetry } from './ai.services'

export class OpenAIClient implements AIClient {
    private client: OpenAI

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env["OPENAI_API_KEY"]!,
        })
    }

    async generate(prompt: string | any[]): Promise<AIResponse<string>> {
        return withRetry(async () => {
            const messages = typeof prompt === 'string'
                ? [{ role: 'user', content: prompt }]
                : prompt;

            const res = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: messages as any,
            })

            const usage = res.usage!

            const estimatedCostUSD =
                (usage.prompt_tokens * 0.00015 +
                    usage.completion_tokens * 0.0006) / 1000

            return {
                data: res.choices[0]?.message.content || '',
                usage: {
                    provider: 'openai',
                    model: res.model,
                    inputTokens: usage.prompt_tokens,
                    outputTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                    estimatedCostUSD,
                },
                raw: res,
            }
        })
    }
}
