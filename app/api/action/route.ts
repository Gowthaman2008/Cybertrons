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

  const { actionType, offerText, companyName, riskScore, verdict, explanation, additionalFlags } = body;

  if (actionType !== "rejection" && actionType !== "report") {
    return NextResponse.json({ error: "Invalid actionType." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });

  let prompt = "";
  if (actionType === "rejection") {
    prompt = `You are helping a student draft a safe, polite, and firm rejection message to a job/internship offer that was flagged as a potential scam (Risk Score: ${riskScore}%, Verdict: ${verdict}).
The offer text (or context) was:
"${offerText || "No text provided (Image upload scan)"}"
The claimed company name was: "${companyName || "Unknown"}"

AI Assessment details:
Explanation: ${explanation || ""}
Additional Flags: ${(additionalFlags || []).join(", ")}

Write a polite, professional, and short response (1-2 paragraphs max) that the student can send (via email, WhatsApp, or LinkedIn) to decline the offer. The response should NOT make accusations of scamming, but should simply state that they are declining to move forward. Avoid sharing any further personal details. Write it in a clean copy-pasteable format using "Gowthaman P R" (the student's name) as the signer where appropriate, or leave it blank.`;
  } else {
    prompt = `You are helping a student draft a formal security report to submit to their University Placement Cell or a Cybercrime Reporting Portal regarding a job/internship scam offer they received.
The offer text (or context) was:
"${offerText || "No text provided (Image upload scan)"}"
The claimed company name was: "${companyName || "Unknown"}"

AI Assessment details:
Explanation: ${explanation || ""}
Additional Flags: ${(additionalFlags || []).join(", ")}
Verdict: ${verdict} (Risk Score: ${riskScore}%)

Write a structured, formal incident report (email format) that includes:
1. Subject line starting with "INCIDENT REPORT: Suspected Recruitment Scam"
2. Header with Date and Recipient (Placement Cell / Cyber Cell)
3. A summary of the suspicious offer and the claimed company
4. A bulleted list of specific red flags noticed (e.g., upfront payment requested, malformed contact info, no interview, etc.)
5. A concluding request for warning other students or investigating.
Make it look highly professional and formal. Use "Gowthaman P R" as the reporting student name.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from model.");
    }

    return NextResponse.json({ draft: text });
  } catch (err: any) {
    console.error("Draft generation failed:", err);
    return NextResponse.json({ error: "Failed to generate draft." }, { status: 500 });
  }
}
