"use client";

import { useState } from "react";

interface Card {
  id: number;
  company: string;
  sender: string;
  type: "email" | "chat" | "letter";
  content: string;
  isScam: boolean;
  explanation: string;
  redFlags: string[];
}

const CARDS: Card[] = [
  {
    id: 1,
    company: "Google Global Operations (via WhatsApp)",
    sender: "+91 98765 43210 (HR Manager)",
    type: "chat",
    content: "Congrats! You are selected as a Remote YouTube Video Optimizer at Google. Pay is $50/hour. No interview needed. You just need to pay a small $20 refundable registration fee to receive your training materials.",
    isScam: true,
    redFlags: [
      "Recruiting for a tech giant via unsolicited WhatsApp message",
      "No interview process conducted",
      "Requesting upfront payment for 'training materials'"
    ],
    explanation: "Legitimate employers, especially global giants like Google, will never conduct recruitment over consumer WhatsApp accounts, skip interviews entirely, or demand money for training kits."
  },
  {
    id: 2,
    company: "TCS (Tata Consultancy Services)",
    sender: "careers@tcs.com",
    type: "email",
    content: "Following up on your on-campus technical interview last Tuesday, we are pleased to offer you the position of System Engineer Intern. The internship is for 3 months with a stipend of ₹15,000/month. Please review the official portal link to accept.",
    isScam: false,
    redFlags: [],
    explanation: "This follows standard legitimate procedures: an on-campus vetting process is referenced, the sender email domain (tcs.com) matches the official corporate domain, and the stipend is realistic."
  },
  {
    id: 3,
    company: "Amazon Data Services LLC",
    sender: "Telegram: @amazonrecruiting2026",
    type: "chat",
    content: "Remote Part-time Intern role. Daily tasks: review 5 products on our portal. Salary: ₹5,000/day. No experience needed. Start immediately. Contact us on Telegram to set up your online deposit account.",
    isScam: true,
    redFlags: [
      "Unrealistically high earnings (₹5,000/day) for low-skill entry tasks",
      "Conducting business and payroll setup via Telegram",
      "No formal application, resume check, or interview"
    ],
    explanation: "Unbelievably high pay for low-effort tasks (reviewing products/liking videos) combined with redirecting to Telegram are classic indicators of task-based financial scams."
  },
  {
    id: 4,
    company: "Meta Platforms Inc.",
    sender: "meta.careers.recruiting@gmail.com",
    type: "email",
    content: "Dear Candidate, We liked your profile on LinkedIn and wish to hire you immediately as a Software Tester Intern. The interview will be conducted via Skype chat. To initiate payroll setup, please email your Aadhaar card copy, bank details, and the OTP sent to your phone.",
    isScam: true,
    redFlags: [
      "Sent from a free consumer domain (@gmail.com) instead of @meta.com",
      "Interview conducted purely via text-based Skype chat",
      "Requesting highly sensitive personal data and a security OTP pre-hire"
    ],
    explanation: "Major companies always use corporate emails (never Gmail) and conduct formal video/in-person interviews. Crucially, sharing a phone OTP is a major security breach, as OTPs are never used for employment verification."
  },
  {
    id: 5,
    company: "Acro Tech Solutions (Local Startup)",
    sender: "amit@acrotechsolutions.co",
    type: "email",
    content: "Thank you for speaking with our Tech Lead during the Google Meet interview yesterday. We are pleased to offer you the Web Developer Intern role. The stipend is ₹8,000/month. We look forward to having you join our team next Monday.",
    isScam: false,
    redFlags: [],
    explanation: "This is a standard startup internship offer. The email is sent from the startup's registered domain, the selection followed a live technical interview (Google Meet), and the compensation is aligned with local startup internships."
  }
];

