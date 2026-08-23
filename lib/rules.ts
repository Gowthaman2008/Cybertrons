/**
 * Rule-based red-flag detector.
 *
 * This runs entirely locally (no network call, no API cost) and produces a
 * deterministic list of RuleFlag objects plus a 0-100 "rule score". It is the
 * first pass in the pipeline — fast and explainable — before the offer text
 * and its flags are handed to the LLM layer (lib/llm.ts) for a natural-
 * language read and a final risk score.
 *
 * Design notes for judges / reviewers:
 * - Every check below is intentionally simple and auditable (keyword lists,
 *   regexes, small heuristics) rather than a black box, because the whole
 *   point of this layer is to be a transparent, always-available baseline
 *   even if the LLM call fails or is rate-limited.
 * - Each check contributes a fixed severity weight. The final rule score is
 *   the sum of triggered weights, capped at 100.
 */

import { OfferInput, RuleFlag, Severity } from "./types";

const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 10,
  medium: 25,
  high: 45,
};

/** Common free/consumer email providers — legitimate employers rarely recruit from these. */
const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.in",
  "hotmail.com",
  "outlook.com",
  "rediffmail.com",
  "protonmail.com",
  "icloud.com",
  "aol.com",
];

/** Known URL-shortener domains commonly used to mask a phishing destination. */
const LINK_SHORTENERS = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "is.gd",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "rb.gy",
  "buff.ly",
  "tiny.cc",
];

/** Phrases that ask for money before any work has been verified. */
const UPFRONT_PAYMENT_PATTERNS = [
  /registration\s+fee/i,
  /processing\s+fee/i,
  /security\s+deposit/i,
  /refundable\s+deposit/i,
  /pay(?:ment)?\s+(?:of\s+)?(?:rs\.?|inr|₹|\$)\s?\d/i,
  /activation\s+(?:fee|charges?)/i,
  /training\s+(?:fee|kit\s+charges?)/i,
  /kindly\s+(?:transfer|pay|deposit)/i,
  /courier\s+charges?\s+(?:required|applicable)/i,
];

/** Phrases signaling no real vetting takes place — a hallmark of mass scam blasts. */
const NO_INTERVIEW_PATTERNS = [
  /no\s+interview(?:s)?\s+(?:required|needed)/i,
  /without\s+(?:any\s+)?interview/i,
  /direct(?:ly)?\s+selected/i,
  /100%\s+(?:job\s+)?guarantee/i,
  /guaranteed\s+(?:placement|job|selection)/i,
];

/** Manufactured urgency to short-circuit careful thinking. */
const URGENCY_PATTERNS = [
  /act\s+now/i,
  /limited\s+slots?/i,
  /only\s+\d+\s+(?:seats?|slots?|positions?)\s+left/i,
  /offer\s+expires?\s+(?:today|soon|in\s+\d+\s+hours?)/i,
  /respond\s+within\s+\d+\s+(?:hours?|minutes?)/i,
  /hurry/i,
  /immediate(?:ly)?\s+join(?:ing)?/i,
];

/** Generic salutations used in mass-sent scam messages instead of a real name. */
const GENERIC_GREETING_PATTERNS = [
  /dear\s+candidate/i,
  /dear\s+applicant/i,
  /dear\s+job\s*seeker/i,
  /dear\s+sir\s*\/\s*madam/i,
  /respected\s+candidate/i,
];

/** Requests for sensitive personal/financial data that a legitimate employer would not need pre-hire. */
const SENSITIVE_INFO_PATTERNS = [
  /\baadhaar?\b/i,
  /\bpan\s*card\b/i,
  /\botp\b/i,
  /bank\s+account\s+(?:number|details)/i,
  /\bifsc\b/i,
  /\bcvv\b/i,
  /debit\s+card\s+(?:number|pin)/i,
  /credit\s+card\s+(?:number|pin)/i,
  /\bupi\s+pin\b/i,
];

/** Payment rails favored by scammers because they're hard to reverse or trace. */
const SUSPICIOUS_PAYMENT_RAILS = [
  /gift\s*card/i,
  /google\s+pay\s+link/i,
  /crypto(?:currency)?\s+(?:payment|wallet)/i,
  /western\s+union/i,
  /wire\s+transfer\s+to/i,
];

