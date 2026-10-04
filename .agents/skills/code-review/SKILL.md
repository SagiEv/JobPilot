---
name: code-review
description: Performs a comprehensive code review to identify bad practices, bad smells, and breaking architecture rules, and generates a report.
version: 1.0.0
---

# Code Review Skill

Use this skill when the user asks you to "review the code", "do a code review", or "check for bad smells".

## Instructions

1. **Understand the Scope**: If the user doesn't specify a file or folder, ask them which part of the codebase they want reviewed (e.g., the whole backend, a specific feature branch, or recently changed files).
2. **Read the Rules**: Review the `/.agent/RULES.md` and `SERVICE_MAP.md` (and related architecture files) to understand the project's strict architecture requirements.
3. **Analyze the Code**: Use your `grep_search` and `view_file` tools to analyze the target files. Look specifically for:
   - **Architecture Violations**: Code that violates the `Route → Controller → Service → Repository` pattern. For example, controllers directly calling the database instead of a service, or services dealing with HTTP `req`/`res` objects.
   - **Error Handling**: Using `throw new Error()` instead of the standard `AppError(message, statusCode)`.
   - **Bad Smells**: 
     - **God Classes/Files**: Files that are far too large and do too many things.
     - **Duplicated Code**: Logic that is copy-pasted across multiple places instead of being extracted into a utility or shared service.
     - **Missing Async Wrappers**: Controllers missing `asyncHandler`.
   - **Security**: Hardcoded secrets or unvalidated inputs.
4. **Generate the Report**: Create a markdown artifact named `code_review_report.md` (or similar) using the `write_to_file` tool.
   - Structure the report with:
     - 🚀 **Summary of Findings**
     - 🏗 **Architecture Violations** (with file links and line numbers)
     - 👃 **Bad Smells & Tech Debt**
     - 💡 **Actionable Recommendations**
5. **Present**: Inform the user that the review is complete and point them to the artifact. Ask if they want you to automatically fix any of the found issues.
