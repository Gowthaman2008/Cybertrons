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

  if (!groqApiKey && !geminiApiKey) {
    return NextResponse.json({ error: "AI API Key is not configured." }, { status: 503 });
  }

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
  if (geminiApiKey) {
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

  return NextResponse.json({ error: "Failed to generate psychology analysis." }, { status: 500 });
}
