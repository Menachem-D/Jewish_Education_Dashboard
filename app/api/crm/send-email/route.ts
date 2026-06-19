import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { to, toName, subject, body } = await request.json();

  if (!to || !subject || !body) {
    return Response.json({ error: 'to, subject, and body are required' }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const fromName = process.env.RESEND_FROM_NAME ?? 'My Dispatch';

  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromAddress}>`,
    to: toName ? `${toName} <${to}>` : to,
    subject,
    html: body.replace(/\n/g, '<br>'),
    text: body,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ id: data?.id });
}
