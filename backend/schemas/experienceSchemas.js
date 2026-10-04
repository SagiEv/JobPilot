const { z } = require('zod');

const createExperienceSchema = z.object({
    title: z.string().min(1, "Title is required"),
    company: z.string().optional(),
    location: z.string().optional(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    is_current: z.boolean().optional(),
    description: z.string().optional(),
    technologies: z.array(z.string()).optional(),
    url: z.string().url("Must be a valid URL").optional().or(z.literal(''))
});

const updateExperienceSchema = z.object({
    title: z.string().optional(),
    company: z.string().optional(),
    location: z.string().optional(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    is_current: z.boolean().optional(),
    description: z.string().optional(),
    technologies: z.array(z.string()).optional(),
    url: z.string().url("Must be a valid URL").optional().or(z.literal(''))
});

module.exports = {
    createExperienceSchema,
    updateExperienceSchema
};
