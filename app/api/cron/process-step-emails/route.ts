import { NextRequest, NextResponse } from 'next/server';
import { findUserById } from '@/lib/auth';
import { sendCustomEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase-server';

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCronSecret(req: NextRequest): boolean {
    const headerSecret = req.headers.get('x-vercel-cron-auth') || req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    return !!CRON_SECRET && headerSecret === CRON_SECRET;
}

export async function POST(req: NextRequest) {
    try {
        if (!verifyCronSecret(req)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = Date.now();

        // Query pending emails that are due
        const { data: pendingEntries, error: fetchError } = await supabaseAdmin
            .from('step_email_queue')
            .select('*')
            .eq('status', 'pending')
            .lte('next_send_at', now);

        if (fetchError) {
            console.error('[Cron] process-step-emails fetch error:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch pending emails' }, { status: 500 });
        }

        let processed = 0;

        for (const entry of pendingEntries || []) {
            try {
                // Get the sequence
                const { data: sequence, error: seqError } = await supabaseAdmin
                    .from('step_email_sequences')
                    .select('*')
                    .eq('id', entry.sequence_id)
                    .single();

                if (seqError || !sequence) {
                    console.error(`[Cron] sequence not found for entry ${entry.id}:`, seqError);
                    await supabaseAdmin
                        .from('step_email_queue')
                        .update({ status: 'failed', updated_at: now })
                        .eq('id', entry.id);
                    continue;
                }

                // Skip if sequence is inactive
                if (!sequence.is_active) {
                    continue;
                }

                // Get the user
                const user = await findUserById(entry.user_id);
                if (!user) {
                    console.error(`[Cron] user not found for entry ${entry.id}, user_id: ${entry.user_id}`);
                    await supabaseAdmin
                        .from('step_email_queue')
                        .update({ status: 'failed', updated_at: now })
                        .eq('id', entry.id);
                    continue;
                }

                // Get the current step
                const steps = sequence.steps as Array<{ delayHours: number; subject: string; body: string }>;
                const currentStepIndex = entry.current_step;

                if (currentStepIndex >= steps.length) {
                    await supabaseAdmin
                        .from('step_email_queue')
                        .update({ status: 'completed', updated_at: now })
                        .eq('id', entry.id);
                    continue;
                }

                const step = steps[currentStepIndex];

                // Send the email
                const success = await sendCustomEmail(user.email, step.subject, step.body, 'step_email');

                if (!success) {
                    console.error(`[Cron] failed to send email for entry ${entry.id}`);
                    await supabaseAdmin
                        .from('step_email_queue')
                        .update({ status: 'failed', updated_at: now })
                        .eq('id', entry.id);
                    continue;
                }

                // Determine next state
                const nextStepIndex = currentStepIndex + 1;

                if (nextStepIndex < steps.length) {
                    // More steps remain — advance to next step
                    const nextStep = steps[nextStepIndex];
                    const nextSendAt = now + nextStep.delayHours * 60 * 60 * 1000;

                    await supabaseAdmin
                        .from('step_email_queue')
                        .update({
                            current_step: nextStepIndex,
                            next_send_at: nextSendAt,
                            updated_at: now,
                        })
                        .eq('id', entry.id);
                } else {
                    // Last step — mark as completed
                    await supabaseAdmin
                        .from('step_email_queue')
                        .update({ status: 'completed', updated_at: now })
                        .eq('id', entry.id);
                }

                processed++;
            } catch (entryErr) {
                console.error(`[Cron] error processing entry ${entry.id}:`, entryErr);
                await supabaseAdmin
                    .from('step_email_queue')
                    .update({ status: 'failed', updated_at: now })
                    .eq('id', entry.id);
            }
        }

        return NextResponse.json({ success: true, processed });
    } catch (err) {
        console.error('[Cron] process-step-emails error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Support GET for Vercel Cron
export async function GET(req: NextRequest) {
    return POST(req);
}
