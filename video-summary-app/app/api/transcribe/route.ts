import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const { audioBase64, mimeType } = await request.json();

        if (!audioBase64 || !mimeType) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent([
            `Transcribe this audio and provide timestamps for logical segments (every 2-3 minutes).
      
      Return ONLY a valid JSON object with this exact structure:
      {
        "text": "full transcription text",
        "segments": [
          {
            "id": "seg1",
            "startTime": 0,
            "endTime": 120,
            "text": "segment text"
          }
        ]
      }`,
            {
                inlineData: {
                    mimeType,
                    data: audioBase64
                }
            }
        ]);

        const response = await result.response;
        let text = response.text();

        // Clean JSON response
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const data = JSON.parse(text);

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Transcription error:', error);
        return NextResponse.json(
            { error: 'Transcription failed', details: error.message },
            { status: 500 }
        );
    }
}