/** Unrealistic-earnings phrasing common in "work from home" scam blasts. */
const UNREALISTIC_EARNINGS_PATTERNS = [
  /earn\s+(?:rs\.?|inr|₹|\$)\s?\d{3,}\s*(?:\/|\s+per\s+)?\s*(?:day|hour)/i,
  /no\s+experience.{0,20}earn/i,
  /(?:rs\.?|inr|₹)\s?\d{2,3},?\d{3}\s*\/?\s*(?:day|week)\b/i,
];

function findFirstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return undefined;
}

function anyMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

/** Extract the domain portion of an email address, lowercased. Returns null if not a plausible email. */
function extractEmailDomain(email?: string): string | null {
  if (!email) return null;
  const m = email.trim().toLowerCase().match(/@([a-z0-9.-]+\.[a-z]{2,})$/);
  return m ? m[1] : null;
}

/** Very rough slug-ify of a company name for domain comparison ("Tech Nova Pvt Ltd" -> "technova"). */
function slugifyCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(pvt|ltd|private|limited|inc|llc|corp|corporation|co)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function detectLinks(text: string): { urls: string[]; shortenerHit: string | null } {
  const urlRegex = /\bhttps?:\/\/[^\s)]+|\bwww\.[^\s)]+/gi;
  const urls = text.match(urlRegex) ?? [];
  const shortenerHit =
    urls.find((u) => LINK_SHORTENERS.some((d) => u.toLowerCase().includes(d))) ?? null;
  return { urls, shortenerHit };
}

/**
 * Rough grammar/spelling-density heuristic. This is deliberately lightweight
 * (no external NLP dependency) — it looks for surface signals that correlate
 * with hastily-written scam blasts: runs of excess punctuation/capitals,
 * spacing errors, and a small list of frequently-misspelled recruiting terms.
 */
function grammarQualityFlag(text: string): RuleFlag | null {
  let hits = 0;
  const signals: string[] = [];

  if (/!{2,}/.test(text)) {
    hits++;
    signals.push("repeated exclamation marks");
  }
  if (/[A-Z]{6,}/.test(text.replace(/\bhttps?:\/\/\S+/gi, ""))) {
    hits++;
    signals.push("long stretches of ALL CAPS");
  }
  if (/\s{2,}[a-z]/.test(text)) {
    hits++;
    signals.push("irregular spacing");
  }
  const misspellingList = [
    "recieve",
    "seperate",
    "immediatly",
    "untill",
    "acheive",
    "guarentee",
    "collge",
    "compnay",
    "salery",
    "aplicant",
    "sftware",
    "devloper",
    "solutins",
    "intervue",
    "vaction",
    "sallary",
    "benifits"
  ];
  const foundMisspelling = misspellingList.find((w) =>
    new RegExp(`\\b${w}\\b`, "i").test(text)
  );
  if (foundMisspelling) {
    hits++;
    signals.push(`likely misspelling ("${foundMisspelling}")`);
  }

  if (hits >= 2) {
    return {
      id: "grammar-quality",
      label: "Unpolished writing",
      explanation:
        "The message shows several signs of hasty or non-professional writing (" +
        signals.join(", ") +
        "). Legitimate corporate communications are usually proofread.",
      severity: "low",
    };
  }
  return null;
}

/**
 * Run every rule against the offer input and return the resulting flags.
 * Pure function — no I/O, no randomness — so it's easy to unit test and to
 * reason about in a hackathon demo/judging setting.
 */
