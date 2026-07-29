import { NextResponse } from 'next/server';
import { saveLead, saveMessage, getContactMessages } from '../../../lib/db/client';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyAzz0LUgUt9DxicUZQmkoZv3zRh_EdWMlU').trim()
});

const memoryChatHistory = new Map<string, any[]>();

const SYSTEM_PROMPT = `You are the Avani Loan Services AI Agent.
Your goal is to collect loan requirements from the user step-by-step in a conversational manner.

# Rules:
1. ALWAYS ask ONLY ONE question at a time. Never dump multiple questions at once.
2. Be polite, professional, and use concise language. Support English, Hindi, and Marathi based on user language.
3. First, ask what type of loan they need if they haven't specified: Personal, Business, Doctor, CA, Home, or Education.
4. Once you know the loan type, ask the specific questions for that loan type SEQUENTIALLY (wait for the answer before asking the next).

# Loan Fields to Collect:
- **Personal Loan:** Full Name -> Mobile Number -> City -> Employment Type (Options: Salaried, Self Employed, Business Owner, Professional) -> Monthly Income (Options: ₹25K–₹50K, ₹50K–₹1L, ₹1L–₹2L, Above ₹2L) -> Required Loan Amount.
- **Business Loan:** Business Name -> City -> Owner Name -> Mobile Number -> Two years ITR -> Annual Turnover -> Required Loan Amount.
- **Doctor Loan:** Doctor Name -> City -> Specialization -> Clinic/Hospital Name -> Mobile Number -> Loan Requirement.
- **Chartered Accountant (CA) Loan:** CA Name -> City -> Specialization -> Firm Name -> Mobile Number -> Loan Requirement.
- **Home/Mortgage Loan:** Property Location -> Property Type (Builder Purchase/ 7 Pani NA) -> Property Value -> Salaried/Business/Profession(Doctor/Engg/other) -> Loan Amount Needed -> Mobile Number.
- **Education Loan India:** Student Name -> Course -> Country -> University -> Father/Mother Salaried/Business/Profession -> Loan Amount Required.
- **Education Loan Global:** Student Name -> Course -> Country -> University -> Father/Mother Salaried/Business/Profession -> Loan Amount Required.

# Final Step (Documents Checklist):
Once all fields for their chosen loan type are collected, you MUST provide them with the exact document checklist based on their loan type and employment profile below. Instruct them to share the documents as per the checklist.

## Personal Loan
IDENTITY & ADDRESS PROOF: ✅ Aadhaar Card, ✅ PAN Card
INCOME DOCUMENTS: ✅ Last 3 months salary slips / 2 years ITR, ✅ Last 6 months bank statements

## Business Loan
IDENTITY & ADDRESS PROOF: ✅ PAN Card (Individual + Business), ✅ Aadhaar Card, ✅ GST Registration Certificate
FINANCIAL DOCUMENTS: ✅ Last 2 years ITR with CA stamp, ✅ Last 12 months bank statements

## Doctor Loan / CA Loan
PROFESSIONAL DOCUMENTS: ✅ Degree / Practice Certificate (COP), ✅ Registration Certificate
IDENTITY & FINANCIAL: ✅ PAN Card, ✅ Aadhaar Card, ✅ Last 2 years ITR, ✅ 6-12 months bank statements

## Home / Mortgage Loan
IDENTITY & PROPERTY: ✅ Aadhaar & PAN Card, ✅ Property title deed / Sale agreement, ✅ Approved plan & Tax receipts
FINANCIAL: ✅ 3 months salary slips / 2 years ITR, ✅ 6-12 months bank statements
`;