export default function ScamGame() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userChoice, setUserChoice] = useState<boolean | null>(null); // true = scam, false = legit
  const [isAnswered, setIsAnswered] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  const currentCard = CARDS[currentIndex];

  function handleAnswer(choice: boolean) {
    if (isAnswered) return;
    setUserChoice(choice);
    setIsAnswered(true);

    const isCorrect = choice === currentCard.isScam;
    if (isCorrect) {
      setScore((s) => s + 20);
    }
  }

  function handleNext() {
    setIsAnswered(false);
    setUserChoice(null);

    if (currentIndex < CARDS.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setGameFinished(true);
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setScore(0);
    setUserChoice(null);
    setIsAnswered(false);
    setGameFinished(false);
  }

  if (gameFinished) {
    return (
      <div className="bg-base-surface border border-base-border rounded-lg p-6 text-center max-w-xl mx-auto animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-brand-dim/20 border border-brand flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-brand-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="font-display font-600 text-2xl text-ink-primary mb-2">Game Completed!</h3>
        <p className="text-sm text-ink-muted mb-6">
          You scored <span className="text-brand-bright font-mono font-600">{score}/100</span> points on the Scam Awareness simulator.
        </p>

        <div className="bg-base-bg rounded border border-base-border p-4 mb-6 text-left">
          <h4 className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-2">Verdict</h4>
          <p className="text-sm text-ink-primary">
            {score >= 80
              ? "🏆 Scam Expert: You have an excellent eye for cybersecurity risks and phishing tactics. You're ready to protect yourself and guide others!"
              : score >= 60
              ? "🎯 Keep Practicing: You identified most of the warnings but fell for a few sophisticated social engineering hooks. Replay to level up your eye!"
              : "⚠️ High Vulnerability: Scammers could easily trick you with urgent templates or fake payment requests. Take extra time to examine emails and check domain links."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRestart}
          className="rounded bg-brand hover:bg-brand-bright text-white font-medium text-sm px-6 py-2.5 transition-colors"
        >
          Replay Simulator
        </button>
      </div>
    );
  }

  const isCorrect = userChoice === currentCard.isScam;

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      <div className="flex justify-between items-center bg-base-surface border border-base-border rounded px-4 py-2 text-xs font-mono text-ink-muted">
        <span>Scenario: <strong className="text-ink-primary">{currentIndex + 1}/{CARDS.length}</strong></span>
        <span>Score: <strong className="text-brand-bright">{score}</strong></span>
      </div>

      <div className="bg-base-surface border border-base-border rounded-lg overflow-hidden flex flex-col min-h-[300px]">
        {/* Card Header */}
        <div className="bg-base-raised border-b border-base-border px-5 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-ink-faint tracking-wider">Claimed Sender</span>
            <h4 className="text-sm font-semibold text-ink-primary">{currentCard.company}</h4>
            <p className="text-xs text-ink-muted font-mono mt-0.5">{currentCard.sender}</p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-base-bg border border-base-border text-ink-muted">
            {currentCard.type}
          </span>
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col justify-center">
          <p className="text-sm text-ink-primary font-body leading-relaxed whitespace-pre-wrap italic">
            "{currentCard.content}"
          </p>
        </div>

        {/* Card Actions */}
        {!isAnswered ? (
          <div className="grid grid-cols-2 border-t border-base-border divide-x divide-base-border">
            <button
              type="button"
              onClick={() => handleAnswer(false)}
              className="py-4 hover:bg-risk-lowDim/20 text-sm font-semibold text-risk-low transition-colors"
            >
              ✅ Safe / Legit
            </button>
            <button
              type="button"
              onClick={() => handleAnswer(true)}
              className="py-4 hover:bg-risk-highDim/20 text-sm font-semibold text-risk-high transition-colors"
            >
              🚨 Suspected Scam
            </button>
          </div>
        ) : (
          <div className={`p-5 border-t ${isCorrect ? "bg-risk-lowDim/15 border-risk-low/30 text-ink-primary" : "bg-risk-highDim/15 border-risk-high/30 text-ink-primary"}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isCorrect ? "bg-risk-low text-white" : "bg-risk-high text-white"
              }`}>
                {isCorrect ? "✓" : "✗"}
              </span>
              <span className="text-sm font-bold">
                {isCorrect ? "Correct! +20 Points" : "Incorrect Answer"}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-ink-primary mb-4">
              {currentCard.explanation}
            </p>

            {currentCard.redFlags.length > 0 && (
              <div className="mb-4">
                <h5 className="text-[10px] font-mono uppercase text-ink-faint mb-1.5">Red Flags Identified:</h5>
                <ul className="list-disc list-inside text-xs text-ink-muted space-y-1">
                  {currentCard.redFlags.map((flag, idx) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="w-full rounded bg-base-raised border border-base-border hover:border-brand px-4 py-2 text-xs font-mono font-medium text-ink-primary transition-colors"
            >
              {currentIndex < CARDS.length - 1 ? "Next Scenario →" : "View Final Score"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
