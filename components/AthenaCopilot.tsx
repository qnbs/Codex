import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { ArticleData, ChatMessage, AthenaCopilotRef } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import * as geminiService from '../services/geminiService';
import { Chat } from '@google/genai';
import { SendIcon } from './IconComponents';
import LoadingSpinner from './LoadingSpinner';

interface AthenaCopilotProps {
    article: ArticleData | null;
    isLoading: boolean;
    currentTopic: string | null;
    history: string[]; // For context
    initialChatHistory?: ChatMessage[];
}

const AthenaCopilot = forwardRef<AthenaCopilotRef, AthenaCopilotProps>(({ article, isLoading, currentTopic, history, initialChatHistory }, ref) => {
    const { t, locale } = useLocalization();
    const [chat, setChat] = useState<Chat | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialChatHistory || []);
    const [userInput, setUserInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
        getChatHistory: () => chatHistory,
    }));

    const getArticleText = useCallback(() => {
        if (!article) return '';
        return [
            `Title: ${article.title}`,
            article.introduction,
            ...article.sections.map(s => `## ${s.heading}\n${s.content}`),
            article.conclusion
        ].join('\n\n');
    }, [article]);

    useEffect(() => {
        if (article) {
            const articleText = getArticleText();
            const recentHistory = history.slice(1, 4).join(', '); // Get 3 previous topics
            const previousContext = recentHistory ? t('athena.previousArticleContextPreamble', { context: recentHistory }) : '';

            const newChat = geminiService.startChat(articleText, locale, t, previousContext);
            setChat(newChat);
            
            // Only set welcome message if it's not from a restored snapshot
            if (!initialChatHistory || initialChatHistory.length === 0) {
                const welcomeMessage: ChatMessage = {
                    role: 'model',
                    parts: [{ text: t('athena.welcomeMessage', { title: article.title }) }]
                };
                setChatHistory([welcomeMessage]);
            }


            setIsSending(true);
            geminiService.getSuggestedQuestions(articleText, locale, t)
                .then(setSuggestedQuestions)
                .catch(console.error)
                .finally(() => setIsSending(false));
        } else {
            setChat(null);
            setChatHistory([]);
            setSuggestedQuestions([]);
        }
    }, [article, locale, t, getArticleText, history, initialChatHistory]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSendMessage = useCallback(async (messageText: string) => {
        if (!chat || !messageText.trim() || isSending) return;

        const text = messageText.trim();
        setIsSending(true);
        setUserInput('');
        setSuggestedQuestions([]);

        const userMessage: ChatMessage = { role: 'user', parts: [{ text }] };
        setChatHistory(prev => [...prev, userMessage]);

        try {
            const response = await chat.sendMessage({ message: text });
            const modelMessage: ChatMessage = { role: 'model', parts: [{ text: response.text }] };
            setChatHistory(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Athena AI Error:", error);
            const errorMessage: ChatMessage = { role: 'model', parts: [{ text: t('athena.error') }] };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsSending(false);
        }
    }, [chat, isSending, t]);
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(userInput);
        }
    };

    const formatMessage = (text: string) => {
        // A simple formatter for bold and lists
        const bolded = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const listed = bolded.replace(/^\* (.*$)/gm, '<ul class="list-disc pl-5"><li>$1</li></ul>');
        return { __html: listed.replace(/\n/g, '<br />') };
    };

    return (
        <div className="h-full w-full bg-gray-900 md:bg-gray-800/50 flex flex-col">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">{t('athena.title')}</h2>
            </div>

            <div className="flex-grow p-4 overflow-y-auto">
                <div className="space-y-4">
                    {chatHistory.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-accent/20 text-gray-200' : 'bg-gray-700/50 text-gray-300'}`}>
                               <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={formatMessage(msg.parts[0].text)} />
                            </div>
                        </div>
                    ))}
                    {isSending && chatHistory.length > 0 && (
                        <div className="flex justify-start">
                             <div className="max-w-md p-3 rounded-lg bg-gray-700/50 text-gray-300">
                                <LoadingSpinner text={t('athena.thinking')} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900 md:bg-transparent">
                {suggestedQuestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {suggestedQuestions.map((q, i) => (
                            <button key={i} onClick={() => handleSendMessage(q)} className="px-3 py-1 bg-gray-700/80 text-gray-300 rounded-full text-sm hover:bg-gray-700">
                                {q}
                            </button>
                        ))}
                    </div>
                )}
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={!article ? t('athena.placeholderLoading') : t('athena.placeholder')}
                        disabled={!article || isSending}
                        rows={1}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 pr-12 text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    />
                    <button
                        onClick={() => handleSendMessage(userInput)}
                        disabled={!article || isSending || !userInput.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-accent hover:bg-accent/20 disabled:text-gray-600 disabled:bg-transparent transition-colors"
                        aria-label={t('common.send')}
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
});

export default AthenaCopilot;