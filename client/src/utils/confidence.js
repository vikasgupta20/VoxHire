export const scoreConfidence = (answer = "") => {
    const words = answer.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const hasStructure = /\b(first|second|finally|result|impact|because)\b/i.test(answer);
    const hasMetric = /\d+[%x]|\d+\s*(users|days|weeks|months|hours|percent)/i.test(answer);

    let score = Math.min(100, wordCount * 2);
    if (hasStructure) score += 18;
    if (hasMetric) score += 12;

    score = Math.min(100, Math.max(5, score));

    if (score >= 80) {
        return { score, label: "High" };
    }

    if (score >= 55) {
        return { score, label: "Medium" };
    }

    return { score, label: "Low" };
};
