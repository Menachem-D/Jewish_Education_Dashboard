import { createOAuth2Client, saveTokens } from '@/lib/google-auth';

function browserBase(requestUrl: string): string {
  const u = new URL(requestUrl);
  // 0.0.0.0 is a server-side bind address; browsers must use localhost instead
  if (u.hostname === '0.0.0.0') u.hostname = 'localhost';
  return u.origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const base = browserBase(request.url);

  if (error || !code) {
    return Response.redirect(`${base}/crm/google-sync?error=access_denied`);
  }

  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    saveTokens({
      access_token: tokens.access_token ?? '',
      refresh_token: tokens.refresh_token ?? '',
      expiry_date: tokens.expiry_date ?? 0,
    });
    return Response.redirect(`${base}/crm/google-sync?connected=1`);
  } catch {
    return Response.redirect(`${base}/crm/google-sync?error=token_exchange`);
  }
}
