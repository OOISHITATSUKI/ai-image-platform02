import crypto from 'crypto';

const ACCESS_KEY = process.env.RAPYD_ACCESS_KEY || '';
const SECRET_KEY = process.env.RAPYD_SECRET_KEY || '';
const BASE_URL = process.env.RAPYD_BASE_URL || 'https://sandboxapi.rapyd.net';

function generateSalt(length = 12): string {
    return crypto.randomBytes(length).toString('hex');
}

function generateSignature(
    method: string,
    urlPath: string,
    salt: string,
    timestamp: number,
    body: string
): string {
    const toSign = method.toLowerCase() + urlPath + salt + timestamp + ACCESS_KEY + SECRET_KEY + body;
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(toSign);
    return Buffer.from(hmac.digest('hex')).toString('base64');
}

export async function rapydRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: any
): Promise<T> {
    if (!ACCESS_KEY || !SECRET_KEY) {
        throw new Error('Rapyd API keys not configured');
    }

    const salt = generateSalt();
    const timestamp = Math.floor(Date.now() / 1000);
    const bodyString = body ? JSON.stringify(body) : '';
    const signature = generateSignature(method, path, salt, timestamp, bodyString);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        access_key: ACCESS_KEY,
        salt,
        timestamp: timestamp.toString(),
        signature,
    };

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? bodyString : undefined,
    });

    const data = await res.json();

    if (data.status?.status !== 'SUCCESS') {
        console.error('[rapyd] API Error:', JSON.stringify(data.status));
        throw new Error(`Rapyd API Error: ${data.status?.message || 'Unknown error'}`);
    }

    return data.data;
}
