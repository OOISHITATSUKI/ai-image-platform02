/**
 * Fanvue OAuth Setup Script
 *
 * Usage:
 *   npx tsx scripts/fanvue-oauth-setup.ts
 *
 * Steps:
 * 1. Register your app on Fanvue Developer Portal
 * 2. Set FANVUE_CLIENT_ID and FANVUE_CLIENT_SECRET in .env.local
 * 3. Run this script — it opens a browser for authorization
 * 4. After authorization, tokens are saved to .env.local and DB
 *
 * Required scopes: write:chat, read:creator, read:fan
 */

import http from 'http';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const CLIENT_ID = envVars.FANVUE_CLIENT_ID || process.env.FANVUE_CLIENT_ID;
const CLIENT_SECRET = envVars.FANVUE_CLIENT_SECRET || process.env.FANVUE_CLIENT_SECRET;
const REDIRECT_PORT = 9876;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const FANVUE_API_BASE = 'https://api.fanvue.com/v1';
const SCOPES = 'write:chat read:creator read:fan';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Set FANVUE_CLIENT_ID and FANVUE_CLIENT_SECRET in .env.local first');
  process.exit(1);
}

// Step 1: Build authorization URL
const authUrl = new URL(`${FANVUE_API_BASE}/oauth/authorize`);
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);

console.log('\n=== Fanvue OAuth Setup ===\n');
console.log('Open this URL in your browser to authorize:\n');
console.log(authUrl.toString());
console.log('\nWaiting for callback...\n');

// Step 2: Start local server to receive callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '', `http://localhost:${REDIRECT_PORT}`);

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    res.writeHead(400);
    res.end(`Error: ${error || 'No code received'}`);
    server.close();
    process.exit(1);
    return;
  }

  console.log('Authorization code received, exchanging for tokens...');

  // Step 3: Exchange code for tokens
  try {
    const tokenRes = await fetch(`${FANVUE_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token exchange failed: ${tokenRes.status} ${err}`);
    }

    const data = await tokenRes.json();
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;

    console.log('\n✅ Tokens received!\n');
    console.log(`Access Token:  ${accessToken.slice(0, 20)}...`);
    console.log(`Refresh Token: ${refreshToken.slice(0, 20)}...`);
    console.log(`Expires in:    ${expiresIn} seconds`);

    // Step 4: Append to .env.local
    let newEnv = envContent;
    const updates: Record<string, string> = {
      FANVUE_ACCESS_TOKEN: accessToken,
      FANVUE_REFRESH_TOKEN: refreshToken,
    };

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(newEnv)) {
        newEnv = newEnv.replace(regex, `${key}=${value}`);
      } else {
        newEnv += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(envPath, newEnv.trim() + '\n');
    console.log('\n✅ Saved to .env.local');
    console.log('\nDone! The server will now use these tokens for Fanvue DM sending.');
    console.log('Tokens will auto-refresh before expiry.\n');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>✅ Authorization successful!</h1><p>You can close this tab.</p>');
  } catch (err) {
    console.error('Error:', err);
    res.writeHead(500);
    res.end('Token exchange failed');
  }

  server.close();
  setTimeout(() => process.exit(0), 500);
});

server.listen(REDIRECT_PORT, () => {
  // Try to open browser automatically
  const { exec } = require('child_process');
  const openCmd = process.platform === 'darwin' ? 'open' :
    process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${openCmd} "${authUrl.toString()}"`);
});