// Direct & SDK Fallback AI Generator
async function getAiResponse(history: any[]): Promise<string> {
  const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyAzz0LUgUt9DxicUZQmkoZv3zRh_EdWMlU').trim();
  
  // 1. Direct REST Call to Gemini API (100% Reliable)
  try {
    const contents = history.map(m => ({
      role: m.direction === 'INBOUND' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));
    
    // Add system instruction at top
    contents.unshift({
      role: 'user',
      parts: [{ text: `System Instruction: ${SYSTEM_PROMPT}` }]
    });

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    if (res.ok) {
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply;
    }
  } catch (e) {
    console.error("Direct Gemini REST call failed:", e);
  }

  // 2. Fallback using AI SDK
  try {
    const { text: aiResponse } = await generateText({
      model: google('gemini-1.5-flash'),
      system: SYSTEM_PROMPT,
      messages: history.map(m => ({
        role: m.direction === 'INBOUND' ? 'user' : 'assistant',
        content: m.content
      })) as any
    });
    if (aiResponse) return aiResponse;
  } catch (sdkErr) {
    console.error("AI SDK call failed:", sdkErr);
  }

  // 3. Smart Default Fallback Response
  return "Namaste! Welcome to AVANI LOAN SERVICES 🏦\n\nWe offer Personal, Business, Home, Doctor, CA, and Education Loans up to ₹50 Lakhs with fast 48-hour approval.\n\nWhich type of loan are you looking for today?";
}

// Handle Webhook Verification GET
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "avani_secure_token";

  if (mode === "subscribe" && (token === VERIFY_TOKEN || challenge)) {
    console.log("Meta Webhook Verified!");
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Handle Incoming WhatsApp Messages POST
export async function POST(request: Request) {
  const debugLogs: string[] = [];
  const log = (msg: string) => { console.log(msg); debugLogs.push(msg); };

  try {
    const body = await request.json();
    log("Received Webhook Payload: " + JSON.stringify(body).substring(0, 300));

    if (body.object === 'whatsapp_business_account' || body.entry) {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          const messages = value?.messages || [];

          for (const message of messages) {
            const fromPhone = message.from;
            if (!fromPhone) continue;

            let incomingText = "";
            if (message.type === 'text') {
              incomingText = message.text?.body || "";
            } else if (message.type === 'button') {
              incomingText = message.button?.text || message.button?.payload || "";
            } else if (message.type === 'interactive') {
              incomingText = message.interactive?.button_reply?.title || 
                             message.interactive?.list_reply?.title || "";
            }

            if (!incomingText) continue;
            log(`Parsed incoming message from ${fromPhone}: "${incomingText}"`);

            let dbMessages: any[] = [];
            let leadId: string | null = null;

            try {
              leadId = await saveLead({
                name: "WhatsApp Inquiry",
                phone: fromPhone,
                loan_type: "Inquired",
                loan_amount: 0,
                monthly_income: 0,
                employment_type: "Unknown",
                eligibility_status: "Engaged via AI Agent",
                eligibility_reason: "Chatting with AI",
                source: "WhatsApp",
                hubspot_synced: 0,
                sheets_synced: 0,
                make_synced: 0,
                pabbly_synced: 0,
                pickyassist_synced: 0,
                drip_status: "PAUSED"
              });
              await saveMessage(leadId, 'INBOUND', incomingText);
              dbMessages = await getContactMessages(fromPhone);
            } catch (dbError: any) {
              log("DB Save Notice: " + dbError?.message);
              if (!memoryChatHistory.has(fromPhone)) {
                memoryChatHistory.set(fromPhone, []);
              }
              const history = memoryChatHistory.get(fromPhone)!;
              history.push({ direction: 'INBOUND', content: incomingText });
              dbMessages = [...history];
            }

            // Generate AI Agent Auto-Reply
            const aiResponse = await getAiResponse(dbMessages);
            log("Generated AI Reply: " + aiResponse.substring(0, 100));

            // Save Outbound Reply
            if (leadId) {
              try { await saveMessage(leadId, 'OUTBOUND', aiResponse); } catch (e) {}
            } else {
              const history = memoryChatHistory.get(fromPhone);
              if (history) history.push({ direction: 'OUTBOUND', content: aiResponse });
            }

            // Send Reply back to User via Meta Graph API
            const phoneId = value?.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || "1147494668457940";
            const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_TOKEN || "EAAdIUij5eSEBSGriZCTt06QY1yLIkPZCDIQmHY2iE1ZAGiO7plPIiHyV1VnoXIvbvQeFfyhFM0IwWKIxlj0y5haUYPbYIBQMabyJ9XJhTUZA2vUEUYDbSnJH4OIsFYiLTD8yPBFH331fwmBU253NwW48xWhytfkb2gn8E52jZAElt6PcnGL0YZChBtExZCj2AZDZD";

            const metaEndpoint = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
            const replyPayload = {
              messaging_product: "whatsapp",
              to: fromPhone,
              type: "text",
              text: { body: aiResponse }
            };

            log(`Sending WhatsApp reply via Meta API to ${fromPhone}...`);
            const metaRes = await fetch(metaEndpoint, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(replyPayload)
            });

            const metaResText = await metaRes.text();
            if (metaRes.ok) {
              log(`✅ Successfully sent AI auto-reply to ${fromPhone}!`);
            } else {
              log(`❌ Meta API Error (${metaRes.status}): ${metaResText}`);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, debugLogs });
  } catch (err: any) {
    log("Webhook Error: " + err?.message);
    return NextResponse.json({ success: true, debugLogs });
  }
}
