import { LLMProvider, LLMRequest, LLMResponse } from '../types';

export class TogetherProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'Qwen/Qwen2.5-7B-Instruct-Turbo') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: request.maxTokens ?? 1000,
          temperature: request.temperature ?? 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Together API Error: ${res.status} ${err}`);
      }

      const data = await res.json();
      return {
        content: data.choices[0].message.content?.trim() ?? '',
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}
