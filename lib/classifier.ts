/**
 * Custom Lightweight Machine Learning Classifier in pure TypeScript.
 *
 * Implements a TF-IDF Vectorizer + Logistic Regression model from scratch.
 * Labeled dataset contains Illustrative Training Data of scam and legitimate recruiting templates.
 * Trains dynamically in-memory on server startup (takes <5ms).
 *
 * This provides a fast, zero-dependency Layer 2 machine learning classification score.
 */

// --- ILLUSTRATIVE HACKATHON TRAINING DATASET (~40 samples) ---
interface Document {
  text: string;
  label: number; // 1 = scam, 0 = legit
}

const DATASET: Document[] = [
  // --- SCAMS (label: 1) ---
  { text: "Congratulations! Selected for remote data entry job. Earn $100 per hour. No interview. Pay $50 registration fee to start.", label: 1 },
  { text: "Urgent remote internship opening. WhatsApp us immediately to register. Earn ₹2500 per day by liking videos on YouTube.", label: 1 },
  { text: "Acme LLC offering part time online tasks. Review products on our link and earn instant commission. Telegram contact only.", label: 1 },
  { text: "Recruiting remote virtual assistants. Weekly stipend paid in Apple gift cards. Skype text interview required.", label: 1 },
  { text: "Lottery winner job! You won ₹10,000 bonus. Register now by paying courier charges for your laptop and training kit.", label: 1 },
  { text: "Dear candidate, selected without interview. High salary package. Send security deposit to verify bank account details.", label: 1 },
  { text: "Earn money from home. Review products on Telegram channels. Refundable deposit required to activate wallet link.", label: 1 },
  { text: "Selected as Data Entry operator. Buy training software licenses from our vendor. We reimburse on your first salary.", label: 1 },
  { text: "Immediate selection for online typing job. Earn $500 weekly. Pay registration deposit via Google Pay link.", label: 1 },
  { text: "Crypto trading assistant intern wanted. We send you funds, you buy crypto and transfer to our secure wallet. Earn commission.", label: 1 },
  { text: "Urgent hiring. Remote processing assistant. No resume needed. Send Aadhaar card, PAN card, and UPI PIN to set up payroll.", label: 1 },
  { text: "Hi, I am HR manager. Earn ₹30,000/week watching Netflix videos. Just register on our platform by sending RS 500 activation fee.", label: 1 },
  { text: "Part time typing job. Pay security deposit which is 100% refundable with first salary. Direct selection, act now.", label: 1 },
  { text: "Congratulations, you won a job placement ticket. Pay processing fees immediately to schedule your onboarding session.", label: 1 },
  { text: "Remote review task assistant. Earn high commission. Contact Telegram support. We require upfront deposit for product collateral.", label: 1 },
  { text: "Earn $80/hour doing simple online tasks. Direct placement, no experience. Register with your credit card details.", label: 1 },
  { text: "Hiring virtual shoppers. We send you a check, you cash it at bank and buy gift cards for our clients. Keep $100 bonus.", label: 1 },
  { text: "Dear applicant, selected for global assistant role. Send processing fees to our finance portal immediately.", label: 1 },
  { text: "High paying typing job. Earn RS 5000/day. No skill needed. Send RS 1000 courier fee for documents.", label: 1 },
  { text: "Immediate opening for data clerk. Text Skype HR to get hired. Pay licensing fee for remote server access.", label: 1 },

  // --- LEGITIMATE OFFERS (label: 0) ---
  { text: "We are pleased to offer you the Web Developer Internship. Your selection followed a technical video interview on Google Meet.", label: 0 },
  { text: "TCS is hiring Software Engineer Interns. The selection is based on your on-campus assessment. Stipend is ₹15,000/month.", label: 0 },
  { text: "Offer letter for Technical Writer. Please sign and return the document within 5 days. Reach out to HR team via company domain.", label: 0 },
  { text: "Welcome to Infosys. Your internship starts on 10th August. Standard background verification will be conducted via official portal.", label: 0 },
  { text: "We enjoyed speaking with you during your interview. We would like to offer you the Marketing Intern role at our Bangalore office.", label: 0 },
  { text: "Cognizant hiring Analyst Interns. Candidates must have a CS degree. Apply through official careers portal only.", label: 0 },
  { text: "Congratulations on passing the coding test. We offer you the Web Development internship at Tech Nova starting next Monday.", label: 0 },
  { text: "Data Analyst Internship offer. Stipend: ₹12,000/month. The offer is subject to verification of your university transcripts.", label: 0 },
  { text: "Web Developer Intern wanted at local startup. Review job details on our website and submit your resume for review.", label: 0 },
  { text: "Thank you for attending the technical interview yesterday. We are pleased to offer you the position of Junior Designer.", label: 0 },
  { text: "Product Management Internship offer. Working hours: 9 AM to 5 PM, Mon-Fri. Stipend: ₹20,000/month. On-site onboarding.", label: 0 },
  { text: "We are delighted to make you an offer for Cyber Security Intern. Please connect with your supervisor at official company email.", label: 0 },
  { text: "UX Designer Internship offer at Acro Solutions. Selection based on portfolio review and Meet interview. Standard stipends.", label: 0 },
  { text: "Standard internship offer for 6 months. Standard HR vetting and documentation required. Apply on our career page.", label: 0 },
  { text: "Offer for Backend Intern. Compensation: ₹10,000/month. Technical round involved writing algorithms in Python.", label: 0 },
  { text: "Software Engineering Intern offer letter. No upfront fee required. Vetting done by recruiting panel. Official contact only.", label: 0 },
  { text: "Congratulations on completing your technical coding round. We offer you the Systems Engineer internship.", label: 0 },
  { text: "HR Intern position offer. Please submit your university recommendation letter and transcripts via official portal.", label: 0 },
  { text: "Web Designer Internship at Design Studio. Stipend: ₹18,000/month. Requires final project review with design head.", label: 0 },
  { text: "Junior developer contract. Standard terms, real company domain communications, standard onboarding next month.", label: 0 }
];

