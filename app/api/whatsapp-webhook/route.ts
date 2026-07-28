import { NextResponse } from 'next/server';

// Handle webhook verification from Meta
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // You can set any verify token string in Meta Webhooks dashboard. Let's assume you use "avani_secure_token"
  // For safety, accept anything if no env var is set, or strictly check it
  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "avani_secure_token";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Meta Webhook Verified!");
    return new NextResponse(challenge, { status: 200 });
  } else {
    // If you haven't set an env var, we'll just accept any token for the sake of making it easy
    if (mode === "subscribe" && challenge) {
      console.log("Meta Webhook Verified with fallback!");
      return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse("Forbidden", { status: 403 });
  }
}

import { saveLead, saveMessage, getContactMessages } from '../../../lib/db/client';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
const google = createGoogleGenerativeAI({
  apiKey: (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim()
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

# Document Lists (Provide exactly as written below):

## Personal Loan
If salaried:
IDENTITY PROOF: ✅ Aadhaar Card, ✅ PAN Card, ✅ Passport, ✅ Voter's ID
ADDRESS PROOF: ✅ Aadhaar Card, ✅ Utility Bill (last 3 months), ✅ Driving License
INCOME DOCUMENTS: ✅ Last 3 months salary slips, ✅ Last 6 months bank statements, ✅ Form 16 (last 2 years)
EMPLOYMENT PROOF: ✅ Employee ID Card, ✅ Appointment Letter, ✅ Offer Letter (for new joinees)

If Business owner or self-employed:
IDENTITY & ADDRESS PROOF: ✅ PAN Card (Individual + Business), ✅ Aadhaar Card, ✅ GST Registration Certificate
BUSINESS DOCUMENTS: ✅ Business Registration / Udyam Certificate, ✅ Shop & Establishment Certificate, ✅ Partnership Deed / MOA (if applicable)
FINANCIAL DOCUMENTS: ✅ Last 2 years ITR with CA stamp, ✅ Last 12 months bank statements, ✅ Last 2 years audited balance sheet

If Professional like doctor:
DOCTOR PROFESSIONAL DOCUMENTS: ✅ Degree Certificate, ✅ Registration Certificate (Old & New), ✅ Clinic/Hospital Registration
IDENTITY & ADDRESS PROOF: ✅ PAN Card, ✅ Aadhaar Card, ✅ Passport size photo
FINANCIAL DOCUMENTS: ✅ Last 2 years ITR, ✅ Last 6-12 months bank statements (Current & Savings), ✅ Existing loan details (if any)

If profession like Chartered Accountant:
CHARTERED ACCOUNTANT PROFESSIONAL DOCUMENTS: ✅ Certificate of Practice (COP), ✅ ICAI Membership Certificate
IDENTITY & ADDRESS PROOF: ✅ PAN Card, ✅ Aadhaar Card, ✅ Passport size photo
FINANCIAL DOCUMENTS: ✅ Last 2 years ITR, ✅ Last 6-12 months bank statements, ✅ Existing loan details (if any)

## Business Loan
IDENTITY & ADDRESS PROOF: ✅ PAN Card (Individual + Business), ✅ Aadhaar Card, ✅ GST Registration Certificate
BUSINESS DOCUMENTS: ✅ Business Registration / Udyam Certificate, ✅ Shop & Establishment Certificate, ✅ Partnership Deed / MOA (if applicable)
FINANCIAL DOCUMENTS: ✅ Last 2 years ITR with CA stamp, ✅ Last 12 months bank statements, ✅ Last 2 years audited balance sheet

## Doctor Loan
DOCTOR PROFESSIONAL DOCUMENTS: ✅ Degree Certificate, ✅ Registration Certificate (Old & New), ✅ Clinic/Hospital Registration
IDENTITY & ADDRESS PROOF: ✅ PAN Card, ✅ Aadhaar Card, ✅ Passport size photo
FINANCIAL DOCUMENTS: ✅ Last 2 years ITR, ✅ Last 6-12 months bank statements (Current & Savings), ✅ Existing loan details (if any)

## Chartered Accountant (CA) Loan
CHARTERED ACCOUNTANT PROFESSIONAL DOCUMENTS: ✅ Certificate of Practice (COP), ✅ ICAI Membership Certificate
IDENTITY & ADDRESS PROOF: ✅ PAN Card, ✅ Aadhaar Card, ✅ Passport size photo
FINANCIAL DOCUMENTS: ✅ Last 2 years ITR, ✅ Last 6-12 months bank statements, ✅ Existing loan details (if any)

## Home / Mortgage Loan
IF SALARIED:
IDENTITY PROOF: ✅ Aadhaar Card, ✅ PAN Card, ✅ Passport, ✅ Voter's ID
ADDRESS PROOF: ✅ Aadhaar Card, ✅ Utility Bill (last 3 months), ✅ Driving License
INCOME DOCUMENTS: ✅ Last 3 months salary slips, ✅ Last 6 months bank statements, ✅ Form 16 (last 2 years)
EMPLOYMENT PROOF: ✅ Employee ID Card, ✅ Appointment Letter, ✅ Offer Letter

PROPERTY DOCUMENTS: ✅ Sale agreement / allotment letter, ✅ Property title deed, ✅ NOC from builder/society, ✅ Approved building plan, ✅ Property tax receipts, ✅ Original title deed, ✅ Encumbrance certificate, ✅ NOC from co-owners if applicable, ✅ Valuation report

IF BUSINESS:
INCOME DOCUMENTS: ✅ Business Registration / Udyam Certificate, ✅ Shop & Establishment Certificate, ✅ Partnership Deed / MOA
FINANCIAL DOCUMENTS: ✅ Last 2 years ITR with CA stamp, ✅ Last 12 months bank statements, ✅ Last 2 years audited balance sheet

IF DOCTOR:
INCOME DOCUMENTS: ✅ Degree Certificate, ✅ Registration Certificate (Old & New), ✅ Clinic/Hospital Registration
IDENTITY & ADDRESS PROOF: ✅ PAN Card, ✅ Aadhaar Card, ✅ Passport size photo
FINANCIAL DOCUMENTS: ✅ Last 2 years ITR, ✅ Last 6-12 months bank statements (Current & Savings), ✅ Existing loan details (if any)

IF CHARTERED ACCOUNTANT:
INCOME DOCUMENTS: ✅ Certificate of Practice (COP), ✅ ICAI Membership Certificate
IDENTITY & ADDRESS PROOF: ✅ PAN Card, ✅ Aadhaar Card, ✅ Passport size photo
FINANCIAL DOCUMENTS: ✅ Last 2 years ITR, ✅ Last 6-12 months bank statements, ✅ Existing loan details (if any)

## Education Loan
EDUCATION LOAN CHECKLIST (SHARE THE DOC AS PER CHECKLIST STEP BY STEP)
STUDENT DOCUMENT: 1 ADMISSION LETTER, 2 PASSPORT (BOTH SIDE), 3. SCORE CARD (*GRE *TOFEL *DULIOGO *PTE *IETLS), 4. ACADEMIC CERTIFICATES (*10TH (SSC)MEMO *INTER \\DIPLOMA(MEMOS) *DEGREE WISE MEMO \\B.TECH TRANSCRIPTS *CMM *PC), 5. WORK EXPERIENCES(LETTER\\OFFER LETTER\\RELIVING LETTER AND RESUME), 6. AADHAR CARD, 7. PAN CARD, 8. MAIL ID AND NUMBER

CO APPLICANT : FATHER \\MOTHER \\SIBLINGS\\BLOOD REALTION
if salaried: *AADHAR CARD *PAN CARD *LATEST 3MONTHS PAYSILPS *LATEST 6MONTHS BANK STATEMENT *LATEST 2TRS FORM—16 *MAIL ID AND NUMBER
IF SELF EMPOYEMENT: *AADHAR CARD *PAN CARD *LATEST 2YRS ITRS WITH BALANCES SHEET AND PROFIT AND LOSS *BUINESS PROOF :LABOUR LICNECES\\GST—ECT *LATEST 6MONTHS BANK STATEMENT (TILL DATE) *MAIL ID AND NUMBER
IF FARMER: *AADHAR CARD *PAN CARD *PATTA PASS BOOK *AGICULTURE INCOME CERTIFICATE *LATEST 6MONTHS BANK STATEMENT *MAIL ID AND NUMBER
ADDITIONAL INCOME IF PENSIONER: *AADHAR CARD *PAN CARD *PENSIONER RECEPTS *LATEST 6MONTHS BANK STATEMENT *MAIL ID AND NUMBER
IF RENTAL INCOME: *AADHAR CARD *PAN CARD *RENTAL AGREEMENTS *LATEST 6MONTHS BANK STATEMENT *MAIL ID AND NUMBER
MOTHER: AADHAR CARD, PAN CARD, MAIL ID AND NUMBER, OWN HOUSE PROOF(PROPERTY TAX), POWER BILL(LASTEST)
ANY TWO REFERENCES: NAME, NUMBER, MAIL ID, FULL ADDRESS. KINDLY SHARE DOC AS PER CHECKLIST.
FINANCIAL DOCUMENTS: ✅ Co-applicant KYC (PAN & Aadhaar) ✅ Co-applicant income proof ✅ ITR (2 years) ✅ Bank statements (1 year) ✅ Property documents (if collateral loan)
`;

export async function POST(request: Request) {
  const debugLogs: string[] = [];
  const log = (msg: string) => { console.log(msg); debugLogs.push(msg); };
  
  try {
    const body = await request.json();
    log("Received body: " + JSON.stringify(body).substring(0, 200));
    
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const message = messages[0];
        const fromPhone = message.from;
        
        let incomingText = "";
        if (message.type === 'text') {
          incomingText = message.text?.body || "";
        } else if (message.type === 'button') {
          incomingText = message.button?.text || "";
        } else if (message.type === 'interactive') {
          incomingText = message.interactive?.button_reply?.title || 
                         message.interactive?.list_reply?.title || "";
        }

        if (!incomingText) return NextResponse.json({ success: true, debugLogs });

        log(`Parsed incoming message from ${fromPhone}: ${incomingText}`);

        let dbMessages: any[] = [];
        let leadId: string | null = null;

        try {
          leadId = await saveLead({
            name: "WhatsApp User",
            phone: fromPhone,
            loan_type: "Unknown",
            loan_amount: 0,
            monthly_income: 0,
            employment_type: "Unknown",
            eligibility_status: "Engaged via WhatsApp",
            eligibility_reason: "Chatting with AI",
            source: "WhatsApp",
            hubspot_synced: 0,
            sheets_synced: 0,
            make_synced: 0,
            pabbly_synced: 0,
            pickyassist_synced: 0,
            drip_status: "PAUSED" // Pause drip campaigns if they interact
          });
          await saveMessage(leadId, 'INBOUND', incomingText);
          dbMessages = await getContactMessages(fromPhone);
          log("Saved to DB successfully");
        } catch (dbError: any) {
          log("DB Error: " + dbError?.message);
          if (!memoryChatHistory.has(fromPhone)) {
            memoryChatHistory.set(fromPhone, []);
          }
          const history = memoryChatHistory.get(fromPhone)!;
          history.push({ direction: 'INBOUND', content: incomingText });
          dbMessages = [...history];
        }

        const aiMessages = dbMessages.map(m => ({
          role: m.direction === 'INBOUND' ? 'user' : 'assistant',
          content: m.content
        }));

        log(`API Key present: ${!!process.env.GOOGLE_GENERATIVE_AI_API_KEY}`);
        if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
           log(`API Key starts with: ${process.env.GOOGLE_GENERATIVE_AI_API_KEY.substring(0, 5)}`);
        }

        console.log("Calling Gemini API...");
        try {
          const { text: aiResponse } = await generateText({
            model: google('gemini-flash-lite-latest'),
            system: SYSTEM_PROMPT,
            messages: aiMessages as any
          });
          log("Gemini response generated successfully.");

          if (leadId) {
            try {
              await saveMessage(leadId, 'OUTBOUND', aiResponse);
            } catch (e) {
              log("Failed to save outbound to DB");
            }
          } else {
             const history = memoryChatHistory.get(fromPhone);
             if (history) {
                 history.push({ direction: 'OUTBOUND', content: aiResponse });
             }
          }

          const phoneId = value?.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
          const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_TOKEN;

          if (phoneId && token) {
            const endpoint = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
            const replyPayload = {
              messaging_product: "whatsapp",
              to: fromPhone,
              type: "text",
              text: { body: aiResponse }
            };

            log(`Sending to Meta API... phoneId=${phoneId}, toPhone=${fromPhone}`);
            const metaResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(replyPayload)
            });
            
            const metaData = await metaResponse.text();
            log(`Meta API Status: ${metaResponse.status}`);
            if (!metaResponse.ok) {
              log(`Meta API Error: ${metaData}`);
            } else {
              log("Meta API Success!");
            }
          } else {
            log(`Missing phoneId (${!!phoneId}) or token (${!!token})`);
          }
        } catch (geminiError: any) {
          log("Gemini Error: " + geminiError?.message);
        }
      }
    }
    
    return NextResponse.json({ success: true, debugLogs });
  } catch (error: any) {
    log("Fatal Error: " + error?.message);
    return NextResponse.json({ success: true, debugLogs });
  }
}
