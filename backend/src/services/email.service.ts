import nodemailer from 'nodemailer';

// Create a transporter using SMTP settings from env variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const emailService = {
    sendPasswordResetEmail: async (to: string, token: string) => {
        try {
            const info = await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Nice Digital Team" <noreply@nicedigital.com>',
                to,
                subject: 'Password Reset Request - Nice Digital',
                text: `You requested a password reset. Your reset code is: ${token}\n\nThis code expires in 1 hour.`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #4F46E5;">Password Reset Request</h2>
                        <p>You requested a password reset for your Nice Digital account.</p>
                        <p>Your verification code is:</p>
                        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                            <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111827;">${token}</span>
                        </div>
                        <p>This code will expire in 1 hour.</p>
                        <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
                    </div>
                `,
            });
            console.log(`[EMAIL] Reset email sent to ${to}: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error('[EMAIL] Failed to send reset email:', error);
            // Don't throw, just return false so we don't crash requests
            return false;
        }
    },

    verifyConnection: async () => {
        try {
            await transporter.verify();
            console.log('[EMAIL] SMTP connection established successfully');
            return true;
        } catch (error) {
            console.error('[EMAIL] FATAL: Unable to connect to SMTP server:', error);
            return false;
        }
    }
};
