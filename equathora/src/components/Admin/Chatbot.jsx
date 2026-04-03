import React, { useState } from 'react';
import axios from 'axios';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);

    const sendMessage = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput || isSending) return;

        const userMessage = { text: trimmedInput, user: 'me' };
        const nextMessages = [...messages, userMessage];
        setMessages(nextMessages);
        setInput('');
        setIsSending(true);

        try {
            const endpoint = import.meta.env.VITE_ADMIN_CHATBOT_URL || '/api/admin/solution-generator';
            const response = await axios.post(endpoint, {
                prompt: trimmedInput,
                max_tokens: 150,
                model: 'deepseek-v3.2'
            });

            const botMessage =
                response?.data?.choices?.[0]?.text
                || response?.data?.choice?.[0]?.text
                || response?.data?.reply
                || 'No response received from the model.';

            setMessages((prev) => [...prev, { text: botMessage, user: 'bot' }]);
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || 'Failed to generate a response.';
            setMessages((prev) => [...prev, { text: `Error: ${message}`, user: 'bot' }]);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div>
            <div>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.user}`}>
                        {msg.text}
                    </div>
                ))}
            </div>
            <input type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isSending}
            />
        </div>
    );
};

export default Chatbot;