import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToCoreMessages } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || 'AIzaSyAzz0LUgUt9DxicUZQmkoZv3zRh_EdWMlU').trim();

    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    });

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      messages: convertToCoreMessages(messages || []),
      system: `You are the AI Advisor for AVANI LOAN SERVICES, founded by Sachin Shinde in Latur, Maharashtra.
You assist customers in Marathi, Hindi, or English for Personal Loans, Business Loans, Home Loans, Doctor Loans, CA Loans, and Education Loans up to ₹50 Lakhs.
Be polite, professional, and guide them on eligibility criteria, document checklists, and EMI options.`,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("Error in API Chat Route:", error);
    return new Response("Namaste! AVANI LOAN SERVICES side se aapka swagat hai. Main aapki loan eligibility check karne mein kaise madad kar sakta hoon?", {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