// --- TOKENIZER & TF-IDF VECTORIZER ---
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "cannot", "could",
  "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have",
  "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is",
  "it", "its", "itself", "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
  "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should",
  "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these",
  "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what",
  "when", "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

class TfidfVectorizer {
  vocabulary: string[] = [];
  idf: Record<string, number> = {};

  fitTransform(docs: string[][]): number[][] {
    // 1. Build Vocabulary
    const vocabSet = new Set<string>();
    docs.forEach((doc) => doc.forEach((word) => vocabSet.add(word)));
    this.vocabulary = Array.from(vocabSet);

    // 2. Compute IDF
    const totalDocs = docs.length;
    this.vocabulary.forEach((word) => {
      const docCount = docs.filter((doc) => doc.includes(word)).length;
      // Smooth idf
      this.idf[word] = Math.log(totalDocs / (1 + docCount)) + 1;
    });

    // 3. Compute TF-IDF vectors
    return docs.map((doc) => this.vectorizeDoc(doc));
  }

  vectorizeDoc(doc: string[]): number[] {
    const vector = new Array(this.vocabulary.length).fill(0);
    const wordCounts: Record<string, number> = {};
    doc.forEach((word) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    const totalWords = doc.length || 1;

    this.vocabulary.forEach((word, idx) => {
      if (wordCounts[word]) {
        const tf = wordCounts[word] / totalWords;
        vector[idx] = tf * (this.idf[word] || 0);
      }
    });

    return vector;
  }
}

// --- LOGISTIC REGRESSION ---
class LogisticRegression {
  weights: number[] = [];
  bias: number = 0;

  sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z)))); // clamp boundaries
  }

  train(X: number[][], y: number[], learningRate = 0.5, epochs = 250) {
    const numFeatures = X[0].length;
    const numSamples = X.length;
    this.weights = new Array(numFeatures).fill(0);
    this.bias = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let dW = new Array(numFeatures).fill(0);
      let dB = 0;

      for (let i = 0; i < numSamples; i++) {
        let z = this.bias;
        for (let j = 0; j < numFeatures; j++) {
          z += X[i][j] * this.weights[j];
        }

        const pred = this.sigmoid(z);
        const err = pred - y[i];

        for (let j = 0; j < numFeatures; j++) {
          dW[j] += X[i][j] * err;
        }
        dB += err;
      }

      // Update Weights and Bias
      for (let j = 0; j < numFeatures; j++) {
        this.weights[j] -= (learningRate * dW[j]) / numSamples;
      }
      this.bias -= (learningRate * dB) / numSamples;
    }
  }

  predict(x: number[]): number {
    let z = this.bias;
    for (let j = 0; j < x.length; j++) {
      z += x[j] * this.weights[j];
    }
    return this.sigmoid(z);
  }
}

// --- INITIALIZE & TRAIN ON LOAD ---
let vectorizer = new TfidfVectorizer();
let model = new LogisticRegression();

try {
  const tokenizedDocs = DATASET.map((doc) => tokenize(doc.text));
  const labels = DATASET.map((doc) => doc.label);
  const tfidfVectors = vectorizer.fitTransform(tokenizedDocs);

  model.train(tfidfVectors, labels);
  console.log("Lightweight Logistic Regression model trained successfully on server load.");
} catch (err) {
  console.error("Failed to train local Logistic Regression model:", err);
}

/**
 * Public Classification Interface.
 * Returns the probability (0-1) that the text resembles a scam offer letter.
 */
export function classifyText(text: string): number {
  try {
    const tokens = tokenize(text);
    if (tokens.length === 0) return 0;
    const vector = vectorizer.vectorizeDoc(tokens);
    return model.predict(vector);
  } catch (err) {
    console.error("Classifier runtime evaluation error:", err);
    return 0.15; // default fallback evaluation
  }
}
