const { z } = require('zod');

const createContactSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format").optional().or(z.literal('')),
    phone: z.string().optional(),
    company: z.string().optional(),
    role: z.string().optional(),
    notes: z.string().optional(),
    linkedin: z.string().url("Must be a valid URL").optional().or(z.literal('')),
    application_id: z.number().int().optional().nullable()
});

const updateContactSchema = z.object({
    name: z.string().optional(),
    email: z.string().email("Invalid email format").optional().or(z.literal('')),
    phone: z.string().optional(),
    company: z.string().optional(),
    role: z.string().optional(),
    notes: z.string().optional(),
    linkedin: z.string().url("Must be a valid URL").optional().or(z.literal('')),
    application_id: z.number().int().optional().nullable()
});

module.exports = {
    createContactSchema,
    updateContactSchema
};
