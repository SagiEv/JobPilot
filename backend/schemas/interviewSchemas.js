const { z } = require('zod');

const createInterviewSchema = z.object({
    application_id: z.number().int().optional().nullable(),
    interview_date: z.string().optional().nullable(),
    interview_time: z.string().optional().nullable(),
    interview_type: z.string().optional(),
    with_who: z.string().optional(),
    notes: z.string().optional(),
    status: z.string().optional()
});

const updateInterviewSchema = z.object({
    application_id: z.number().int().optional().nullable(),
    interview_date: z.string().optional().nullable(),
    interview_time: z.string().optional().nullable(),
    interview_type: z.string().optional(),
    with_who: z.string().optional(),
    notes: z.string().optional(),
    status: z.string().optional()
});

module.exports = {
    createInterviewSchema,
    updateInterviewSchema
};
