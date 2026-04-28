import { LLMProvider, LLMRequest, LLMResponse } from '../types';

export class ClaudeProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const nonSystemMessages = request.messages.filter(m => m.role !== 'system');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens ?? 200,
          temperature: request.temperature,
          ...(systemMessage ? { system: systemMessage.content } : {}),
          messages: nonSystemMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude API Error: ${res.status} ${err}`);
      }

      const data = await res.json();
      return {
        content: data.content[0].text.trim(),
        usage: {
          inputTokens: data.usage?.input_tokens ?? 0,
          outputTokens: data.usage?.output_tokens ?? 0,
        },
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}
