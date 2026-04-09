// Chat Script for TiuSam
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const chatForm = document.getElementById('chatForm');
const sendBtn = document.getElementById('sendBtn');
const loadingText = document.getElementById('loadingText');

let isLoading = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    enableInput();
});

// Enable input after page loads
function enableInput() {
    userInput.disabled = false;
    sendBtn.disabled = false;
}

// Send message
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = userInput.value.trim();
    if (!message || isLoading) return;

    // Add user message to chat
    addMessageToChat(message, 'user');

    // Clear input
    userInput.value = '';
    userInput.focus();

    // Show loading state
    isLoading = true;
    sendBtn.disabled = true;
    loadingText.style.display = 'flex';

    try {
        // Send to API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });

        const data = await response.json();

        // Tanto sucesso quanto erros da API trazem .response com mensagem amigavel
        if (data.response) {
            addMessageToChat(data.response, 'bot');
        } else if (!response.ok) {
            console.error('❌ API error:', { status: response.status, data });
            addMessageToChat('Eita, deu um problema aqui! Tenta de novo em uns instantes! 🛠️', 'bot');
        } else {
            addMessageToChat('Recebi uma resposta vazia, estranho! Tenta de novo!', 'bot');
        }

    } catch (error) {
        console.error('❌ Network error:', error);
        addMessageToChat(
            'Não consegui me conectar agora, irmão! Verifica sua internet e tenta de novo. 📡',
            'bot'
        );
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        loadingText.style.display = 'none';
        userInput.focus();
    }
});

// Converte markdown simples pra HTML
function parseMarkdown(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
}

// Add message to chat UI
function addMessageToChat(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-bubble';

    // Handle multiline responses
    const paragraphs = text.split('\n').filter(p => p.trim());
    paragraphs.forEach(paragraph => {
        const p = document.createElement('p');
        p.innerHTML = parseMarkdown(paragraph);
        contentDiv.appendChild(p);
    });

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
