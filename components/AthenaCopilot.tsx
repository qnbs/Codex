import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArticleData, ChatMessage } from '../types';
import { getSuggestedQuestions } from '../services/geminiService';
import { LightbulbIcon, SendIcon, ClipboardCopyIcon } from './IconComponents';
import LoadingSpinner from './LoadingSpinner';
import { useLocalization } from '../context/LocalizationContext';
import type { Chat } from '@google/genai';


const SuggestionChips = React.memo(({ onSelect, disabled, suggestions, isLoadingSuggestions }: { onSelect: (prompt: string) => void, disabled: boolean, suggestions: string[], isLoadingSuggestions: boolean }) => {
    
    if (isLoadingSuggestions) {
        return (
            <div className="flex flex-wrap gap-2 pt-2">
                {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="px-3 py-1.5 h-8 w-48 bg-gray-700 rounded-full animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map(chip => (
                <button
                    key={chip}
                    onClick={() => onSelect(chip)}
                    disabled={disabled}
                    className="px-3 py-1.5 bg-gray-700 text-sm text-gray-300 rounded-full hover:bg-accent disabled:bg-gray-800 disabled:text-gray-500 transition-all transform active:scale-95"
                >
                    {chip}
                </button>
            ))}
        </div>
    );
});

const ChatBubble = React.memo(({ msg }: { msg: ChatMessage }) => {
    const { t } = useLocalization();
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        if (msg.parts[0]?.text) {
            navigator.clipboard.writeText(msg.parts[0].text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };
    
    const isModel = msg.role === 'model';
    const bubbleBaseClasses = "max-w-xs md:max-w-sm lg:max-w-md rounded-lg px-4 py-2 relative";

    const modelBubbleClasses = `
        ${bubbleBaseClasses} bg-gray-700 text-gray-200
        after:content-[''] after:absolute after:bottom-0 after:left-[-7px] 
        after:w-0 after:h-0 
        after:border-b-[10px] after:border-b-gray-700 
        after:border-r-[8px] after:border-r-transparent
    `;

    const userBubbleClasses = `
        ${bubbleBaseClasses} bg-accent text-accent-contrast
        after:content-[''] after:absolute after:bottom-0 after:right-[-7px] 
        after:w-0 after:h-0 
        after:border-b-[10px] after:border-b-accent 
        after:border-l-[8px] after:border-l-transparent
    `;


    return (
        <div className={`flex items-end gap-2 group ${isModel ? 'justify-start' : 'justify-end'}`}>
            {isModel && (
                 <button onClick={handleCopy} title={t('common.copy')} aria-label={t('common.copy')} className="mb-1 text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ClipboardCopyIcon className="w-4 h-4" isCopied={isCopied} />
                </button>
            )}
            <div className={isModel ? modelBubbleClasses : userBubbleClasses}>
                <div className="prose prose-invert prose-sm whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>{msg.parts[0].text}</div>
            </div>
        </div>
    );
});

interface AthenaCopilotProps {
  article: ArticleData | null;
  fullArticleText: string;
  chat: Chat | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isLoadingArticle: boolean;
  currentTopic: string;
}

const AthenaCopilot: React.FC<AthenaCopilotProps> = ({ article, fullArticleText, chat, messages, setMessages, isLoadingArticle, currentTopic }) => {
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { locale, t } = useLocalization();

  useEffect(() => {
    if (article && fullArticleText) {
      setIsLoadingSuggestions(true);
      getSuggestedQuestions(fullArticleText, locale, t)
        .then(setSuggestedQuestions)
        .finally(() => setIsLoadingSuggestions(false));

    } else {
      setSuggestedQuestions([]);
    }
  }, [article, fullArticleText, locale, t]);

  useEffect(() => {
    // Only scroll if there is more than one message, to prevent scrolling on initial load.
    if (messages.length > 1) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!chat || !messageText.trim() || isLoading) return;

    const text = messageText.trim();
    setIsLoading(true);
    setUserInput('');

    const userMessage: ChatMessage = { role: 'user', parts: [{ text }] };
    setMessages(prev => [...prev, userMessage]);

    try {
      const stream = await chat.sendMessageStream({ message: text });
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { role: 'model', parts: [{ text: modelResponse }] };
            return newMessages;
        });
      }
    } catch (e) {
      const errorMsg = t('athena.error');
      setMessages(prev => {
         const newMessages = [...prev];
         // In case the empty message shell was added, replace it. Otherwise, add a new one.
         if (newMessages[newMessages.length - 1].parts[0].text === '') {
            newMessages[newMessages.length - 1] = { role: 'model', parts: [{ text: errorMsg }] };
         } else {
            newMessages.push({ role: 'model', parts: [{ text: errorMsg }] });
         }
         return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  }, [chat, isLoading, setMessages, t]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSendMessage(userInput);
    }
  };

  return (
    <aside className="bg-gray-800/50 border border-gray-700/50 rounded-lg flex flex-col sticky top-28 max-h-[75vh] lg:h-[calc(100vh-8rem)] lg:max-h-[800px]">
      <div className="flex items-center gap-3 p-4 border-b border-gray-700/50">
        <LightbulbIcon className="w-7 h-7 text-accent" />
        <h2 className="text-2xl font-bold text-white">{t('athena.title')}</h2>
      </div>

      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {isLoadingArticle && messages.length === 0 && (
            <div className="flex justify-start">
                 <div className="bg-gray-700 rounded-lg px-4 py-2">
                     <LoadingSpinner text={t('athena.loadingArticle', { topic: currentTopic })} />
                 </div>
            </div>
        )}
        {messages.map((msg, index) => (
          <ChatBubble key={index} msg={msg} />
        ))}
         {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
                 <div className="bg-gray-700 rounded-lg px-4 py-2">
                     <LoadingSpinner text={t('athena.thinking')} />
                 </div>
            </div>
         )}
        <div ref={messagesEndRef} />
      </div>

        {(article || isLoadingArticle) && (
             <div className="p-4 border-t border-gray-700/50">
                <SuggestionChips 
                    onSelect={handleSendMessage} 
                    disabled={isLoading || isLoadingArticle} 
                    suggestions={suggestedQuestions} 
                    isLoadingSuggestions={isLoadingSuggestions} />
                 <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage(userInput);
                    }}
                    className="flex items-center gap-2 mt-4"
                >
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isLoadingArticle ? t('athena.placeholderLoading') : t('athena.placeholder')}
                        disabled={!chat || isLoading || isLoadingArticle}
                        className="w-full bg-gray-700 border-2 border-gray-600 rounded-full text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-300 py-2 px-4"
                    />
                    <button
                        type="submit"
                        disabled={!chat || isLoading || !userInput.trim() || isLoadingArticle}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-accent text-accent-contrast flex items-center justify-center hover:bg-accent-hover disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform active:scale-90"
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
             </div>
        )}
    </aside>
  );
};

export default AthenaCopilot;