import { NextResponse } from 'next/server';
import { saveLead } from '../../../lib/db/client';
import { evaluateEligibility } from '../../../lib/tools/eligibility';
import { orchestrateLeadSync } from '../../../lib/services/orchestrator';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Vapi webhook event received:", JSON.stringify(body, null, 2));

    // Handle initial webhook test or validation if sent
    if (!body || !body.message) {
      return NextResponse.json({ success: true, message: "Webhook is active" }, { status: 200 });
    }

    const { type, call, analysis } = body.message;

    // We only process end-of-call reports for lead qualification
    if (type !== 'end-of-call-report') {
      return NextResponse.json({ success: true, message: `Ignored message type: ${type}` }, { status: 200 });
    }

    // Extract call details
    const callSid = call?.id || `vapi-${Date.now()}`;
    const transcript = call?.transcript || "";
    const recordingUrl = call?.recordingUrl || "";
    const customerPhone = call?.customer?.number || "+919175635165"; // Default if not sent
    let callSummary = call?.summary || "";

    // Parse structured data from Vapi analysis
    let structuredData = analysis?.structuredData || {};
    
    // AI Fallback using Google AI Studio (Gemini) for summarizing transcript
    if (transcript && (!structuredData.name || !structuredData.loanAmount)) {
      try {
        const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || 'AIzaSyAzz0LUgUt9DxicUZQmkoZv3zRh_EdWMlU').trim();
        const google = createGoogleGenerativeAI({ apiKey });
        
        const aiSummary = await generateText({
          model: google('gemini-1.5-flash'),
          prompt: `Summarize this loan inquiry call transcript and extract JSON with fields: name, email, loanType, loanAmount (number), monthlyIncome (number), employmentType, employmentHistory. Transcript: "${transcript}"`
        });
        
        callSummary = aiSummary.text;
        // Basic JSON extraction
        const jsonMatch = callSummary.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiData = JSON.parse(jsonMatch[0]);
          structuredData = { ...structuredData, ...aiData };
        }
      } catch (err) {
        console.error("Gemini AI Summarization Error:", err);
      }
    }
    
    // Fallback extraction from transcript/summary using regex
    const name = structuredData.name || extractName(transcript, callSummary) || "Voice Caller";
    const email = structuredData.email || extractEmail(transcript) || "";
    const loanType = structuredData.loanType || extractLoanType(transcript, callSummary) || "Personal Loan";
    
    const rawAmount = structuredData.loanAmount || extractAmount(transcript, "amount") || 500000;
    const loanAmount = typeof rawAmount === 'string' ? parseFloat(rawAmount.replace(/[^0-9.]/g, '')) : Number(rawAmount);

    const rawIncome = structuredData.monthlyIncome || extractAmount(transcript, "income") || 35000;
    const monthlyIncome = typeof rawIncome === 'string' ? parseFloat(rawIncome.replace(/[^0-9.]/g, '')) : Number(rawIncome);

    const employmentType = structuredData.employmentType || extractEmploymentType(transcript, callSummary) || "Salaried";
    const employmentHistory = structuredData.employmentHistory || extractEmploymentHistory(transcript, callSummary) || "";

    // 1. Evaluate lead eligibility
    const evalResult = evaluateEligibility(loanType, loanAmount, monthlyIncome, employmentType);

    // 2. Save lead in the database
    const leadData = {
      name,
      email: email || undefined,
      phone: customerPhone,
      loan_type: loanType,
      loan_amount: loanAmount,
      monthly_income: monthlyIncome,
      employment_type: employmentType,
      eligibility_status: evalResult.status,
      eligibility_reason: evalResult.reason,
      source: 'Voice Call' as const,
      call_sid: callSid,
      transcript,
      recording_url: recordingUrl,
      employment_history: employmentHistory || undefined,
      hubspot_synced: 0,
      sheets_synced: 0,
      make_synced: 0,
      pabbly_synced: 0,
      pickyassist_synced: 0
    };

    const leadId = await saveLead(leadData);
    console.log(`Saved voice lead ID: ${leadId} for ${name}. Starting sync...`);

    // 3. Orchestrate integrations sync
    const syncSummary = await orchestrateLeadSync(leadId);

    return NextResponse.json({
      success: true,
      leadId,
      eligibility: evalResult,
      sync: syncSummary
    }, { status: 200 });

  } catch (error: any) {
    console.error("Vapi webhook handler error:", error);
    return NextResponse.json({ error: "Failed to parse webhook", details: error.message }, { status: 500 });
  }
}

