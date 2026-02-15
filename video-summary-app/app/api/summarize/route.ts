import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { transcription, videoTitle } = await request.json();

    if (!transcription) {
      return NextResponse.json(
        { error: 'Missing transcription' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Analyze this video transcription and create a structured summary.

Video Title: ${videoTitle || 'Untitled Video'}

Transcription:
${transcription}

Return ONLY a valid JSON object with this exact structure:
{
  "fullSummary": "2-3 paragraph comprehensive summary",
  "sections": [
    {
      "id": "sec1",
      "title": "Section Title",
      "timestamp": 0,
      "duration": 120,
      "content": "Section summary"
    }
  ],
  "keyPoints": ["point 1", "point 2", "point 3"]
}

Create 3-5 logical sections based on the content with accurate timestamps.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean JSON response
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const data = JSON.parse(text);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { error: 'Summarization failed', details: error.message },
      { status: 500 }
    );
  }
}
