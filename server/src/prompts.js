export const buildResumePrompt = ({ spokenInput, language = "en-US" }) => `You are an elite resume coach.
Convert the following spoken notes into a polished professional resume.

Rules:
- Use sections: Name, Professional Summary, Skills, Projects
- Keep wording concise and impactful
- Infer missing wording but do not invent fake companies
- Output plain text with clear headings
- Return the output in language locale: ${language}

Spoken Input:
${spokenInput}`;

export const buildInterviewQuestionPrompt = ({
    mode,
    history,
    lastAnswer,
    askedQuestions,
    language = "en-US",
}) => `You are acting as a ${mode} interviewer.

Rules:
- Ask exactly one interview question
- Keep it conversational and realistic
- Consider previous conversation for progression
- The next question must depend on the candidate's last answer
- Do not repeat or rephrase already asked questions
- If the last answer is strong, ask a deeper follow-up
- If the last answer is vague, ask a clarifying follow-up
- Return only the question text
- Generate the question in language locale: ${language}

Conversation so far:
${history || "No prior context."}

Candidate's last answer:
${lastAnswer || "No answer yet."}

Asked questions to avoid repeating:
${askedQuestions?.length ? askedQuestions.join("\n") : "None"}`;

export const buildFeedbackPrompt = ({ answer, role, language = "en-US" }) => `You are an interview evaluator.
Analyze this answer for the role: ${role || "General Software Role"}.

Scoring rubric for confidence (1-10):
- 9-10: clear ownership, strong structure, specific impact/metrics, professional tone
- 7-8: good answer with minor gaps in structure or specificity
- 5-6: somewhat correct but vague, weak ownership, limited impact
- 1-4: unclear, off-topic, or very weak communication

Return exactly this format:
Confidence: <score>/10 - <short reason>
Clarity: <short reason>
Tips: <2 concise improvements>

Return the content in language locale: ${language}

Answer:
${answer}`;

export const buildImproveAnswerPrompt = ({ answer, mode, language = "en-US" }) => `Rewrite the following interview answer to be:
- more confident
- more professional
- better structured

Tone should suit interviewer mode: ${mode}
Keep it concise (max 140 words).
Return in language locale: ${language}

Original answer:
${answer}`;
