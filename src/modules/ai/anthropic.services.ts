import Anthropic from '@anthropic-ai/sdk'
import { AIClient, AIResponse } from './ai.interfaces'
import { withRetry } from './ai.services'

export class AnthropicClient implements AIClient {
    private client: Anthropic

    constructor() {
        this.client = new Anthropic({
            apiKey: process.env["CLAUDE_API_KEY"]!,
        })
    }

    async generate(prompt: string | any[]): Promise<AIResponse<string>> {
        return withRetry(async () => {
            let messages: any[] = [];
            let system: string | undefined;

            if (typeof prompt === 'string') {
                messages = [{ role: 'user', content: prompt }];
            } else {
                // Extract system message if present
                const systemMsg = prompt.find((m: any) => m.role === 'system');
                if (systemMsg) {
                    system = systemMsg.content;
                }
                messages = prompt.filter((m: any) => m.role !== 'system');
            }

            const params: any = {
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                messages: messages,
            };

            if (system) {
                params.system = system;
            }

            const res = await this.client.messages.create(params)

            const inputTokens = res.usage.input_tokens
            const outputTokens = res.usage.output_tokens

            const estimatedCostUSD =
                (inputTokens * 0.003 + outputTokens * 0.015) / 1000

            return {
                // @ts-ignore
                data: res.content[0]!.text,
                usage: {
                    provider: 'anthropic',
                    model: res.model,
                    inputTokens,
                    outputTokens,
                    totalTokens: inputTokens + outputTokens,
                    estimatedCostUSD,
                },
                raw: res,
            }
        })
    }
}
