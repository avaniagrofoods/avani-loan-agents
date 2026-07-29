import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '../../../lib/agents/advisor-prompt';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || 'AIzaSyAzz0LUgUt9DxicUZQmkoZv3zRh_EdWMlU').trim();

    const formattedMessages = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }]
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: formattedMessages
      })
    });

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Namaste! AVANI LOAN SERVICES side se aapka swagat hai. Main aapki personal/business loan eligibility check karne mein kaise madad kar sakta hoon?";

    // Format for AI SDK stream / text response
    return new Response(replyText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      }
    });

  } catch (error: any) {
    console.error("Error in API Chat Route:", error);
    return new Response(
      "Namaste! AVANI LOAN SERVICES side se aapka swagat hai. Main aapki loan eligibility aur document verification mein madad kar sakta hoon.",
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}
