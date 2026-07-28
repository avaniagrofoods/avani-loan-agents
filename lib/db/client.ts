import { PrismaClient, Contact, LeadStatus } from '@prisma/client';

export interface Lead {
  id?: string;
  name: string;
  email?: string | null;
  phone: string;
  loan_type: string;
  loan_amount: number;
  monthly_income: number;
  employment_type: string;
  eligibility_status: string; // was 'Qualified' | 'Needs Review' | 'Disqualified'
  eligibility_reason: string;
  source: string; // was 'Web Chat' | 'Voice Call' | 'WhatsApp'
  call_sid?: string | null;
  transcript?: string | null;
  recording_url?: string | null;
  hubspot_synced: number;
  sheets_synced: number;
  make_synced: number;
  pabbly_synced: number;
  pickyassist_synced: number;
  employment_history?: string | null;
  lead_score_tag?: string | null;
  drip_status?: string | null;
  created_at?: string;
}

const prisma = new PrismaClient();
// Hardcoded workspaceId for now, assuming there's only one workspace for testing, or we fetch the first one.
let defaultWorkspaceId: string | null = null;

async function getWorkspaceId() {
  if (defaultWorkspaceId) return defaultWorkspaceId;
  const workspace = await prisma.workspace.findFirst();
  if (workspace) {
    defaultWorkspaceId = workspace.id;
    return defaultWorkspaceId;
  }
  // If no workspace exists, create a default one
  const newWorkspace = await prisma.workspace.create({
    data: { name: "Avani Loan Services" }
  });
  defaultWorkspaceId = newWorkspace.id;
  return defaultWorkspaceId;
}

function mapContactToLead(contact: Contact): Lead {
  // Map Prisma Contact to Agent Lead
  return {
    id: contact.id,
    name: contact.name || '',
    email: contact.email,
    phone: contact.phone,
    loan_type: contact.loanType || '',
    loan_amount: contact.loanAmount || 0,
    monthly_income: contact.income || 0,
    employment_type: contact.employmentType || '',
    eligibility_status: contact.status,
    eligibility_reason: contact.eligibilityReason || '',
    source: contact.source || '',
    call_sid: contact.callSid,
    transcript: contact.transcript,
    recording_url: contact.recordingUrl,
    hubspot_synced: contact.hubspotSynced || 0,
    sheets_synced: contact.sheetsSynced || 0,
    make_synced: contact.makeSynced || 0,
    pabbly_synced: contact.pabblySynced || 0,
    pickyassist_synced: contact.pickyassistSynced || 0,
    employment_history: contact.employmentHistory,
    created_at: contact.createdAt.toISOString(),
  };
}

function mapStatusToEnum(status: string): LeadStatus {
  if (status === 'Qualified') return LeadStatus.QUALIFIED;
  if (status === 'Needs Review') return LeadStatus.ELIGIBILITY_CHECK;
  if (status === 'Disqualified') return LeadStatus.NEW_LEAD; // or some other status
  
  // Try to match exact enum
  const validStatuses = Object.values(LeadStatus);
  if (validStatuses.includes(status as LeadStatus)) {
    return status as LeadStatus;
  }
  
  return LeadStatus.NEW_LEAD;
}

export async function saveLead(lead: Lead): Promise<string> {
  const workspaceId = await getWorkspaceId();
  
  // Handle Tags
  let tagConnect: any = undefined;
  if (lead.lead_score_tag) {
    let tag = await prisma.tag.findFirst({
      where: { name: lead.lead_score_tag, workspaceId }
    });
    if (!tag) {
      tag = await prisma.tag.create({
        data: { name: lead.lead_score_tag, workspaceId, color: "#ef4444" } // Red default for HOT/etc
      });
    }
    tagConnect = { connect: [{ id: tag.id }] };
  }

  // Check if lead with phone already exists
  const existing = await prisma.contact.findUnique({
    where: { phone: lead.phone }
  });

  if (existing) {
    // Update
    let updateData: any = {
      name: lead.name,
      email: lead.email,
      loanType: lead.loan_type,
      loanAmount: lead.loan_amount,
      income: lead.monthly_income,
      employmentType: lead.employment_type,
      status: mapStatusToEnum(lead.eligibility_status),
      eligibilityReason: lead.eligibility_reason,
      source: lead.source,
      callSid: lead.call_sid,
      transcript: lead.transcript,
      recordingUrl: lead.recording_url,
      hubspotSynced: lead.hubspot_synced,
      sheetsSynced: lead.sheets_synced,
      makeSynced: lead.make_synced,
      pabblySynced: lead.pabbly_synced,
      pickyassistSynced: lead.pickyassist_synced,
      employmentHistory: lead.employment_history,
      ...(tagConnect ? { tags: tagConnect } : {})
    };
    
    if (lead.drip_status) {
      updateData.dripStatus = lead.drip_status as any;
    }

    const updated = await prisma.contact.update({
      where: { phone: lead.phone },
      data: updateData
    });
    return updated.id;
  } else {
    // Create
    let createData: any = {
      workspaceId,
      phone: lead.phone,
      name: lead.name,
      email: lead.email,
      loanType: lead.loan_type,
      loanAmount: lead.loan_amount,
      income: lead.monthly_income,
      employmentType: lead.employment_type,
      status: mapStatusToEnum(lead.eligibility_status),
      eligibilityReason: lead.eligibility_reason,
      source: lead.source,
      callSid: lead.call_sid,
      transcript: lead.transcript,
      recordingUrl: lead.recording_url,
      hubspotSynced: lead.hubspot_synced,
      sheetsSynced: lead.sheets_synced,
      makeSynced: lead.make_synced,
      pabblySynced: lead.pabbly_synced,
      pickyassistSynced: lead.pickyassist_synced,
      employmentHistory: lead.employment_history,
      ...(tagConnect ? { tags: tagConnect } : {})
    };
    
    if (lead.drip_status) {
      createData.dripStatus = lead.drip_status as any;
    }

    const created = await prisma.contact.create({
      data: createData
    });
    return created.id;
  }
}

export async function getAllLeads(): Promise<Lead[]> {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return contacts.map(mapContactToLead);
}

export async function updateLeadSyncStatus(
  id: string,
  syncType: 'hubspot' | 'sheets' | 'make' | 'pabbly' | 'pickyassist',
  status: 0 | 1
) {
  const fieldMap = {
    hubspot: 'hubspotSynced',
    sheets: 'sheetsSynced',
    make: 'makeSynced',
    pabbly: 'pabblySynced',
    pickyassist: 'pickyassistSynced'
  };

  const field = fieldMap[syncType];

  try {
    await prisma.contact.update({
      where: { id },
      data: {
        [field]: status
      }
    });
  } catch (err) {
    console.log(`Skipped DB sync status update for ${syncType} (DB fallback mode)`);
  }
}

export async function saveMessage(contactId: string, direction: 'INBOUND' | 'OUTBOUND', content: string) {
  return prisma.message.create({
    data: {
      contactId,
      direction,
      type: 'TEXT',
      content,
      status: direction === 'INBOUND' ? 'DELIVERED' : 'SENT'
    }
  });
}

export async function getContactMessages(phone: string) {
  const contact = await prisma.contact.findUnique({
    where: { phone },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });
  return contact ? contact.messages : [];
}

// Ensure Prisma disconnects gracefully on exit (useful in dev)
if (process.env.NODE_ENV !== 'production') {
  const globalAny: any = global;
  if (!globalAny.prisma) {
    globalAny.prisma = prisma;
  }
}
