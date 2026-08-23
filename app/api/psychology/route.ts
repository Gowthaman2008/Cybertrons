import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

async function analyzeWithGroq(apiKey: string, prompt: string): Promise<string> {
  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "gemma2-9b-it",
    "mixtral-8x7b-32768"
  ];

  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a forensic psychologist and cybersecurity awareness advisor." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (e) {
      // Continue to next model
    }
  }

  throw new Error("All Groq models failed for psychology analysis.");
}

export async function POST(req: NextRequest) {
  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { offerText, companyName, verdict, riskScore } = body;

  const prompt = `You are a forensic psychologist and cybersecurity awareness advisor. Analyze the following job/internship offer letter (or conversational transcript) to explain the social engineering and psychological manipulation tactics being utilized by the sender.
The offer text is:
"${offerText || "No text provided (Image upload scan)"}"
Company: "${companyName || "Unknown"}"
Verdict: ${verdict} (Risk Score: ${riskScore}%)

Identify which of these psychological triggers are active in the message, and write a 2-3 sentence explanation for each active trigger, addressed to a student in an educational, supportive, and warning tone:
1. Urgency / Pressure (creating panic or forcing quick decisions)
2. Authority / Professionalism (fake credentials, mimicry of major brands)
3. Greed / Financial Lure (offering disproportionately high salaries for low-skill tasks)
4. Guilt / Commitment Hook (making them feel obliged because they were 'selected')

Provide a final short key takeaway on how the student can counter these psychological traps (e.g., verify independently, consult university advisers).`;

  // 1. Try Groq AI first
  if (groqApiKey && groqApiKey.trim().length > 0) {
    try {
      const psychology = await analyzeWithGroq(groqApiKey.trim(), prompt);
      return NextResponse.json({ psychology });
    } catch (groqErr) {
      console.warn("Groq psychology analysis failed, trying Gemini fallback:", groqErr);
    }
  }

  // 2. Fall back to Gemini
  if (geminiApiKey && !geminiApiKey.startsWith("AQ.Ab8RN6") && geminiApiKey.trim().length > 0) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text;
      if (text) {
        return NextResponse.json({ psychology: text });
      }
    } catch (geminiErr) {
      console.error("Gemini psychology analysis failed:", geminiErr);
    }
  }

  // 3. Fallback: Deep contextual forensic psychology analysis based on offer details
  const textLower = (offerText || "").toLowerCase();
  const isHighRisk = (riskScore ?? 0) >= 50;

  // Extract contextual cues
  const salaryMatch = (offerText || "").match(/(?:[$₹£]|rs\.?|inr|usd)\s*[\d,]+(?:\s*(?:per|\/)\s*(?:month|year|week|hr|day|annum|pm|pa))?/i);
  const urgencyMatch = (offerText || "").match(/(?:immediate(?:ly)?|urgent(?:ly)?|within \d+ (?:hours?|days?)|expire[s]?|today|asap|deadline)/i);
  const feeMatch = (offerText || "").match(/(?:deposit|registration|security fee|training fee|processing fee|laptop fee|courier|refundable)/i);
  const domainMatch = (offerText || "").match(/[\w.-]+@(?:gmail|yahoo|hotmail|outlook|live|proton|zoho)\.com/i);

  const sections: string[] = [];

  // Section 1: Urgency / Scarcity
  if (urgencyMatch) {
    sections.push(`1. Artificial Scarcity & Temporal Panic (${urgencyMatch[0]})
The sender deliberately injects manufactured urgency (e.g. "${urgencyMatch[0]}") to trigger fear of missing out (FOMO). By inducing cognitive overload, they attempt to force an impulsive commitment before you can verify credentials.`);
  } else {
    sections.push(`1. Rapid Onboarding Illusion
The message minimizes customary recruitment latency to maintain momentum, subtly discouraging the candidate from consulting career mentors or performing domain checks.`);
  }

  // Section 2: Authority & Brand Hijacking
  if (domainMatch) {
    sections.push(`2. Authority Mimicry & Shadow Channels (${domainMatch[0]})
The recruiter claims corporate representation while operating from a free webmail handle (${domainMatch[0]}). This is a classic pretexting technique designed to project professional authority while evading corporate email audit trails.`);
  } else if (companyName && companyName !== "Unknown") {
    sections.push(`2. Brand Pretexting (${companyName})
The communication invokes the name of "${companyName}" as an authority shield, exploiting the trust and goodwill of established institutions to lower your natural skepticism.`);
  } else {
    sections.push(`2. Perceived Legitimacy & Corporate Pretext
The communication adopts formal corporate framing and HR terminology to establish unearned authority and simulate a legitimate hiring process.`);
  }

  // Section 3: Financial Bait & Effort Distortion
  if (salaryMatch) {
    sections.push(`3. Anchor Lure & Financial Disproportion (${salaryMatch[0]})
The prominent advertisement of "${salaryMatch[0]}" serves as a psychological anchor. High compensation for loosely defined responsibilities is engineered to trigger dopamine and motivate risk-taking behavior.`);
  } else {
    sections.push(`3. Low-Barrier Reward Hook
The offer provides immediate gratification with minimal technical screening, creating an irresistible value proposition that bypasses normal due diligence.`);
  }

  // Section 4: Commitment Escalation & Sunk Cost
  if (feeMatch) {
    sections.push(`4. Sunk Cost & Fee Extortion Trap (${feeMatch[0]})
The request for a "${feeMatch[0]}" leverages the psychological commitment of being 'selected'. Scammers use small upfront payments to initiate a sunk-cost trap where victims continue paying to protect previous investments.`);
  } else {
    sections.push(`4. Compliance Hook & Reciprocity
By congratulating you on your 'selection', the sender induces a psychological sense of obligation, making you more compliant when subsequent requests for sensitive personal data are made.`);
  }

  // Final Takeaway
  sections.push(`🛡️ Forensic Psychology Takeaway:
${isHighRisk
  ? "This message exhibits high-probability social engineering vectors designed to exploit career aspirations. Stop communication immediately and never transfer money or share identification documents."
  : "While moderate in tone, maintain healthy skepticism: verify the recruiter independently via official corporate directories before proceeding."}`);

  return NextResponse.json({ psychology: sections.join("\n\n") });
}
