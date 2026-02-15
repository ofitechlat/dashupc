import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const { audioBase64, mimeType, startTime, endTime } = await request.json();

        if (!audioBase64 || !mimeType) {
            return NextResponse.json(
                { error: 'Missing required fields: audioBase64, mimeType' },
                { status: 400 }
            );
        }

        // Transcribir con Gemini 1.5 Flash
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent([
            "Transcribe the following audio accurately. Return only the transcription text without any additional commentary or formatting. If the audio is in Spanish, transcribe in Spanish. If it's in English, transcribe in English.",
            {
                inlineData: {
                    mimeType: mimeType,
                    data: audioBase64
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        return NextResponse.json({
            text,
            startTime,
            endTime
        });

    } catch (error: any) {
        console.error('Transcription error:', error);
        return NextResponse.json(
            { error: 'Transcription failed', details: error.message },
            { status: 500 }
        );
    }
}
