# TiuSam - YouTube Followers Chat

Um assistente AI que responde aos seguidores do canal TiuSam (YouTube) como se fosse o próprio TiuSam, especializado em Pokémon TCG.

## 🎯 Funcionalidades

- **Chat com IA Real**: Powered by Claude Haiku
- **Identidade Visual**: Cores do canal (laranja, amarelo, preto)
- **Interface Minimalista**: Design clean e responsivo
- **Deployment Automático**: Via Vercel + GitHub

## 📋 Stack

- **Frontend**: HTML + CSS + Vanilla JavaScript
- **Backend**: Vercel Serverless Functions (Node.js)
- **IA**: Claude Haiku API (Anthropic)
- **Hosting**: Vercel

## 🚀 Setup Local

### 1. Clone o repositório
```bash
git clone https://github.com/bscavalcanti2/clone_tiusam.git
cd clone_tiusam
```

### 2. Configure variáveis de ambiente
Crie um arquivo `.env.local`:
```
ANTHROPIC_API_KEY=seu_api_key_aqui
```

### 3. Teste localmente
```bash
# Com Vercel CLI
vercel dev
```

## 🌐 Deploy no Vercel

1. Conecte seu repositório GitHub ao Vercel
2. O Vercel automaticamente detectará `vercel.json`
3. Configure a variável `ANTHROPIC_API_KEY` nas environment variables do projeto
4. A cada push em `main`, o deploy acontece automaticamente

## 📁 Estrutura de Arquivos

```
clone_tiusam/
├── index.html          # Frontend principal
├── style.css          # Estilos (cores TiuSam)
├── script.js          # Lógica do chat
├── api/
│   └── chat.js        # Serverless function (Claude API)
├── vercel.json        # Configuração Vercel
├── .gitignore         # Git ignore
└── README.md          # Este arquivo
```

## 🎨 Cores da Identidade

- **Primária**: `#ff6600` (Laranja)
- **Secundária**: `#ffcc00` (Amarelo)
- **Dark**: `#1a1a1a` (Preto)

## 🔧 Próximas Melhorias

- [ ] Refinar tom e respostas do system prompt
- [ ] Adicionar guardrails mais específicos
- [ ] Implementar histórico de conversas
- [ ] Adicionar análise de sentimento

## 📝 Notas

- A API Key deve estar configurada nas environment variables do Vercel
- Máximo 30 segundos de timeout por request
- Usa Claude Haiku para manter custos baixos e resposta rápida

---

**Criado com ❤️ para a comunidade Pokemon TCG do TiuSam**
