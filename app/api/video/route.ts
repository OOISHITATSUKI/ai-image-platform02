import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const maxDuration = 300; // 5 minutes
import { verifyToken, findUserById, saveUser } from '@/lib/auth';
import { PLAN_LIMITS } from '@/lib/types';
import type { FetishTag } from '@/lib/types';

const NOVITA_API_KEY = process.env.NOVITA_API_KEY || '';
const NOVITA_BASE = 'https://api.novita.ai/v3';

const FETISH_TAG_MAP: Record<FetishTag, string> = {
    fellatio:   'blowjob, oral sex, penis in mouth',
    cowgirl:    'cowgirl position, riding on top',
    insertion:  'penetration, vaginal insertion',
    kiss:       'passionate kissing, deep kiss',
    missionary: 'missionary position, man on top',
    doggy:      'doggy style, from behind',
    standing:   'standing sex position',
    handjob:    'handjob, stroking penis',
    paizuri:    'paizuri, titjob',
};

async function pollVideoResult(taskId: string): Promise<{ success: boolean; videoUrl?: string; error?: string }> {
    const maxAttempts = 60;
    const pollInterval = 2000;
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, pollInterval));
        const res = await fetch(NOVITA_BASE + '/async/task-result?task_id=' + taskId, {
            headers: { Authorization: 'Bearer ' + NOVITA_API_KEY },
        });
        if (!res.ok) continue;
        const data = await res.json();
        const status = data?.task?.status;
        console.log('Video task ' + taskId + ': ' + status);
        if (status === 'TASK_STATUS_SUCCEED') {
            const videoUrl = data?.videos?.[0]?.video_url;
            if (!videoUrl) return { success: false, error: 'No video URL in response' };
            return { success: true, videoUrl };
        }
        if (status === 'TASK_STATUS_FAILED') {
            return { success: false, error: data?.task?.reason || 'Generation failed' };
        }
    }
    return { success: false, error: 'Timeout' };
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '') || req.cookies.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        const user = findUserById(decoded.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const planKey = (['free','basic','pro','ultimate'].includes(user.plan) ? user.plan : 'pro') as keyof typeof PLAN_LIMITS;
        const limits = PLAN_LIMITS[planKey];
        if (!limits.videosPerDay) {
            return NextResponse.json({ error: 'plan_upgrade_required' }, { status: 403 });
        }

        const body = await req.json();
        const { imageBase64, prompt, actionTag, duration = 5, model = 'wan-2.1' } = body;
        if (!imageBase64) return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });

        const maxDuration = limits.maxVideoDuration;
        if (maxDuration && duration > maxDuration) {
            return NextResponse.json({ error: 'duration_exceeded' }, { status: 400 });
        }

        const creditCost = duration * 2;
        if (user.credits < creditCost) {
            return NextResponse.json({ error: 'insufficient_credits', required: creditCost, current: user.credits }, { status: 402 });
        }

        const actionPrompt = actionTag || '';
        const finalPrompt = actionPrompt
            ? actionPrompt + ', ' + (prompt || 'nsfw, nude, explicit, high quality')
            : (prompt || 'nsfw, nude, sensual movement, high quality');
        const negativePrompt = 'ugly, deformed, blurry, low quality, watermark, text, underage, minor, child';

        const modelMap: Record<string, string> = {
            'wan-2.1': 'wan2.1-i2v-480p',
            'wan-2.6': 'wan2.6-i2v-720p',
        };
        const novitaModel = modelMap[model] || 'wan2.1-i2v-480p';
        // base64をdata URLとしてNovitaに渡す
        const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : 'data:image/jpeg;base64,' + imageBase64;

        console.log('Video generation: duration=' + duration + 's prompt=' + finalPrompt.slice(0, 80));

        const submitRes = await fetch(NOVITA_BASE + '/async/wan-i2v', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + NOVITA_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_url: dataUrl,
                prompt: finalPrompt,
                negative_prompt: negativePrompt,
                width: 832,
                height: 480,
                steps: 30,
                seed: -1,
                enable_safety_checker: false,
            }),
        });

        if (!submitRes.ok) {
            const errText = await submitRes.text();
            console.error('Novita video error:', submitRes.status, errText);
            return NextResponse.json({ error: 'Novita API error: ' + submitRes.status }, { status: 502 });
        }

        const submitData = await submitRes.json();
        const taskId = submitData?.task_id;
        if (!taskId) return NextResponse.json({ error: 'No task_id returned' }, { status: 502 });

        const result = await pollVideoResult(taskId);
        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Generation failed' }, { status: 500 });
        }

        user.credits = Math.max(0, user.credits - creditCost);
        saveUser(user);
        console.log('Video generated credits_used=' + creditCost);

        return NextResponse.json({ videoUrl: result.videoUrl, taskId, creditsUsed: creditCost });

    } catch (err) {
        console.error('Video API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}