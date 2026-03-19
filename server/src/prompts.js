export const buildResumePrompt = (spokenInput) => `You are an elite resume coach.
Convert the following spoken notes into a polished professional resume.

Rules:
- Use sections: Name, Professional Summary, Skills, Projects
- Keep wording concise and impactful
- Infer missing wording but do not invent fake companies
- Output plain text with clear headings

Spoken Input:
${spokenInput}`;

export const buildInterviewQuestionPrompt = ({ mode, history, lastAnswer }) => `You are acting as a ${mode} interviewer.

Rules:
- Ask exactly one interview question
- Keep it conversational and realistic
- Consider previous conversation for progression
- Return only the question text

Conversation so far:
${history || "No prior context."}

Candidate's last answer:
${lastAnswer || "No answer yet."}`;

export const buildFeedbackPrompt = ({ answer, role }) => `You are an interview evaluator.
Analyze this answer for the role: ${role || "General Software Role"}.

Return exactly this format:
Confidence: <short score and reason>
Clarity: <short reason>
Tips: <2 concise improvements>

Answer:
${answer}`;

export const buildImproveAnswerPrompt = ({ answer, mode }) => `Rewrite the following interview answer to be:
- more confident
- more professional
- better structured

Tone should suit interviewer mode: ${mode}
Keep it concise (max 140 words).

Original answer:
${answer}`;
