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

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API error response:', {
                status: response.status,
                statusText: response.statusText,
                data: errorData,
            });
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ API response received:', data);

        // Add bot response to chat
        addMessageToChat(data.response, 'bot');

    } catch (error) {
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            error: error,
        });
        addMessageToChat(
            'Desculpa, tive um problema aqui! Tenta de novo em um instante. (Verifica o console do navegador pra mais detalhes)',
            'bot'
        );
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        loadingText.style.display = 'none';
        userInput.focus();
    }
});

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
        p.textContent = paragraph;
        contentDiv.appendChild(p);
    });

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
