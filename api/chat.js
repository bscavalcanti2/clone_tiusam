// Vercel Serverless Function - TiuSam Chat
// Uses Claude Haiku via Anthropic API

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `Você é TiuSam, um criador de conteúdo do YouTube especializado em Pokémon Trading Card Game (TCG). Você responde aos seguidores e fãs do seu canal com uma atitude amigável, entusiasmada e acessível.

**Características da sua personalidade:**
- Apaixonado por Pokémon TCG
- Conhecedor profundo sobre cartas, decks, estratégias e história do jogo
- Informal, descontraído e divertido nas conversas
- Sempre pronto para ajudar iniciantes e jogadores avançados
- Faz piadas com Pokémon quando apropriado
- Menciona seu canal e conteúdo naturalmente quando relevante

**Como você responde:**
- Use linguagem natural e conversacional (como se estivesse respondendo um comentário no YouTube)
- Seja conciso, mas informativo
- Quando não souber algo específico, admita honestamente
- Encoraje a comunidade a participar e compartilhar experiências
- Use emojis ocasionalmente para dar mais vida às respostas (Pokémon, cartas, etc)

**Evite:**
- Respostas muito longas (máximo 2-3 parágrafos)
- Ser muito formal ou robótico
- Sair completamente do tema de Pokémon TCG
- Fazer promessas que não pode cumprir

Lembre-se: você está respondendo como TiuSam, não como um assistente genérico!`;

export default async function handler(request, response) {
    // Only accept POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message } = request.body;

        // Validate input
        if (!message || typeof message !== 'string' || !message.trim()) {
            console.warn('Invalid message received:', message);
            return response.status(400).json({ error: 'Invalid message' });
        }

        // Get API key from environment
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('❌ ANTHROPIC_API_KEY not found in environment');
            return response.status(500).json({
                error: 'API key not configured',
                status: 'MISSING_API_KEY'
            });
        }

        console.log('✅ API Key found, length:', apiKey.length);
        console.log('📤 Sending request to Anthropic API...');

        // Call Claude API
        const apiResponse = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                system: SYSTEM_PROMPT,
                messages: [
                    {
                        role: 'user',
                        content: message,
                    },
                ],
            }),
        });

        console.log('📥 Response status:', apiResponse.status);

        // Handle API errors
        if (!apiResponse.ok) {
            let errorData;
            try {
                errorData = await apiResponse.json();
            } catch {
                errorData = { text: await apiResponse.text() };
            }

            console.error('❌ Anthropic API error:', {
                status: apiResponse.status,
                error: errorData,
            });

            return response.status(apiResponse.status).json({
                error: 'Failed to get response from Claude',
                status: 'API_ERROR',
                apiStatus: apiResponse.status,
                details: errorData,
            });
        }

        const data = await apiResponse.json();

        console.log('✅ Response received successfully');

        // Extract response text
        if (!data.content || !data.content[0] || !data.content[0].text) {
            console.error('❌ Invalid response structure:', data);
            return response.status(500).json({
                error: 'Invalid response from Claude',
                status: 'INVALID_RESPONSE',
            });
        }

        const responseText = data.content[0].text;

        return response.status(200).json({
            response: responseText,
        });

    } catch (error) {
        console.error('❌ Server error:', {
            message: error.message,
            stack: error.stack,
        });
        return response.status(500).json({
            error: 'Internal server error',
            status: 'SERVER_ERROR',
            message: error.message,
        });
    }
}
