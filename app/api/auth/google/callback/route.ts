import { createOAuth2Client, saveTokens } from '@/lib/google-auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return Response.redirect(
      new URL('/crm/google-sync?error=access_denied', request.url),
    );
  }

  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    saveTokens({
      access_token: tokens.access_token ?? '',
      refresh_token: tokens.refresh_token ?? '',
      expiry_date: tokens.expiry_date ?? 0,
    });
    return Response.redirect(new URL('/crm/google-sync?connected=1', request.url));
  } catch {
    return Response.redirect(
      new URL('/crm/google-sync?error=token_exchange', request.url),
    );
  }
}
