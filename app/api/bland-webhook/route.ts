import { NextResponse } from 'next/server';
import { saveLead } from '@/lib/db/client';
import { sendWhatsAppMeta } from '@/lib/services/whatsapp';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Bland AI Webhook Received:", JSON.stringify(body, null, 2));

    // Typically Bland AI sends 'call_id', 'to', 'from', 'completed', 'variables' etc.
    const phone = body.to || body.variables?.phone || body.phone_number;
    const name = body.variables?.name || "Customer";
    
    if (!phone) {
      return NextResponse.json({ error: "No phone number found in payload" }, { status: 400 });
    }

    // Standardize phone format (remove leading '+' if present, similar to what we do)
    let standardizedPhone = phone;
    if (standardizedPhone.startsWith('+')) {
      standardizedPhone = standardizedPhone.substring(1);
    }
    
    // Save lead and activate Drip Campaign
    await saveLead({
      name: name,
      phone: standardizedPhone,
      loan_type: "Unknown",
      loan_amount: 0,
      monthly_income: 0,
      employment_type: "Unknown",
      eligibility_status: "CONTACTED", // Mark as contacted via call
      eligibility_reason: "Called via Bland AI",
      source: "Bland AI Outbound",
      hubspot_synced: 0,
      sheets_synced: 0,
      make_synced: 0,
      pabbly_synced: 0,
      pickyassist_synced: 0,
      drip_status: "ACTIVE" // Start the drip campaign
    });

    console.log(`Lead saved and drip activated for ${standardizedPhone}. Sending Day 0 Template.`);

    // Trigger Day 0 Template immediately
    // User requested: "loan_consultation_offer · English"
    const templateName = "loan_consultation_offer";
    
    const result = await sendWhatsAppMeta({
      name,
      phone: standardizedPhone,
      loan_type: "Unknown",
      loan_amount: 0,
      monthly_income: 0,
      employment_type: "Unknown",
      eligibility_status: "CONTACTED",
      eligibility_reason: "Called via Bland AI",
      source: "Bland AI",
      hubspot_synced: 0,
      sheets_synced: 0,
      make_synced: 0,
      pabbly_synced: 0,
      pickyassist_synced: 0
    }, templateName, [name]); // Pass name as parameter for the template

    if (!result.success) {
      console.error(`Failed to send Day 0 template to ${standardizedPhone}:`, result.message);
    }

    return NextResponse.json({ success: true, message: "Webhook processed and Day 0 template dispatched" });
  } catch (error: any) {
    console.error("Error processing Bland AI webhook:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
