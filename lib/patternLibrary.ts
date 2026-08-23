/**
 * Scam Pattern Library and Cosine Similarity Matcher.
 *
 * Curates 10 distinct scam template profiles. Computes a JS-native
 * Cosine Similarity score on TF-IDF vectors to match any scanned offer text against
 * the historical library.
 */

export interface ScamPattern {
  patternName: string;
  templateText: string;
  description: string;
}

const PATTERNS: ScamPattern[] = [
  {
    patternName: "Upfront Security Fee / Materials Deposit",
    templateText: "Selected for Remote Data Entry. Earn high wages. Send ₹2000 registration fee or security deposit for training software, server keys, or laptop courier delivery. Refundable with first salary.",
    description: "The classic 'advance-fee' scam where scammers pretend to hire you but require an upfront payment for training, background checks, or shipping work laptops."
  },
  {
    patternName: "Task-based Social Media Engagement (YouTube/Netflix Likes)",
    templateText: "Earn money from home by liking YouTube videos or Netflix shows. Earn ₹3000 to ₹5000 per day. No experience. Contact Telegram HR support. We send you commissions to your bank account or secure wallet link.",
    description: "Fraudsters pay tiny commissions initially to build trust, then lock your earnings until you deposit massive amounts of your own money to unlock 'high-level VIP tasks'."
  },
  {
    patternName: "Identity Theft & Banking Harvesting",
    templateText: "Pleased to offer you the Software Intern role immediately. To set up direct deposit and confirm credentials pre-hire, email your Aadhaar card copy, PAN card scanner, bank details, and the OTP code sent to your phone.",
    description: "A phishing scam disguised as onboarding designed to gather sufficient personal documentation and credentials to open lines of credit or hack bank accounts."
  },
  {
    patternName: "Fake Check Overpayment / Gift Card Mule",
    templateText: "We are shipping you a home office check worth $3000. Cash it at your bank, buy Apple gift cards, Google Play cards, or crypto, and send them to our vendor coordinator. Keep $500 as sign-on bonus.",
    description: "The fraudster sends you a counterfeit check. You deposit it and cash out, buying untraceable gift cards/crypto. Within days, the check bounces, and you are held liable by your bank."
  },
  {
    patternName: "Generic Text-based Skype/Telegram Recruitment",
    templateText: "We noticed your profile on recruitment websites. We want to conduct a text-based interview on Skype chat immediately. Selected on the spot. Standard software tester or virtual assistant opening.",
    description: "Scammers use automated scripts to conduct text-based chat interviews, bypassing video/voice filters to immediately offer jobs and initiate advance-fee payroll scams."
  },
  {
    patternName: "Unpaid Certificate Mill / Mass Automation",
    templateText: "Congratulations, you are selected for Web Developer or Cybersecurity internship at our online portal. Starts immediately. Get certified by submitting projects. Certificate fee applies to claim your final letter.",
    description: "Platforms that automate internships to mass enroll students. They offer zero human mentoring, require students to build standard templates, and often charge hidden fees to claim certificates."
  },
  {
    patternName: "Online Review & Booking Phishing",
    templateText: "Help hotels and restaurants boost ratings. Work online 1 hour a day. Earn commission instantly. Deposit RS 1000 to start booking simulation tasks and earn ₹1200 back. Guaranteed placement.",
    description: "A variant of task scams where users are asked to make mock hotel bookings/purchases using their own money to inflate ratings, only for the scammer to disappear once deposits grow large."
  },
  {
    patternName: "Fake Lottery / Prize Agent Placement",
    templateText: "Congratulations! You have won the national recruitment lottery and earned a placement slot. To claim your position and ₹50,000 cash grant, transfer the government processing fee to our registration officer.",
    description: "Uses a lottery ticket hook to bypass standard recruitment guidelines, requiring a processing or validation fee to claim the 'guaranteed prize position'."
  }
];

// Simple tokenizer ignoring stop words
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Compute Cosine Similarity between TF vectors of two token arrays
function computeCosineSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // Build unique terms vocabulary for these two strings
  const vocab = Array.from(new Set([...tokensA, ...tokensB]));

  // Term Frequency counts
  const countA: Record<string, number> = {};
  const countB: Record<string, number> = {};
  tokensA.forEach((w) => (countA[w] = (countA[w] || 0) + 1));
  tokensB.forEach((w) => (countB[w] = (countB[w] || 0) + 1));

  // Build vectors
  const vecA = vocab.map((w) => countA[w] || 0);
  const vecB = vocab.map((w) => countB[w] || 0);

  // Compute Cosine formula: (A . B) / (||A|| * ||B||)
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vocab.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/**
 * Finds the closest matching scam profile from the pattern library
 * based on Cosine Similarity. Returns matching results or null if similarity is below 15%.
 */
export function findClosestPattern(text: string) {
  try {
    const inputTokens = tokenize(text);
    if (inputTokens.length === 0) return null;

    let bestMatch: ScamPattern | null = null;
    let highestScore = 0;

    PATTERNS.forEach((pattern) => {
      const patternTokens = tokenize(pattern.templateText);
      const similarity = computeCosineSimilarity(inputTokens, patternTokens);
      if (similarity > highestScore) {
        highestScore = similarity;
        bestMatch = pattern;
      }
    });

    // Score from 0 to 100
    const roundedScore = Math.round(highestScore * 100);

    if (bestMatch && roundedScore >= 15) {
      return {
        patternName: (bestMatch as ScamPattern).patternName,
        similarityScore: roundedScore,
        description: (bestMatch as ScamPattern).description,
      };
    }

    return null;
  } catch (err) {
    console.error("Pattern matcher similarity runtime error:", err);
    return null;
  }
}
