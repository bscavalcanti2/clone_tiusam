// Vercel Serverless Function - TiuSam Chat
// Uses Claude Haiku via Anthropic API

import fs from 'fs';
import path from 'path';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// ============================================================
// CARREGA KNOWLEDGE BASE DOS ARQUIVOS MD
// ============================================================
function loadKnowledge() {
    const knowledgeDir = path.join(process.cwd(), 'knowledge');
    const files = ['personalidade.md', 'conhecimento-pokemon.md', 'videos.md'];
    const parts = [];

    for (const file of files) {
        const filePath = path.join(knowledgeDir, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            parts.push(content.trim());
        }
    }

    return parts.join('\n\n---\n\n');
}

// ============================================================
// SYSTEM PROMPT - Base fixa + Knowledge Base dos MDs
// ============================================================
const KNOWLEDGE_BASE = loadKnowledge();

const SYSTEM_PROMPT = `Você é o TiuSam IA — um clone de IA do criador de conteúdo TiuSam (@tiusam182), treinado com base no estilo, personalidade e conhecimento do canal. Você está respondendo fãs e seguidores num chat do site oficial do TiuSam.

# REGRAS CRÍTICAS (NUNCA QUEBRE)
1. **Admita que é IA** quando perguntado diretamente: "Cara, sou um clone IA do TiuSam, treinado pra falar no estilo dele! O TiuSam de verdade tá lá no canal gravando. 😄"
2. **NUNCA recomende compra ou investimento como certeza.** Sempre avise: "não é dica de investimento, viu?"
3. **NUNCA garanta valorização de cartas.** Mercado é volátil.
4. **Não invente informações.** Se não souber, admita e indique o canal ou site oficial.
5. **Não fale mal** de criadores, lojas ou jogadores.
6. **Foco em TCG.** Perguntas fora do tema: redirecione com humor. "Opa, aqui é só carta de Pokémon irmão! 😄"
7. **Respostas curtas.** Máximo 3 parágrafos. Chat, não aula.
8. **Não prometa nada em nome do canal real.**
9. **Sem markdown.** Não use asteriscos, negrito, itálico nem formatação nenhuma. Texto puro, como WhatsApp.
10. **Sem "depende".** Quando tiver opinião formada sobre algo, dá ela direto e com convicção. Não fica em cima do muro.

# BASE DE CONHECIMENTO DO TIUSAM
${KNOWLEDGE_BASE}
`;


// ============================================================
// RATE LIMITING (em memória - reset a cada cold start)
// ============================================================
const rateLimitStore = new Map();

const LIMITS = {
    PER_MINUTE: 8,        // máximo 8 mensagens por minuto
    PER_HOUR: 40,         // máximo 40 mensagens por hora
    MIN_INTERVAL_MS: 2000, // mínimo 2s entre mensagens
    MAX_MESSAGE_LENGTH: 500,
    MIN_MESSAGE_LENGTH: 2,
};

function getClientIp(request) {
    // Vercel passa o IP real no header x-forwarded-for
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers['x-real-ip'] || 'unknown';
}

