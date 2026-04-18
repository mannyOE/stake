export interface AIUsage {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCostUSD: number
    model: string
    provider: 'openai' | 'anthropic'
}

export interface AIResponse<T = any> {
    data: T
    usage: AIUsage
    raw?: any
}

export interface AIClient {
    generate(prompt: string | any[], options?: any): Promise<AIResponse<string>>
}
