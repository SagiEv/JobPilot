const { z } = require('zod');

const updateSettingsSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    email_notifications: z.boolean().optional(),
    smtp_email: z.string().email("Invalid SMTP email").optional().or(z.literal('')),
    smtp_host: z.string().optional().or(z.literal('')),
    smtp_port: z.number().int().optional(),
    smtp_password: z.string().optional().or(z.literal('')),
    openai_token: z.string().optional().or(z.literal('')),
    anthropic_token: z.string().optional().or(z.literal('')),
    gemini_token: z.string().optional().or(z.literal('')),
    groq_token: z.string().optional().or(z.literal('')),
    deepseek_token: z.string().optional().or(z.literal('')),
    ai_provider: z.string().optional()
});

module.exports = {
    updateSettingsSchema
};
