const { z } = require('zod');

const createSkillSchema = z.object({
    name: z.string().min(1, "Name is required"),
    category: z.string().optional(),
    proficiency_level: z.string().optional()
});

const updateSkillSchema = z.object({
    name: z.string().optional(),
    category: z.string().optional(),
    proficiency_level: z.string().optional()
});

module.exports = {
    createSkillSchema,
    updateSkillSchema
};
