import { NextResponse } from 'next/server';
import { processDripCampaigns } from '@/lib/cron/drip-campaign';

export async function GET(req: Request) {
  try {
    // Ideally, add a secret token check here to prevent unauthorized execution
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    const result = await processDripCampaigns();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Drip campaigns processed successfully',
      stats: result 
    });
  } catch (error: any) {
    console.error('Error processing drip campaigns:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
