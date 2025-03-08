document.addEventListener('DOMContentLoaded', () => {
    const modelSelector = document.getElementById('modelSelector');
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    let selectedModel = '';
    let selectedMode = document.getElementById("modeSelector");
    let currentBotMessageElement = null;

    // Fill Options
    fetchModels();

    modelSelector.addEventListener('change', (e) => {
        selectedModel = e.target.value;
    });
    modeSelector.addEventListener('change', (e) => {
        selectedMode = e.target.value;
        console.log(selectedMode)
    });

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function fetchModels() {
        fetch('http://localhost:3000/models')
            .then(response => response.json())
            .then(data => {
                if (data.models && Array.isArray(data.models)) {
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.name;
                        option.textContent = model.name;
                        modelSelector.appendChild(option);
                    });
                    selectedModel = data.models[0].name; // Default to the first model
                    modelSelector.value = selectedModel;
                } else {
                    throw new Error('Unexpected format for models data');
                }
            })
            .catch(error => {
                console.error('Error fetching models:', error);
                addMessageToChat('bot', 'Error loading models. Please try again later.', false);
            });
    }

    function sendMessage() {
        let message = userInput.value.trim();
        
        if (message) {
            addMessageToChat('user', message, true);
            if (selectedMode == "short") {
                message = "Deine Antwort wird weiter verarbeitet, deshalb gib deine Antwort kurz in einem Wort wieder.Ich brauche die Rechnungsnummer"
            }
            message = message + " Antworte immer auf Deutsch";
            userInput.value = '';

            // Create a new bot message element for this response
            currentBotMessageElement = createMessageElement('bot');
            chatMessages.appendChild(currentBotMessageElement);

            fetch('http://localhost:3000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [{ role: 'user', content: message, images: ['test.png'] }],
                    stream: true
                }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                if (response.headers.get('content-type')?.includes('text/event-stream')) {
                    return handleStreamingResponse(response);
                } else {
                    return response.json();
                }
            })
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                // For non-streaming responses
                if (data.response) {
                    updateMessageContent(currentBotMessageElement, data.response, true);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                updateMessageContent(currentBotMessageElement, `Sorry, there was an error: ${error.message}`, false);
            });
        }
    }

    function handleStreamingResponse(response) {
        return new Promise((resolve, reject) => {
            const reader = response.body.getReader();
            let accumulatedContent = '';


            function read() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        console.log(accumulatedContent)
                        resolve({ response: accumulatedContent });
                        return;
                    }

                    const chunk = new TextDecoder("utf-8").decode(value);
                    const lines = chunk.split('\n');
                    
                    lines.forEach(line => {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                if (data.message && data.message.content) {
                                    accumulatedContent += data.message.content;
                                    updateMessageContent(currentBotMessageElement, accumulatedContent, true);
                                }
                            } catch (error) {
                                console.error("Error parsing stream data:", error, line);
                            }
                        }
                    });
                    read();
                }).catch(reject);
            }

            read();
        });
    }

    function createMessageElement(role) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${role}-message`);
        return messageElement;
    }

    function updateMessageContent(messageElement, content, format = true) {
        if (format) {
            const formattedContent = formatMessage(content);
            messageElement.innerHTML = formattedContent;
        } else {
            messageElement.textContent = DOMPurify.sanitize(content);
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function formatMessage(content) {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let formattedContent = content.replace(codeBlockRegex, (match, language, code) => {
            language = language || 'plaintext';
            const highlightedCode = hljs.highlight(code.trim(), { language: language }).value;
            const escapedCode = DOMPurify.sanitize(highlightedCode);
            return `<pre><div class="code-header"><span class="code-language">${language}</span><button class="copy-button">Copy</button></div><code class="hljs ${language}">${escapedCode}</code></pre>`;
        });

        // Format inline code
        formattedContent = formattedContent.replace(/`([^`\n]+)`/g, '<code>$1</code>');

        // Use marked for the rest of the content
        formattedContent = DOMPurify.sanitize(marked.parse(formattedContent));

        return formattedContent;
    }

    function addMessageToChat(role, content, format = true) {
        const messageElement = createMessageElement(role);
        updateMessageContent(messageElement, content, format);
        chatMessages.appendChild(messageElement);
    }

    // Add event delegation for copy buttons
    chatMessages.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-button')) {
            const codeElement = e.target.closest('pre').querySelector('code');
            const codeText = codeElement.textContent;

            navigator.clipboard.writeText(codeText)
                .then(() => {
                    e.target.textContent = 'Copied!';
                    setTimeout(() => {
                        e.target.textContent = 'Copy';
                    }, 1500);
                })
                .catch(err => {
                    console.error('Failed to copy code: ', err);
                });
        }
    });
    
});