const z = require('zod');

// Rule 1: What a signup MUST look like
const signupSchema = z.object({
    email: z.string().email("That's not a real email, buddy!"),
    password: z.string().min(8, "Too short! Make it at least 8 characters."),
    username: z.string().min(3).max(15).optional()
});

// Rule 2: What a login MUST look like
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required")
});

module.exports = { signupSchema, loginSchema };