import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const emailService = {
    async sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
        try {
            if (!resend) {
                console.error('[EMAIL] RESEND_API_KEY is missing');
                return false;
            }

            if (!to || !token) {
                console.error('[EMAIL] Missing recipient or token');
                return false;
            }

            const frontendUrl = process.env.FRONTEND_URL;
            if (!frontendUrl) {
                console.error('[EMAIL] FRONTEND_URL is not configured');
                return false;
            }

            const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
            const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

            const response = await resend.emails.send({
                from,
                to,
                subject: 'Password Reset Request',
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                        <h2>Password Reset</h2>
                        <p>You requested a password reset.</p>
                        <p>Click the button below to reset your password:</p>
                        <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
                            Reset Password
                        </a>
                        <p>If you did not request this, you can safely ignore this email.</p>
                    </div>
                `
            });

            if ((response as any).error) {
                console.error('[EMAIL] Resend API error:', (response as any).error);
                return false;
            }

            console.log(`[EMAIL] Password reset email sent to ${to}`);
            return true;
        } catch (error) {
            console.error('[EMAIL] Failed to send password reset email:', error);
            return false;
        }
    },

    async verifyConnection(): Promise<boolean> {
        if (!resendApiKey) {
            console.error('[EMAIL] RESEND_API_KEY is not configured');
            return false;
        }
        return true;
    }
};
