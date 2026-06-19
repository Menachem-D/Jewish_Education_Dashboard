import { getAuthUrl, googleCredentialsConfigured } from '@/lib/google-auth';

export async function GET(request: Request) {
  if (!googleCredentialsConfigured()) {
    return Response.redirect(
      new URL('/crm/google-sync?error=not_configured', request.url),
    );
  }
  try {
    const url = getAuthUrl();
    return Response.redirect(url);
  } catch {
    return Response.redirect(
      new URL('/crm/google-sync?error=config_error', request.url),
    );
  }
}
