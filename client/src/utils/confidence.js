export const scoreConfidence = (answer = "") => {
    const words = answer.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const hasStructure = /\b(situation|task|action|result|first|then|finally|because|therefore)\b/i.test(answer);
    const hasMetric = /\d+\s*(%|percent|x|times|users|clients|days|weeks|months|hours|mins|minutes)/i.test(answer);
    const hasOwnership = /\b(i|my|led|built|implemented|designed|optimized|improved|delivered|owned)\b/i.test(answer);
    const hasOutcome = /\b(result|impact|improved|increased|reduced|saved|delivered|launched|achieved)\b/i.test(answer);
    const fillerMatches = answer.match(/\b(um|uh|like|you know|basically|sort of|kind of)\b/gi) || [];

    // Calibrated for interview answers: short but structured answers should not be overly penalized.
    let score = 35;
    score += Math.min(30, Math.round(wordCount * 0.45));
    if (hasStructure) score += 15;
    if (hasMetric) score += 10;
    if (hasOwnership) score += 5;
    if (hasOutcome) score += 8;

    if (wordCount < 20) score -= 18;
    if (wordCount < 35) score -= 8;
    score -= Math.min(12, fillerMatches.length * 2);

    score = Math.min(100, Math.max(10, score));

    if (score >= 80) {
        return { score, label: "High" };
    }

    if (score >= 55) {
        return { score, label: "Medium" };
    }

    return { score, label: "Low" };
};
