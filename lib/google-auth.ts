import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const TOKEN_FILE = path.join(process.cwd(), 'data', 'google-tokens.json');

export function googleCredentialsConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function createOAuth2Client() {
  if (!googleCredentialsConfigured()) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local');
  }
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:3000/api/auth/google/callback';
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri,
  );
}

export function getAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/contacts.readonly'],
  });
}

interface Tokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export function saveTokens(tokens: Tokens): void {
  const dir = path.dirname(TOKEN_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

export function loadTokens(): Tokens | null {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8')) as Tokens;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  try { fs.unlinkSync(TOKEN_FILE); } catch { /* already gone */ }
}

/** Returns an authenticated OAuth2 client, or null if not connected. */
export async function getAuthedClient() {
  const tokens = loadTokens();
  if (!tokens) return null;
  const client = createOAuth2Client();
  client.setCredentials(tokens);
  // Persist refreshed tokens automatically
  client.on('tokens', (newTokens) => {
    if (newTokens.refresh_token) tokens.refresh_token = newTokens.refresh_token;
    if (newTokens.access_token) tokens.access_token = newTokens.access_token;
    if (newTokens.expiry_date) tokens.expiry_date = newTokens.expiry_date;
    saveTokens(tokens);
  });
  return client;
}
