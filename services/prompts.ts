
// FIX: Correct import path
import { AppSettings, SummaryType, Locale } from '../types';

const getLanguageInstruction = (locale: Locale) => {
    return locale === 'de' ? 'Antworte auf Deutsch.' : 'Respond in English.';
};

const getArticleLengthInstruction = (length: AppSettings['articleLength']) => {
    switch (length) {
        case 'concise': return 'The article should be concise, around 300-400 words total.';
        case 'in-depth': return 'The article should be detailed and in-depth, over 900 words.';
        case 'standard':
        default:
            return 'The article should be a standard length, around 600 words.';
    }
};

export const Prompts = {
    generateArticle: (locale: Locale, topic: string, settings: AppSettings): string => {
        return `
            ${getLanguageInstruction(locale)}
            You are an expert educator and storyteller. Your task is to generate a comprehensive, engaging, and well-structured article about "${topic}".
            The article must be factual, clear, and accessible to a general audience.
            ${getArticleLengthInstruction(settings.articleLength)}
            The structure should be JSON, following the provided schema exactly.
            - The 'introduction' should be a captivating paragraph that sets the stage.
            - Create 3 to 5 'sections', each with a clear 'heading', detailed 'content', and a visually descriptive 'imagePrompt'. The 'imagePrompt' should be detailed enough for an AI image generator to create a relevant and beautiful image. Do not mention the topic in the image prompt, just describe the scene.
            - The 'conclusion' should summarize the key points and provide a final thought.
            - If the topic is historical or has a clear timeline, provide 3-5 key events in the 'timeline' array. Otherwise, 'timeline' must be an empty array.
        `;
    },

    constructImage: (locale: Locale, prompt: string, settings: AppSettings): string => {
        const styleMap = {
            'photorealistic': 'hyperrealistic, photorealistic, 8k, detailed, professional photography',
            'artistic': 'impressionistic, vibrant colors, artistic, oil painting',
            'vintage': 'vintage photo, sepia tones, old-fashioned, grainy',
            'minimalist': 'minimalist, clean lines, simple, modern'
        };
        const style = styleMap[settings.imageStyle] || styleMap.photorealistic;
        return `${prompt}, in the style of ${style}.`;
    },

    getRelatedTopics: (locale: Locale, topic: string, settings: AppSettings): string => {
        return `
            ${getLanguageInstruction(locale)}
            Based on the topic "${topic}", generate a list of ${settings.synapseDensity} related topics that would be interesting for someone curious about this subject.
            For each topic, provide a 'name', a brief 'relevance' explaining its connection, and a one-sentence 'quickSummary'.
            Follow the provided JSON schema exactly.
        `;
    },

    getSerendipitousTopic: (locale: Locale, currentTopic: string): string => {
        return `
            ${getLanguageInstruction(locale)}
            Given the topic "${currentTopic}", suggest one interesting, esoteric, and unexpected topic that is loosely or tangentially related. Think about surprising connections in history, science, or culture.
            The goal is to provide a "serendipity" or "cosmic leap" moment for the user.
            Return just the topic name in the specified JSON format.
        `;
    },

    generateSummary: (locale: Locale, type: SummaryType, articleText: string): string => {
        const instructions = {
            tldr: 'Provide a very short, one-sentence summary (a "TL;DR").',
            eli5: 'Explain this as if I am 5 years old (an "ELI5"). Use simple words and analogies.',
            keyPoints: 'List the 3-5 most important key points as a bulleted list.',
            analogy: 'Provide a creative and insightful analogy or metaphor to explain the main concept.'
        };
        return `
            ${getLanguageInstruction(locale)}
            Analyze the following article text and ${instructions[type]}. Return the response in the specified JSON format.
            Article: """${articleText}"""
        `;
    },
    
    getSuggestedQuestions: (locale: Locale, articleText: string): string => {
        return `
            ${getLanguageInstruction(locale)}
            Based on the provided article, generate a list of 3 insightful and thought-provoking follow-up questions a curious user might ask to deepen their understanding.
            These questions should not be simple factual lookups but should encourage critical thinking or exploration of related concepts.
            Return the questions as a simple JSON array of strings.
            Article: """${articleText}"""
        `;
    },

    visualizeText: (locale: Locale, text: string): string => `Create a detailed, visually descriptive prompt for an AI image generator to illustrate the concept of "${text}". Do not include the text "${text}" in the prompt itself. Focus on a scene that represents the concept.`,
    
    defineText: (locale: Locale, text: string): string => `${getLanguageInstruction(locale)} Provide a concise, one-sentence definition of "${text}".`,
    
    explainText: (locale: Locale, text: string): string => `${getLanguageInstruction(locale)} Explain the concept of "${text}" in a single, easy-to-understand paragraph.`,
};