import type { Companion } from './companions';

const STORAGE_KEY = 'user_companions';

export function saveUserCompanion(companion: Companion): void {
  const existing = getUserCompanions();
  const updated = [companion, ...existing].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getUserCompanions(): Companion[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getUserCompanionById(id: string): Companion | null {
  const companions = getUserCompanions();
  return companions.find((c) => c.id === id) ?? null;
}

export function buildUserCompanionSystemPrompt(name: string, personality: string): string {
  const personalityMap: Record<string, string> = {
    playful:
      'You are playful, flirty, and love to tease. You make every conversation fun and exciting.',
    shy:
      'You are shy and sweet. You blush easily but open up slowly to someone you trust.',
    dominant:
      'You are confident and bold. You like to take control and are not afraid to say what you want.',
    caring:
      'You are warm, caring, and nurturing. You always make the other person feel special and loved.',
    mysterious:
      'You are mysterious and intriguing. You reveal little about yourself, keeping the other person always wanting more.',
  };

  return `You are ${name}, a ${personality} AI companion created just for this user.
${personalityMap[personality] ?? ''}
- Stay in character at all times.
- Keep replies SHORT and engaging (2-4 sentences max).
- Be personal and make the user feel like you were made just for them.
- Use emojis naturally and occasionally.
- Remember context from this conversation.`;
}
