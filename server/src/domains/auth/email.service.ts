import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS = 3; // 1 initial + 2 retries

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
            },
        });
    }

    async sendMagicLinkEmail(to: string, magicLinkUrl: string): Promise<void> {
        const subject = 'Đăng nhập vào ứng dụng của bạn';

        const html = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Đăng nhập vào ứng dụng của bạn</h2>
  <p>Nhấn vào nút bên dưới để đăng nhập. Link này sẽ hết hạn sau <strong>15 phút</strong>.</p>
  <p style="margin: 24px 0;">
    <a href="${magicLinkUrl}"
       style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Đăng nhập ngay
    </a>
  </p>
  <p>Hoặc sao chép link sau vào trình duyệt:</p>
  <p style="word-break: break-all; color: #4F46E5;">${magicLinkUrl}</p>
  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="color: #6B7280; font-size: 14px;">
    Nếu bạn không yêu cầu đăng nhập này, hãy bỏ qua email này. Link sẽ tự động hết hạn sau 15 phút.
  </p>
</body>
</html>`;

        const text = `Đăng nhập vào ứng dụng của bạn\n\nNhấn vào link sau để đăng nhập (hết hạn sau 15 phút):\n${magicLinkUrl}\n\nNếu bạn không yêu cầu đăng nhập này, hãy bỏ qua email này.`;

        let lastError: unknown;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                await this.transporter.sendMail({
                    from: env.EMAIL_FROM,
                    to,
                    subject,
                    html,
                    text,
                });
                return;
            } catch (error) {
                lastError = error;
                logger.error({ err: error, attempt, to }, 'Failed to send magic link email');

                if (attempt < MAX_ATTEMPTS) {
                    await sleep(RETRY_DELAY_MS);
                }
            }
        }

        const deliveryError = new Error('Failed to deliver email after all retry attempts') as Error & {
            code: string;
            statusCode: number;
        };
        deliveryError.code = 'EMAIL_DELIVERY_FAILED';
        deliveryError.statusCode = 503;
        throw deliveryError;
    }
}

export const emailService = new EmailService();
