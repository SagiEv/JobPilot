// Average response time in days (configurable for maintenance)
export const AVERAGE_RESPONSE_DAYS = 14;

// Ghosting threshold is defined as twice the average response time
export const GHOSTING_THRESHOLD_DAYS = AVERAGE_RESPONSE_DAYS * 2;

export const APPLICATION_STATUSES = [
    'Applied',
    'Screening',
    'Assessment',
    'Interviewing',
    'Offer',
    'Hired',
    'Rejected',
    'Withdrawn',
    'Ignored',
];

export const INTERVIEW_STAGES = [
    'Recruiter / HR Screen',
    'Introduction Interview',
    'Online Test',
    'Home Assignment',
    'Technical Interview',
    'Coding Interview',
    'System Design Interview',
    'Behavioral / Culture Interview',
    'Hiring Manager Interview',
    'Final Interview / On-site',
    'Team Matching',
    'Reference Check',
    'Background Check',
];
