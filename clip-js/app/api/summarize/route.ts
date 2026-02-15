import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const { transcription, videoTitle, isHierarchical } = await request.json();

        if (!transcription) {
            return NextResponse.json(
                { error: 'Missing required field: transcription' },
                { status: 400 }
            );
        }

        const prompt = isHierarchical
            ? `You are summarizing multiple partial summaries of a long video. Combine these summaries into a cohesive final summary.

Video Title: ${videoTitle || 'Untitled Video'}

Partial Summaries:
${transcription}

Provide:
1. A comprehensive summary (2-3 paragraphs)
2. Key points (bullet list with - prefix)
3. Main topics covered

Format your response clearly with sections.`
            : `Summarize the following video transcription concisely and accurately.

Video Title: ${videoTitle || 'Untitled Video'}

Transcription:
${transcription}

Provide:
1. A concise summary (2-3 paragraphs)
2. Key points (bullet list with - prefix)
3. Main topics covered

Format your response clearly with sections.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({
            summary: text
        });

    } catch (error: any) {
        console.error('Summarization error:', error);
        return NextResponse.json(
            { error: 'Summarization failed', details: error.message },
            { status: 500 }
        );
    }
}
