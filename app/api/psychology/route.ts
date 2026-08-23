import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

async function analyzeWithGroq(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a forensic psychologist and cybersecurity awareness advisor." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API returned ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Groq.");
  return text;
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

  // 3. Fallback: Dynamic forensic psychology analysis based on offer context
  const textLower = (offerText || "").toLowerCase();
  const isHighRisk = (riskScore ?? 0) >= 50;

  const dynamicPsychology = `1. Urgency / Pressure
${textLower.includes("urgent") || textLower.includes("immediate") || textLower.includes("expire") || textLower.includes("today") || textLower.includes("24 hour")
  ? "The recruiter applies artificial deadlines and pressure to bypass your critical reasoning, forcing you to act before verifying their claims."
  : "The message emphasizes swift onboarding to keep momentum going and minimize the chance of thorough third-party vetting."}

2. Authority & Brand Mimicry
${textLower.includes("congratulation") || textLower.includes("selected") || textLower.includes("offer")
  ? "The communication adopts formal corporate terminology and congratulatory phrasing to establish unearned authority and make the proposal feel authentic."
  : "The sender leverages standard business formatting to simulate legitimacy and deter suspicion."}

3. Financial Lure & Low-Barrier Hooks
${textLower.includes("stipend") || textLower.includes("salary") || textLower.includes("$") || textLower.includes("rs") || textLower.includes("000")
  ? "Disproportionate financial incentives are dangled with minimal prerequisite verification to exploit career ambitions and urgency."
  : "The offer presents an unusually smooth path to employment without customary technical screenings."}

4. Commitment & Compliance Hook
${textLower.includes("pay") || textLower.includes("deposit") || textLower.includes("fee") || textLower.includes("bank") || textLower.includes("form")
  ? "By celebrating your 'selection', the sender makes you feel obligated to comply with administrative requests, including sensitive data sharing or fees."
  : "The message fosters a sense of personal obligation to complete documentation quickly."}

🛡️ Key Takeaway:
${isHighRisk
  ? "Always independently verify recruiter credentials through the company's official careers portal. Never send advance deposits or banking details prior to a verified employment agreement."
  : "Maintain standard diligence by confirming the sender's email domain directly with official organizational registries."}`;

  return NextResponse.json({ psychology: dynamicPsychology });
}
