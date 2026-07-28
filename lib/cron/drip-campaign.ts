import { PrismaClient } from '@prisma/client';
import { sendWhatsAppMeta } from '../services/whatsapp';

const prisma = new PrismaClient();

export async function processDripCampaigns() {
  console.log('Starting daily drip campaign processing...');
  
  const activeContacts = await prisma.contact.findMany({
    where: { dripStatus: 'ACTIVE' }
  });

  const now = new Date();
  let processed = 0;
  let sentDay3 = 0;
  let sentDay5 = 0;

  for (const contact of activeContacts) {
    // Determine the start date for this drip step
    const lastSent = contact.lastMessageSentAt || contact.createdAt;
    
    // Calculate difference in whole days
    const diffTime = Math.abs(now.getTime() - lastSent.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Map Prisma Contact back to Lead interface expected by sendWhatsAppMeta
    const leadParam = {
      name: contact.name || '',
      phone: contact.phone,
      loan_type: contact.loanType || '',
      loan_amount: contact.loanAmount || 0,
      monthly_income: contact.income || 0,
      employment_type: contact.employmentType || '',
      eligibility_status: contact.status || 'NEW_LEAD',
      eligibility_reason: contact.eligibilityReason || '',
      source: contact.source || '',
      hubspot_synced: contact.hubspotSynced || 0,
      sheets_synced: contact.sheetsSynced || 0,
      make_synced: contact.makeSynced || 0,
      pabbly_synced: contact.pabblySynced || 0,
      pickyassist_synced: contact.pickyassistSynced || 0,
    };

    if (contact.currentDripDay === 0 && diffDays >= 3) {
      // Send Day 3 Template
      console.log(`Sending Day 3 drip to ${contact.phone}`);
      const result = await sendWhatsAppMeta(leadParam, 'drip_day_3', [contact.name || 'Customer']);
      
      if (result.success) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { currentDripDay: 3, lastMessageSentAt: now }
        });
        sentDay3++;
        processed++;
      }
    } else if (contact.currentDripDay === 3 && diffDays >= 2) {
      // Send Day 5 Template (2 days after Day 3)
      console.log(`Sending Day 5 drip to ${contact.phone}`);
      const result = await sendWhatsAppMeta(leadParam, 'drip_day_5', [contact.name || 'Customer']);
      
      if (result.success) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { 
            currentDripDay: 5, 
            lastMessageSentAt: now, 
            dripStatus: 'COMPLETED' // End of drip campaign
          }
        });
        sentDay5++;
        processed++;
      }
    }
  }

  console.log(`Drip processing complete. Total processed: ${processed}. Day 3: ${sentDay3}, Day 5: ${sentDay5}`);
  return { processed, sentDay3, sentDay5 };
}
