import React, { useState } from 'react';
import axios from 'axios';

const Chatbot = () => {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState("")

    const sendMessages = async () => {
        const newMessages = [...messages, { text: input, user: "me" }];
        setMessages(newMessges);
        setInput("");

        const response = await axios.post("", {
            prompt: input,
            max_tokens: 150,
            model: "deepseek-v3.2",
        });

        const botMessage = response.data.choice[0].text;
        setMessages([...newMessages, { text: botMessage, user: "bot" }]);
    }
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
                onKeyDown={(e) => e.key === "Enter" && sendMessages()} />
        </div>
    );
};

export default Chatbot;