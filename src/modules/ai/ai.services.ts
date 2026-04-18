import { FOOTBALL_BETTING_PROMPT } from './constants';

export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
): Promise<T> {
    let attempt = 0
    let lastError: any

    while (attempt <= maxRetries) {
        try {
            return await fn()
        } catch (err: any) {
            lastError = err
            const status = err?.status || err?.response?.status

            if (![429, 500, 502, 503, 504].includes(status)) {
                throw err
            }

            const delay =
                Math.min(2 ** attempt * 1000, 10_000) +
                Math.random() * 250

            await new Promise(r => setTimeout(r, delay))
            attempt++
        }
    }

    throw lastError
}

export function buildFootballPrompt(data: {
    stats: any,
    outcomes: any,
    news: any
}) {
    const currentDate = new Date().toLocaleDateString();
    
    return `
Today's date: ${currentDate}

### Match Data & Statistics (JSON):
${JSON.stringify(data.stats, null, 2)}

### Available Stake.com Outcomes & Odds (JSON):
${JSON.stringify(data.outcomes, null, 2)}

### Scraped News & Injuries (JSON):
${JSON.stringify(data.news, null, 2)}

Analyze the datasets provided above and generate the betting tickets according to your instructions.
`;
}

export async function buildFootballLLMRequest(data: {
    stats: any,
    outcomes: any,
    news: any
}) {
    const prompt = buildFootballPrompt(data);

    return {
        input: [
            { role: 'system', content: FOOTBALL_BETTING_PROMPT },
            {
                role: 'user',
                content: prompt
            },
        ],
    };
}
