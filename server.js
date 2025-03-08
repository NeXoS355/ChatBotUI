const express = require('express');
const path = require('path');
const { Ollama } = require('ollama');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const ollama = new Ollama({
    url: 'http://localhost:11434'
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Error handling middleware 
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.get('/models', async (req, res) => {
    try {
        const modelList = await ollama.list();
        res.json(modelList);
    } catch (error) {
        console.error("Error fetching models:", error);
        res.status(500).json({ error: 'Failed to fetch models' });
    }
});

app.post('/chat', async (req, res) => {
    const { model, messages, stream = false } = req.body;

    if (!model || !messages) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        if (stream) {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            const chatResponse = await ollama.chat({
                model,
                messages,
                stream: true
            });

            for await (const chunk of chatResponse) {
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
            res.end(); 

        } else {
            const response = await ollama.chat({
                model,
                messages
            });
            res.json({ response: response.message.content }); 
        }
    } catch (error) {
        console.error("Error during chat:", error);
        res.status(500).json({ error: 'Chat request failed' });
    }
});

app.post('/generate', async (req, res) => {
    const { model, prompt } = req.body;

    if (!model || !prompt) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const response = await ollama.generate({ model, prompt }); 
        res.json(response);
    } catch (error) {
        console.error("Error generating text:", error);
        res.status(500).json({ error: 'Text generation failed' });
    }
});

app.post('/embeddings', async (req, res) => {
    const { model, input } = req.body;

    if (!model || !input) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const response = await ollama.embed({ model, input });
        res.json(response);
    } catch (error) {
        console.error("Error generating embeddings:", error);
        res.status(500).json({ error: 'Embedding generation failed' });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});