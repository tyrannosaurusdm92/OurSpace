const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');

function appendMessage(message, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isUser ? 'user-message' : 'bot-message');
    messageDiv.textContent = message;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    appendMessage(message, true);
    userInput.value = '';
    await fetchMessageFromBot(message);
}

sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

async function fetchMessageFromBot(message) {
    try {
        const response = await fetch('http://localhost:5005/webhooks/rest/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sender: 'web_user', message })
        });

        if (!response.ok) {
            throw new Error(`Rasa server returned ${response.status}`);
        }

        const botMessages = await response.json();
        if (!botMessages.length) {
            appendMessage("I'm not sure how to respond to that yet.", false);
            return;
        }

        botMessages.forEach((botMsg) => {
            if (botMsg.text) {
                appendMessage(botMsg.text, false);
            }
        });
    } catch (error) {
        console.error('Error:', error);
        appendMessage('I cannot connect to the Rasa server right now. Please make sure it is running on port 5005.', false);
    }
}
