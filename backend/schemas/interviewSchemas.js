const { z } = require('zod');

const interviewBaseFields = {
    application_id: z.number().int().optional().nullable(),
    company: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
    stage: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    keep: z.union([z.array(z.string()), z.string()]).optional().nullable(),
    improve: z.union([z.array(z.string()), z.string()]).optional().nullable(),
    questions: z.string().optional().nullable(),
    feedback: z.string().optional().nullable(),
    interview_date: z.string().optional().nullable(),
    interview_time: z.string().optional().nullable(),
    interview_type: z.string().optional(),
    with_who: z.string().optional(),
    notes: z.string().optional(),
    status: z.string().optional()
};

const createInterviewSchema = z.object(interviewBaseFields);

const updateInterviewSchema = z.object(interviewBaseFields);

module.exports = {
    createInterviewSchema,
    updateInterviewSchema
};
