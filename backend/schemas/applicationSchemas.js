const { z } = require('zod');

const createApplicationSchema = z.object({
    company: z.string().min(1, "Company is required"),
    role: z.string().min(1, "Role is required"),
    url: z.string().url("Must be a valid URL").optional().or(z.literal('')),
    location: z.string().optional(),
    status: z.string().optional(), // 'Interested', 'Applied', etc.
    stage: z.string().optional(),
    salary_range: z.string().optional(),
    info: z.string().optional(), // Job description for fit analysis
    notes: z.string().optional(),
    color: z.string().optional()
});

const updateApplicationSchema = z.object({
    company: z.string().optional(),
    role: z.string().optional(),
    url: z.string().url("Must be a valid URL").optional().or(z.literal('')),
    location: z.string().optional(),
    status: z.string().optional(),
    stage: z.string().optional(),
    salary_range: z.string().optional(),
    info: z.string().optional(),
    notes: z.string().optional(),
    color: z.string().optional()
});

module.exports = {
    createApplicationSchema,
    updateApplicationSchema
};