function checkRateLimit(ip) {
    const now = Date.now();
    const record = rateLimitStore.get(ip) || {
        timestamps: [],
        lastMessage: 0,
        blocked: false,
    };

    // Limpa timestamps antigos (mais de 1 hora)
    record.timestamps = record.timestamps.filter(t => now - t < 3600000);

    // Conta últimos 60 segundos
    const lastMinute = record.timestamps.filter(t => now - t < 60000).length;
    const lastHour = record.timestamps.length;

    // Intervalo mínimo entre mensagens
    if (now - record.lastMessage < LIMITS.MIN_INTERVAL_MS) {
        return {
            allowed: false,
            reason: 'TOO_FAST',
            message: 'Calma aí, irmão! Espera uns segundinhos antes de mandar outra. ⚡',
            retryAfter: Math.ceil((LIMITS.MIN_INTERVAL_MS - (now - record.lastMessage)) / 1000),
        };
    }

    // Limite por minuto
    if (lastMinute >= LIMITS.PER_MINUTE) {
        return {
            allowed: false,
            reason: 'RATE_LIMIT_MINUTE',
            message: `Eita, calma! Você já mandou ${lastMinute} mensagens nesse minuto. Respira e tenta de novo daqui a pouco! 😅`,
            retryAfter: 60,
        };
    }

    // Limite por hora
    if (lastHour >= LIMITS.PER_HOUR) {
        return {
            allowed: false,
            reason: 'RATE_LIMIT_HOUR',
            message: `Opa, você já mandou bastante mensagem nessa última hora (${lastHour}). Dá uma pausa e volta daqui a pouco, beleza? Vai assistir uns vídeos no canal! 🎬`,
            retryAfter: 3600,
        };
    }

    // Tudo certo, registra o uso
    record.timestamps.push(now);
    record.lastMessage = now;
    rateLimitStore.set(ip, record);

    // Limpa o store se ficar muito grande (proteção de memória)
    if (rateLimitStore.size > 1000) {
        const cutoff = now - 3600000;
        for (const [key, value] of rateLimitStore.entries()) {
            if (value.lastMessage < cutoff) {
                rateLimitStore.delete(key);
            }
        }
    }

    return { allowed: true };
}

function validateMessage(message) {
    if (!message || typeof message !== 'string') {
        return { valid: false, reason: 'Mensagem inválida.' };
    }

    const trimmed = message.trim();

    if (trimmed.length < LIMITS.MIN_MESSAGE_LENGTH) {
        return { valid: false, reason: 'Manda uma pergunta de verdade aí, irmão! 😄' };
    }

    if (trimmed.length > LIMITS.MAX_MESSAGE_LENGTH) {
        return {
            valid: false,
            reason: `Calma aí, sua mensagem tem ${trimmed.length} caracteres! Máximo é ${LIMITS.MAX_MESSAGE_LENGTH}. Resume aí pra mim! ⚡`
        };
    }

    return { valid: true, message: trimmed };
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Identifica o cliente
        const clientIp = getClientIp(request);

        // 2. Valida a mensagem
        const { message } = request.body || {};
        const validation = validateMessage(message);
        if (!validation.valid) {
            return response.status(400).json({
                error: 'Invalid message',
                response: validation.reason,
            });
        }

        // 3. Checa rate limit
        const rateCheck = checkRateLimit(clientIp);
        if (!rateCheck.allowed) {
            console.warn(`🚫 Rate limited: ${clientIp} - ${rateCheck.reason}`);
            return response.status(429).json({
                error: 'Rate limit exceeded',
                response: rateCheck.message,
                retryAfter: rateCheck.retryAfter,
            });
        }

        // 4. Verifica API Key
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('❌ ANTHROPIC_API_KEY not found');
            return response.status(500).json({
                error: 'API key not configured',
                response: 'Eita, deu ruim aqui no servidor! Avisa o Bruno! 🛠️',
            });
        }

        // 5. Chama a API da Anthropic
        const apiResponse = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 600,
                system: SYSTEM_PROMPT,
                messages: [
                    { role: 'user', content: validation.message },
                ],
            }),
        });

        if (!apiResponse.ok) {
            let errorData;
            try {
                errorData = await apiResponse.json();
            } catch {
                errorData = { text: await apiResponse.text() };
            }
            console.error('❌ Anthropic API error:', { status: apiResponse.status, error: errorData });
            return response.status(apiResponse.status).json({
                error: 'API error',
                response: 'Eita, tive um problema aqui pra responder. Tenta de novo daqui uns instantes! 🛠️',
                details: errorData,
            });
        }

        const data = await apiResponse.json();

        if (!data.content || !data.content[0] || !data.content[0].text) {
            console.error('❌ Invalid response structure:', data);
            return response.status(500).json({
                error: 'Invalid response',
                response: 'Eita, recebi uma resposta estranha aqui. Tenta de novo!',
            });
        }

        return response.status(200).json({
            response: data.content[0].text,
        });

    } catch (error) {
        console.error('❌ Server error:', { message: error.message, stack: error.stack });
        return response.status(500).json({
            error: 'Internal server error',
            response: 'Deu ruim aqui, irmão! Tenta de novo em uns instantes! 🛠️',
        });
    }
}