export function runRuleBasedChecks(input: OfferInput): RuleFlag[] {
  const text = input.offerText ?? "";
  const flags: RuleFlag[] = [];

  // 1. Upfront payment requests — one of the strongest scam signals.
  const paymentEvidence = findFirstMatch(text, UPFRONT_PAYMENT_PATTERNS);
  if (paymentEvidence) {
    flags.push({
      id: "upfront-payment",
      label: "Requests upfront payment",
      explanation:
        "The message asks for money (a fee, deposit, or charge) before any work has started. Legitimate employers never ask candidates to pay to be hired.",
      severity: "high",
      evidence: paymentEvidence,
    });
  }

  // 2. "No interview needed" / guaranteed placement.
  const noInterviewEvidence = findFirstMatch(text, NO_INTERVIEW_PATTERNS);
  if (noInterviewEvidence) {
    flags.push({
      id: "no-interview",
      label: "Skips normal hiring process",
      explanation:
        "The offer claims you're selected without an interview or guarantees placement outright. Real hiring almost always involves some vetting step.",
      severity: "high",
      evidence: noInterviewEvidence,
    });
  }

  // 3. Urgency / pressure language.
  const urgencyEvidence = findFirstMatch(text, URGENCY_PATTERNS);
  if (urgencyEvidence) {
    flags.push({
      id: "urgency-pressure",
      label: "Manufactured urgency",
      explanation:
        "Phrases pressuring you to respond immediately or claiming limited slots are a common tactic to stop you from checking the offer carefully.",
      severity: "medium",
      evidence: urgencyEvidence,
    });
  }

  // 4. Unrealistic earnings for casual/low-skill work.
  const earningsEvidence = findFirstMatch(text, UNREALISTIC_EARNINGS_PATTERNS);
  if (earningsEvidence) {
    flags.push({
      id: "unrealistic-earnings",
      label: "Unrealistic pay for the effort described",
      explanation:
        "The stated earnings look disproportionate to the described role or required experience — a classic sign of a too-good-to-be-true pitch.",
      severity: "medium",
      evidence: earningsEvidence,
    });
  }

  // 5. Generic greeting.
  const greetingEvidence = findFirstMatch(text, GENERIC_GREETING_PATTERNS);
  if (greetingEvidence) {
    flags.push({
      id: "generic-greeting",
      label: "Generic, mass-sent greeting",
      explanation:
        '"' +
        greetingEvidence +
        '" suggests this message was blasted to many recipients rather than personally addressed to you.',
      severity: "low",
      evidence: greetingEvidence,
    });
  }

  // 6. Sender email domain checks: free-mail domain, and/or mismatch with claimed company.
  const senderDomain = extractEmailDomain(input.senderEmail);
  if (senderDomain) {
    if (FREE_EMAIL_DOMAINS.includes(senderDomain)) {
      flags.push({
        id: "free-email-domain",
        label: "Sent from a free email provider",
        explanation: `The sender address uses ${senderDomain}, a free consumer email service. Established companies almost always recruit from their own company domain.`,
        severity: "medium",
        evidence: senderDomain,
      });
    } else if (input.companyName) {
      const companySlug = slugifyCompany(input.companyName);
      const domainSlug = senderDomain.split(".")[0].replace(/[^a-z0-9]/g, "");
      if (companySlug.length >= 3 && !domainSlug.includes(companySlug.slice(0, Math.min(6, companySlug.length)))) {
        flags.push({
          id: "domain-mismatch",
          label: "Sender domain doesn't match company name",
          explanation: `The email domain (${senderDomain}) doesn't obviously match the claimed company name ("${input.companyName}"). Worth double-checking against the company's official website.`,
          severity: "medium",
          evidence: senderDomain,
        });
      }
    }
  }

  // 7. Poor grammar / spelling density heuristic.
  const grammarFlag = grammarQualityFlag(text);
  if (grammarFlag) flags.push(grammarFlag);

  // 8. Suspicious links (shorteners) in the body.
  const { shortenerHit } = detectLinks(text);
  if (shortenerHit) {
    flags.push({
      id: "shortened-link",
      label: "Shortened / obscured link",
      explanation:
        "The message includes a shortened URL, which hides the real destination and is a common way to disguise a phishing site.",
      severity: "medium",
      evidence: shortenerHit,
    });
  }

  // 9. Requests for sensitive personal or financial info upfront.
  const sensitiveEvidence = findFirstMatch(text, SENSITIVE_INFO_PATTERNS);
  if (sensitiveEvidence) {
    flags.push({
      id: "sensitive-info-request",
      label: "Requests sensitive personal/financial info",
      explanation:
        "The message asks for information like bank details, ID numbers, or OTPs before you've even joined. No legitimate employer needs this pre-hire, and OTPs should never be shared with anyone.",
      severity: "high",
      evidence: sensitiveEvidence,
    });
  }

  // 10. Suspicious/irreversible payment rails.
  const railEvidence = findFirstMatch(text, SUSPICIOUS_PAYMENT_RAILS);
  if (railEvidence) {
    flags.push({
      id: "suspicious-payment-rail",
      label: "Untraceable payment method mentioned",
      explanation:
        "Gift cards, crypto, or wire transfers are favored by scammers because payments are hard to trace or reverse. Legitimate employers don't ask new hires to pay this way.",
      severity: "high",
      evidence: railEvidence,
    });
  }

  // 11. Calendar date anomalies (e.g. "Septembre 43rd" or "Feb 35")
  const dateDayMatch = text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{2,})(?:st|nd|rd|th)?\b/i);
  if (dateDayMatch) {
    const dayNum = parseInt(dateDayMatch[1], 10);
    if (dayNum > 31) {
      flags.push({
        id: "impossible-date",
        label: "Impossible calendar date",
        explanation: `The offer lists an impossible date ("${dateDayMatch[0]}"), indicating an automated or forged template.`,
        severity: "high",
        evidence: dateDayMatch[0],
      });
    }
  }

  // 12. Contradictory salary period specifications (e.g. "$85,000 / month / year")
  const salaryContradiction = text.match(/\b(?:\d{2,3},?\d{3})\s*\/?\s*month\s*\/?\s*year\b/i) || text.match(/\b(?:\d{2,3},?\d{3})\s*\/?\s*month\s*or\s*year\b/i);
  if (salaryContradiction) {
    flags.push({
      id: "salary-contradiction",
      label: "Conflicting pay periods",
      explanation: `The salary details ("${salaryContradiction[0]}") list conflicting monthly and yearly terms.`,
      severity: "medium",
      evidence: salaryContradiction[0],
    });
  }

  // 13. Contradictory job classification (e.g. "Full-Tiem / Sometime part-time")
  const jobTypeContradiction = text.match(/full[- ]time\s*\/?\s*(?:some\s*times?\s*)?part[- ]time/i) || text.match(/full[- ]tiem\s*\/?\s*(?:some\s*times?\s*)?part[- ]time/i);
  if (jobTypeContradiction) {
    flags.push({
      id: "job-type-contradiction",
      label: "Conflicting job classification",
      explanation: `The position specifier ("${jobTypeContradiction[0]}") claims to be full-time and part-time simultaneously.`,
      severity: "medium",
      evidence: jobTypeContradiction[0],
    });
  }

  // 14. Email extraction and domain security check inside body text
  const emailRegex = /[a-zA-Z0-9.-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  let emailMatch;
  while ((emailMatch = emailRegex.exec(text)) !== null) {
    const fullEmail = emailMatch[0];
    const domain = emailMatch[1].toLowerCase();
    
    const isFreeDomain = FREE_EMAIL_DOMAINS.includes(domain);
    const isSuspiciousTld = /\.(xyz|top|work|info|click|live|today|online|icu|bid|club)$/i.test(domain);
    
    if (isFreeDomain && !flags.some(f => f.id === "free-email-domain")) {
      flags.push({
        id: "free-email-domain",
        label: "Recruits via free email provider",
        explanation: `The email address mentioned in the text (${fullEmail}) uses a free consumer domain (${domain}).`,
        severity: "medium",
        evidence: fullEmail,
      });
    } else if (isSuspiciousTld && !flags.some(f => f.id === "suspicious-tld")) {
      flags.push({
        id: "suspicious-tld",
        label: "Suspicious domain extension",
        explanation: `The email address mentioned (${fullEmail}) uses a cheap top-level suffix (.${domain.split('.').pop()}) often associated with temporary fraud domains.`,
        severity: "medium",
        evidence: fullEmail,
      });
    }
  }

  return flags;
}

/** Sum severity weights across all triggered flags, capped at 100 with dynamic high-severity scaling. */
export function computeRuleScore(flags: RuleFlag[]): number {
  if (flags.length === 0) return 0;
  const rawSum = flags.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0);

  const hasHigh = flags.some((f) => f.severity === "high");
  const numMedium = flags.filter((f) => f.severity === "medium").length;

  if (hasHigh && flags.length >= 2) {
    return Math.min(100, Math.max(82, rawSum));
  } else if (hasHigh) {
    return Math.min(100, Math.max(70, rawSum));
  } else if (numMedium >= 2) {
    return Math.min(100, Math.max(65, rawSum));
  }

  return Math.min(100, rawSum);
}

export { SEVERITY_WEIGHT };
