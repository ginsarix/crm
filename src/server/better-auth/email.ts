import nodemailer from 'nodemailer';
import { env } from '~/env';

const transporter =
  env.SMTP_HOST && env.SMTP_PORT
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              }
            : undefined,
      })
    : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!transporter) {
    console.warn('[Email] SMTP not configured. Email would be sent to:', to);
    console.warn('[Email] Subject:', subject);
    console.warn('[Email] Content:', html);
    return;
  }

  const from = env.EMAIL_FROM ?? 'noreply@example.com';

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    throw new Error(
      `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export function getVerificationEmailHtml(url: string, userName?: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>E-posta Doğrulama</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px; margin: 0;">
        <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <h1 style="font-size: 24px; font-weight: 600; color: #18181b; margin: 0 0 24px 0; text-align: center;">
            E-posta Adresinizi Doğrulayın
          </h1>
          <p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px 0;">
            ${userName ? `Merhaba ${userName},` : 'Merhaba,'}
          </p>
          <p style="font-size: 16px; color: #3f3f46; line-height: 1.6; margin: 0 0 32px 0;">
            Hesabınızı etkinleştirmek için aşağıdaki butona tıklayarak e-posta adresinizi doğrulayın.
          </p>
          <div style="text-align: center; margin: 0 0 32px 0;">
            <a href="${url}" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; padding: 14px 32px; border-radius: 8px;">
              E-postayı Doğrula
            </a>
          </div>
          <p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 0 0 16px 0;">
            Buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırın:
          </p>
          <p style="font-size: 12px; color: #a1a1aa; word-break: break-all; margin: 0 0 32px 0; background-color: #f4f4f5; padding: 12px; border-radius: 6px;">
            ${url}
          </p>
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
          <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin: 0;">
            Bu e-postayı siz talep etmediyseniz, lütfen dikkate almayın.
          </p>
        </div>
      </body>
    </html>
  `;
}
