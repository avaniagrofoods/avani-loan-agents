const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    console.error("No workspace found. Run some operations to create a default workspace first.");
    return;
  }

  const templates = [
    {
      name: 'drip_day_3',
      category: 'MARKETING',
      content: 'Hello {{1}}, this is Sachin Shinde from AVANI LOAN SERVICES. I am checking back to see if you still need assistance with a loan? We offer competitive rates and fast processing. Reply to this message to check your eligibility today!',
      workspaceId: workspace.id,
      status: 'APPROVED'
    },
    {
      name: 'drip_day_5',
      category: 'MARKETING',
      content: 'Hello {{1}}, we understand you might be busy. If you are still looking for financial support for your business, education, or personal needs, let us know! Otherwise, please feel free to refer AVANI LOAN SERVICES to your friends and family. Thank you!',
      workspaceId: workspace.id,
      status: 'APPROVED'
    }
  ];

  for (const t of templates) {
    const existing = await prisma.template.findFirst({
      where: { name: t.name, workspaceId: workspace.id }
    });

    if (!existing) {
      await prisma.template.create({ data: t });
      console.log(`Created template: ${t.name}`);
    } else {
      console.log(`Template ${t.name} already exists.`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