// Simple GET endpoint for verifying endpoint status in web browsers
export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "Avani Loan Services Voice Webhook Portal",
    supportedEvents: ["end-of-call-report"]
  });
}

// Regex Helpers for Fallback Parser
function extractName(transcript: string, summary: string): string | null {
  // Check typical introduction patterns
  const introMatch = transcript.match(/(?:my name is|this is|i am|myself)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (introMatch && introMatch[1]) return introMatch[1].trim();

  // Try extracting name from summary if available
  const summaryName = summary.match(/(?:caller|customer|client|user)\s+named\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (summaryName && summaryName[1]) return summaryName[1].trim();

  return null;
}

function extractEmail(transcript: string): string | null {
  const emailMatch = transcript.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  if (emailMatch && emailMatch[1]) return emailMatch[1].trim();
  return null;
}

function extractLoanType(transcript: string, summary: string): string | null {
  const text = (transcript + " " + summary).toLowerCase();
  if (text.includes("doctor")) return "Doctor Loan";
  if (text.includes("business") || text.includes("shop") || text.includes("firm")) return "Business Loan";
  if (text.includes("home") || text.includes("house") || text.includes("flat")) return "Home Loan";
  if (text.includes("mortgage") || text.includes("property")) return "Mortgage Loan";
  if (text.includes("education") || text.includes("study") || text.includes("student") || text.includes("college")) {
    if (text.includes("abroad") || text.includes("global") || text.includes("foreign") || text.includes("germany") || text.includes("us")) {
      return "Education Loan (Global Studies)";
    }
    return "Education Loan (India)";
  }
  if (text.includes("personal")) return "Personal Loan";
  return null;
}

function extractAmount(transcript: string, type: 'amount' | 'income'): number | null {
  const text = transcript.toLowerCase();
  
  // Look for numbers followed by lakhs, L, k, or rupees
  // "lakh" or "lakhs" = 100,000
  const lakhMatch = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:lakh|l|lac)`, 'i'));
  if (lakhMatch && lakhMatch[1]) {
    return parseFloat(lakhMatch[1]) * 100000;
  }

  // Look for numbers representing thousands (k)
  const kMatch = text.match(/(\d+)\s*(?:thousand|k)/i);
  if (kMatch && kMatch[1]) {
    return parseFloat(kMatch[1]) * 1000;
  }

  // Direct numbers
  const numberMatches = text.match(/\b\d{5,8}\b/g); // 5 to 8 digit numbers
  if (numberMatches && numberMatches.length > 0) {
    // If asking for income, take a smaller value; if loan amount, take a larger value
    const numbers = numberMatches.map(n => parseInt(n));
    if (type === 'income') {
      return Math.min(...numbers);
    }
    return Math.max(...numbers);
  }

  return null;
}

function extractEmploymentType(transcript: string, summary: string): string | null {
  const text = (transcript + " " + summary).toLowerCase();
  if (text.includes("salaried") || text.includes("job") || text.includes("salary") || text.includes("work for")) {
    return "Salaried";
  }
  if (text.includes("business owner") || text.includes("run a shop") || text.includes("my own shop") || text.includes("company")) {
    return "Business Owner";
  }
  if (text.includes("self employed") || text.includes("freelancer") || text.includes("consultant")) {
    return "Self-Employed";
  }
  if (text.includes("doctor") || text.includes("clinic") || text.includes("hospital")) {
    return "Doctor (Self-Employed)";
  }
  return null;
}

function extractEmploymentHistory(transcript: string, summary: string): string | null {
  const text = (transcript + " " + summary).toLowerCase();
  // Simple patterns like "practicing in Latur", "work at Infosys", etc.
  const practiceMatch = text.match(/(?:practicing as a|practicing at|clinic at|practice in|office at)\s+([a-z0-9\s,&]+)(?:\b|$)/i);
  if (practiceMatch && practiceMatch[1]) {
    return `Practicing at ${practiceMatch[1].trim()}`;
  }
  
  const workAtMatch = text.match(/(?:work at|work for|employed at|engineer at|manager at|clerk at)\s+([a-z0-9\s,&]+)(?:\b|$)/i);
  if (workAtMatch && workAtMatch[1]) {
    return `Employed at ${workAtMatch[1].trim()}`;
  }
  
  return null;
}
