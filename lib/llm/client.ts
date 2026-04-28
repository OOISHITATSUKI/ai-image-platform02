import { ClaudeProvider } from './providers/claude';
import { TogetherProvider } from './providers/together';
import { LLMProvider } from './types';

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER ?? 'together';

  if (provider === 'claude') {
    return new ClaudeProvider(process.env.ANTHROPIC_API_KEY!);
  }

  return new TogetherProvider(
    process.env.TOGETHER_API_KEY!,
    process.env.TOGETHER_MODEL ?? 'Qwen/Qwen2.5-7B-Instruct-Turbo'
  );
}
