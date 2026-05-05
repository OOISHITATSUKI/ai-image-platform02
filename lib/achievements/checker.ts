import { supabaseAdmin } from '@/lib/supabase-server';

export interface AchievementUnlock {
  achievementId: string;
  name: string;
  nameJa: string;
  rewardCredits: number;
}

/**
 * Check and unlock achievements for a user based on a trigger event.
 * Call this after incrementing the relevant counter in user_stats.
 */
export async function checkAndUnlockAchievements(
  userId: string,
  triggerEvent: string
): Promise<AchievementUnlock[]> {
  // Get user stats
  const { data: stats } = await supabaseAdmin
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!stats) return [];

  // Get achievements for this trigger event
  const { data: achievements } = await supabaseAdmin
    .from('achievements')
    .select('*')
    .eq('trigger_event', triggerEvent);

  if (!achievements || achievements.length === 0) return [];

  // Get already unlocked achievements for this user
  const { data: unlocked } = await supabaseAdmin
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const unlockedIds = new Set((unlocked ?? []).map(u => u.achievement_id));

  const newUnlocks: AchievementUnlock[] = [];

  for (const achievement of achievements) {
    if (unlockedIds.has(achievement.id)) continue;

    // Get current value for this trigger
    const currentValue = getStatValue(stats, triggerEvent);
    if (currentValue >= achievement.threshold) {
      // Unlock achievement
      const { error } = await supabaseAdmin
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id,
          reward_claimed: true,
          reward_claimed_at: new Date().toISOString(),
        })
        .onConflict('user_id, achievement_id')
        .ignore();

      if (!error) {
        // Grant credits
        if (achievement.reward_credits > 0) {
          await supabaseAdmin.rpc('increment_credits', {
            p_user_id: userId,
            p_amount: achievement.reward_credits,
          }).then(async (res) => {
            // Fallback: direct update if RPC doesn't exist
            if (res.error) {
              const { data: user } = await supabaseAdmin
                .from('users')
                .select('credits')
                .eq('id', userId)
                .single();
              if (user) {
                await supabaseAdmin
                  .from('users')
                  .update({ credits: user.credits + achievement.reward_credits })
                  .eq('id', userId);
              }
            }
          });

          // Log credit change
          await supabaseAdmin.from('credit_log').insert({
            user_id: userId,
            type: 'achievement_reward',
            delta: achievement.reward_credits,
            note: `Achievement: ${achievement.id}`,
            related_id: achievement.id,
          });
        }

        newUnlocks.push({
          achievementId: achievement.id,
          name: achievement.name,
          nameJa: achievement.name_ja,
          rewardCredits: achievement.reward_credits,
        });
      }
    }
  }

  return newUnlocks;
}

/**
 * Increment a user stat and check achievements.
 */
export async function incrementStat(
  userId: string,
  field: string,
  value: number | string = 1
): Promise<AchievementUnlock[]> {
  // Ensure user_stats row exists
  await supabaseAdmin
    .from('user_stats')
    .upsert({ user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (typeof value === 'number') {
    // Increment numeric field
    const { data: current } = await supabaseAdmin
      .from('user_stats')
      .select(field)
      .eq('user_id', userId)
      .single();

    const currentVal = current?.[field] ?? 0;
    await supabaseAdmin
      .from('user_stats')
      .update({ [field]: currentVal + value, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  } else {
    // Append to array field (for styles_tried, hair_colors_tried)
    const { data: current } = await supabaseAdmin
      .from('user_stats')
      .select(field)
      .eq('user_id', userId)
      .single();

    const arr: string[] = current?.[field] ?? [];
    if (!arr.includes(value)) {
      await supabaseAdmin
        .from('user_stats')
        .update({ [field]: [...arr, value], updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }
  }

  // Determine trigger event from field
  const triggerEvent = field === 'styles_tried' || field === 'hair_colors_tried'
    ? field
    : field;

  return checkAndUnlockAchievements(userId, triggerEvent);
}

function getStatValue(stats: Record<string, unknown>, triggerEvent: string): number {
  switch (triggerEvent) {
    case 'generation_count':
      return (stats.generation_count as number) ?? 0;
    case 'styles_tried':
      return Array.isArray(stats.styles_tried) ? stats.styles_tried.length : 0;
    case 'hair_colors_tried':
      return Array.isArray(stats.hair_colors_tried) ? stats.hair_colors_tried.length : 0;
    case 'faces_saved':
      return (stats.faces_saved as number) ?? 0;
    case 'referrals_count':
      return (stats.referrals_count as number) ?? 0;
    case 'chat_messages_count':
      return (stats.chat_messages_count as number) ?? 0;
    case 'chat_streak':
      return (stats.chat_streak as number) ?? 0;
    case 'purchases_count':
      return (stats.purchases_count as number) ?? 0;
    case 'fanvue_purchases':
      return (stats.purchases_count as number) ?? 0;
    default:
      return 0;
  }
}
