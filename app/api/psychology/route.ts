import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API Key is not configured." }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { offerText, companyName, verdict, riskScore } = body;

  const ai = new GoogleGenAI({ apiKey });

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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from model.");
    }

    return NextResponse.json({ psychology: text });
  } catch (err: any) {
    console.error("Psychology explanation failed:", err);
    return NextResponse.json({ error: "Failed to generate psychology analysis." }, { status: 500 });
  }
}
