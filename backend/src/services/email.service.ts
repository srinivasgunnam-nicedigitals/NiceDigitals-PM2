import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

const resend = new Resend(resendApiKey);

interface SendPasswordResetOptions {
  to: string;
  resetToken: string;
}

export async function sendPasswordResetEmail({
  to,
  resetToken,
}: SendPasswordResetOptions): Promise<void> {
  try {
    if (!to) {
      throw new Error('Recipient email is required');
    }

    if (!resetToken) {
      throw new Error('Reset token is required');
    }

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL is not defined');
    }

    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const response = await resend.emails.send({
      from: 'onboarding@resend.dev', // Change after domain verification
      to,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Password Reset</h2>
          <p>You requested a password reset.</p>
          <p>Click the button below to reset your password:</p>
          <a 
            href="${resetUrl}" 
            style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
            Reset Password
          </a>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (response.error) {
      console.error('Resend API error:', response.error);
      throw new Error('Failed to send password reset email');
    }

    console.log(`Password reset email sent to ${to}`);
  } catch (error) {
    console.error('Email service error:', error);
    throw error; // Let controller decide response
  }
}
