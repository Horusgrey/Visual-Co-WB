import React, { useState, useRef, useEffect } from 'react';
// FIX: Changed import from 'ChatMessage' to 'Content' and aliased it, as 'ChatMessage' is not an exported member.
import { GoogleGenAI, Chat, Content as GoogleChatMessage } from "@google/genai";
import { getComplexResponse } from '../services/geminiService';
import type { ChatMessage } from '../types';
import Icon from './common/Icon';
import Spinner from './common/Spinner';
import Tooltip from './common/Tooltip';

const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isThinkingMode, setIsThinkingMode] = useState(false);
    
    const [ai] = useState(() => new GoogleGenAI({ apiKey: process.env.API_KEY! }));
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chatRef.current) {
            // FIX: Moved systemInstruction into the config object as per the API guidelines.
            chatRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: "You are a creative assistant for a visual storyteller. Your name is Co-Pilot. Be helpful, encouraging, and provide concise, actionable ideas. Keep your responses short and to the point.",
                },
            });
            setMessages([{
                id: '0',
                role: 'model',
                text: "Hi! I'm your creative Co-Pilot. How can I help you build your story today?"
            }]);
        }
    }, [ai]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: new Date().toISOString(),
            role: 'user',
            text: input,
        };
        
        const currentInput = input;
        setInput('');
        setIsLoading(true);
        setMessages(prev => [...prev, userMessage]);

        try {
            let modelResponseText: string;
            if (isThinkingMode) {
                const history: GoogleChatMessage[] = messages.map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }));
                modelResponseText = await getComplexResponse(history, currentInput);
            } else {
                 if (chatRef.current) {
                    const result = await chatRef.current.sendMessage({ message: currentInput });
                    modelResponseText = result.text;
                } else {
                    throw new Error("Chat not initialized");
                }
            }
            
            const modelMessage: ChatMessage = {
                id: new Date().toISOString() + '-model',
                role: 'model',
                text: modelResponseText,
            };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: ChatMessage = {
                id: new Date().toISOString() + '-error',
                role: 'model',
                text: "Sorry, I'm having trouble connecting right now. Please try again later.",
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className={`fixed bottom-0 right-0 m-4 md:m-8 transition-all duration-300 ease-in-out z-20 ${isOpen ? 'w-[calc(100%-2rem)] md:w-96 h-[70%] md:h-[32rem]' : 'w-16 h-16'}`}>
                {isOpen ? (
                    <div className="w-full h-full bg-brand-dark-accent/80 backdrop-blur-xl border border-brand-purple/30 rounded-2xl shadow-2xl flex flex-col animate-fade-in">
                        <header className="flex items-center justify-between p-3 border-b border-brand-purple/20 flex-shrink-0">
                            <h3 className="font-bold text-lg pl-2">
                                {isThinkingMode ? "Co-Pilot (Thinking)" : "Creative Co-Pilot"}
                            </h3>
                            <div className="flex items-center gap-2">
                                <Tooltip text="Toggle Thinking Mode for more in-depth responses from Gemini 2.5 Pro">
                                  <label htmlFor="thinking-toggle" className="flex items-center cursor-pointer">
                                      <div className="relative">
                                          <input id="thinking-toggle" type="checkbox" className="sr-only" checked={isThinkingMode} onChange={() => setIsThinkingMode(!isThinkingMode)} />
                                          <div className={`block w-10 h-6 rounded-full transition ${isThinkingMode ? 'bg-brand-pink' : 'bg-brand-dark'}`}></div>
                                          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isThinkingMode ? 'transform translate-x-full' : ''}`}></div>
                                      </div>
                                      <div className="ml-2 text-xs text-gray-300">Pro</div>
                                  </label>
                                </Tooltip>
                                <Tooltip text="Close chat">
                                  <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                                      <Icon name="close" className="w-6 h-6" />
                                  </button>
                                </Tooltip>
                            </div>
                        </header>
                        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-pink to-brand-purple flex-shrink-0 flex items-center justify-center"><Icon name="sparkles" className="w-5 h-5"/></div>}
                                    <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-brand-pink text-white rounded-br-none' : 'bg-brand-dark text-gray-200 rounded-bl-none'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3 justify-start">
                                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-pink to-brand-purple flex-shrink-0 flex items-center justify-center"><Icon name="sparkles" className="w-5 h-5"/></div>
                                     <div className="max-w-xs md:max-w-sm px-4 py-2 rounded-2xl bg-brand-dark text-gray-200 rounded-bl-none">
                                        <Spinner className="w-5 h-5" />
                                     </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSend} className="p-4 border-t border-brand-purple/20 flex-shrink-0">
                            <div className="flex items-center gap-2 bg-brand-dark rounded-full border border-brand-purple/50 focus-within:ring-2 focus-within:ring-brand-pink">
                                <Tooltip text="Type your message here" className="w-full">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ask something..."
                                        className="w-full flex-grow bg-transparent p-3 pl-4 focus:outline-none text-sm"
                                        disabled={isLoading}
                                    />
                                </Tooltip>
                                <Tooltip text="Send message">
                                  <button type="submit" className="p-2 mr-1 rounded-full bg-brand-pink hover:bg-brand-pink/80 disabled:bg-gray-500" disabled={isLoading || !input.trim()}>
                                      <Icon name="send" className="w-5 h-5" />
                                  </button>
                                </Tooltip>
                            </div>
                        </form>
                    </div>
                ) : (
                    <Tooltip text="Open Creative Co-Pilot chat">
                      <button onClick={() => setIsOpen(true)} className="w-16 h-16 bg-gradient-to-br from-brand-pink to-brand-purple rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform">
                          <Icon name="chat" className="w-8 h-8" />
                      </button>
                    </Tooltip>
                )}
            </div>
        </>
    );
};

export default ChatWidget;
