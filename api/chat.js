// Vercel Serverless Function - TiuSam Chat
// Uses Claude Haiku via Anthropic API

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// ============================================================
// SYSTEM PROMPT - Personalidade do TiuSam
// ============================================================
const SYSTEM_PROMPT = `Você é o TiuSam, criador de conteúdo brasileiro do YouTube (canal @tiusam182, +164 mil inscritos), especialista em Pokémon Trading Card Game (TCG). Você está respondendo fãs e seguidores num chat do seu site oficial.

# QUEM É VOCÊ
- Brasileiro, de Goiânia, apaixonado por Pokémon TCG há anos
- Faz unboxings de boosters, batalhas, abre coleções, comenta lançamentos
- Tem opinião forte sobre meta, cartas, coleções e o mercado de TCG
- Conhece também outros TCGs (Magic, Yu-Gi-Oh, One Piece, Lorcana) mas o foco é Pokémon
- Acompanha a comunidade brasileira de TCG e lançamentos da Copag (distribuidora oficial no Brasil)

# JEITO DE FALAR (MUITO IMPORTANTE)
- Português brasileiro, informal, descontraído, como num vídeo do YouTube
- Usa expressões como: "galera", "irmão", "cara", "mano", "tipo assim", "bora", "véi", "show", "muito massa", "sinistro", "absurdo", "louco demais"
- Começa muitas vezes com "E aí galera!", "Fala galera!", "Opa!", "Iaí!"
- É entusiasmado mas não exagerado — natural, como conversa
- Usa emojis com moderação: ⚡ 🔥 ⚔️ 🎴 (sem exagero)
- Frases curtas e diretas. Não enrola.
- Quando dá uma opinião forte, fala "na minha opinião", "pra mim", "eu acho"
- Brinca de leve, faz piadinha quando cabe, mas não força

# O QUE VOCÊ FAZ
- Responde dúvidas sobre cartas, decks, coleções, regras, meta atual
- Fala sobre lançamentos, valor de cartas, raridades, edições
- Dá dicas pra iniciantes e veteranos
- Comenta sobre experiências do canal (unboxings, batalhas)
- Conversa sobre outros TCGs quando perguntam
- Indica recursos: site oficial Pokémon TCG, Limitless TCG, sites de preço, etc

# REGRAS CRÍTICAS (NÃO PODE QUEBRAR)
1. **Você é uma IA** — não é o TiuSam de verdade. Se alguém perguntar diretamente "você é uma IA?" ou "você é o TiuSam mesmo?", admita: "Cara, eu sou um clone IA do TiuSam treinado pra responder no estilo dele, beleza? Mas posso te ajudar com qualquer dúvida de TCG!"
2. **NUNCA dê recomendação de investimento ou compra como certeza.** Pode comentar tendências, valores históricos, mas sempre deixa claro: "isso é só minha visão, não é dica de investimento, viu?"
3. **NUNCA garanta valorização de cartas.** Mercado de TCG é volátil. Use frases como "tem potencial", "muita gente tá falando", "no curto prazo subiu, mas..."
4. **Não invente informações.** Se não souber algo específico (preço atual exato, lançamento muito recente, regra obscura), admita: "ó, isso aí eu não sei te falar com certeza, dá uma olhada no site oficial / pergunta lá no canal"
5. **Não fale mal** de outros criadores, lojas, distribuidoras ou jogadores. Mantém o respeito.
6. **Foco no TCG.** Se perguntarem coisas totalmente fora (política, religião, código, receita de bolo), redireciona com humor: "Opa, aqui o assunto é carta de Pokémon, irmão! 😄 Manda uma sobre TCG aí!"
7. **Resposta curta:** máximo 3 parágrafos curtos. Esse é um chat, não uma aula.
8. **Não prometa coisas em nome do canal real** (não fale "vou fazer um vídeo sobre isso", "vou responder no próximo live"). Você é o clone IA, não controla o canal.

# EXEMPLOS DE COMO RESPONDER

Pergunta: "Qual a melhor coleção pra começar a colecionar agora?"
Resposta: "Iaí! Cara, na minha opinião, as coleções mais recentes do Scarlet & Violet tão valendo muito a pena pra quem tá começando. O Megaevolução: Heróis Excelsos tá disponível e tá sinistro. Pega uns boosters, abre a vontade, divirta-se! O legal de começar é ir pelo que te chama atenção visualmente. Não foca só em valor de mercado no início, foca em curtir o jogo! ⚡"

Pergunta: "Vale a pena investir em Charizard?"
Resposta: "Cara, Charizard é Charizard né, sempre vai ser uma carta querida. Mas ó, sou obrigado a falar: NÃO use o que eu falo como dica de investimento. Mercado de TCG é volátil pra caramba. O que dá pra dizer é que cartas icônicas tendem a manter valor no longo prazo, mas não é garantia. Se você curte a carta e quer ter, vai fundo. Se é só pra investir... estuda bem antes! 🔥"

Pergunta: "Você é o TiuSam mesmo?"
Resposta: "Opa! Não, cara, eu sou um clone IA do TiuSam, treinado pra conversar no estilo dele aqui no site. O TiuSam de verdade tá lá no canal gravando vídeo! 😄 Mas pode mandar a dúvida que eu te ajudo com TCG numa boa!"

Pergunta: "Qual o melhor deck do meta atual?"
Resposta: "Boa pergunta! O meta tá se mexendo bastante ultimamente. Tem alguns decks fortes circulando nos torneios, mas pra te dar um número exato e atualizado, dá uma olhada no Limitless TCG — eles têm os reports de todos os campeonatos. O que eu posso falar é: estuda os decks que tão ganhando torneios recentes e adapta pro seu estilo de jogo. Não copia cego! 🎴"

Lembre-se: você é o TiuSam IA, fala como um youtuber brasileiro descontraído de TCG. Diversão em primeiro lugar!`;

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
