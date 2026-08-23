import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

async function generateWithGroq(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a professional assistant helping students with cybersecurity safety and professional communications." },
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

  const { actionType, offerText, companyName, riskScore, verdict, explanation, additionalFlags } = body;

  if (actionType !== "rejection" && actionType !== "report") {
    return NextResponse.json({ error: "Invalid actionType." }, { status: 400 });
  }

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

  // 1. Try Groq AI first
  if (groqApiKey && groqApiKey.trim().length > 0) {
    try {
      const draft = await generateWithGroq(groqApiKey.trim(), prompt);
      return NextResponse.json({ draft });
    } catch (groqErr) {
      console.warn("Groq draft generation failed, trying Gemini fallback:", groqErr);
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
        return NextResponse.json({ draft: text });
      }
    } catch (geminiErr) {
      console.error("Gemini draft generation failed:", geminiErr);
    }
  }

  // 3. Fallback: Dynamic offline template generation
  if (actionType === "rejection") {
    const rejectionDraft = `Dear Hiring Team / Recruiter,

Thank you for reaching out regarding the opportunity with ${companyName || "your organization"}. 

After reviewing the details, I have decided to respectfully decline this offer as I am pursuing other commitments at this time. 

I appreciate your time and consideration.

Best regards,
Gowthaman P R`;
    return NextResponse.json({ draft: rejectionDraft });
  } else {
    const flagsBullets = (additionalFlags && additionalFlags.length > 0)
      ? additionalFlags.map((f: string) => `• ${f}`).join("\n")
      : "• Suspicious recruitment communication and unverified employer credentials\n• Irregular hiring workflow without standard interview process";

    const reportDraft = `Subject: INCIDENT REPORT: Suspected Recruitment Scam - ${companyName || "Unverified Recruiter"}

Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
To: University Placement Cell / Campus Cybersecurity Helpdesk
From: Gowthaman P R

Dear Placement Cell / Security Team,

I am writing to report a suspicious job/internship offer received that exhibits clear indicators of recruitment fraud (Forensic Risk Assessment: ${riskScore}%, Verdict: ${verdict}).

Incident Details:
• Claimed Organization: ${companyName || "Unknown / Unverified"}
• Forensic Summary: ${explanation || "High-risk recruitment pattern detected."}

Key Red Flags Noted:
${flagsBullets}

Context / Excerpt:
"${offerText ? offerText.slice(0, 300) + (offerText.length > 300 ? "..." : "") : "Submitted via document screenshot scan"}"

I am bringing this to your attention so that alerts can be issued to protect fellow students from potential financial or data security risks.

Sincerely,
Gowthaman P R`;
    return NextResponse.json({ draft: reportDraft });
  }
}
