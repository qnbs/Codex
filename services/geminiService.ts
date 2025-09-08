// FIX: Add GenerateImagesResponse type for generateImages API call.
import { GoogleGenAI, Type, GenerateContentResponse, Chat, GenerateImagesResponse, Modality } from "@google/genai";
import { ArticleData, RelatedTopic, ChatMessage, StarterTopic, AppSettings, SummaryType, Locale } from '../types';
import { Prompts } from './prompts';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const callGeminiWithRetry = async <T,>(apiCall: () => Promise<T>, context: string, locale: Locale, maxRetries = 3, initialDelay = 2000): Promise<T> => {
    const errorMessages = {
        de: {
            rateLimit: "Das API-Ratenlimit wurde überschritten. Bitte überprüfen Sie Ihren Plan und Ihre Abrechnungsdetails oder versuchen Sie es später erneut.",
            maxRetries: `[${context}] Maximale Wiederholungsversuche überschritten.`
        },
        en: {
            rateLimit: "The API rate limit has been exceeded. Please check your plan and billing details, or try again later.",
            maxRetries: `[${context}] Max retries exceeded.`
        }
    };
    const messages = errorMessages[locale] || errorMessages.en;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (error: any) {
            const errorMessage = error?.toString() ?? '';
            const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED');

            if (isRateLimitError) {
                if (attempt === maxRetries - 1) {
                    console.error(`[${context}] Final attempt failed due to rate limiting.`);
                    throw new Error(messages.rateLimit);
                }
                const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000; // Exponential backoff with jitter
                console.warn(`[${context}] Rate limit hit. Retrying in ${Math.round(delay / 1000)}s... (Attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`[${context}] Non-retryable error:`, error);
                throw error; // Re-throw other errors immediately
            }
        }
    }
    throw new Error(messages.maxRetries);
};

const timelineEventSchema = {
    type: Type.OBJECT,
    properties: {
        date: { type: Type.STRING, description: "The year or date of the event." },
        title: { type: Type.STRING, description: "A short title for the event." },
        description: { type: Type.STRING, description: "A one-sentence description of the event." },
    },
    required: ["date", "title", "description"]
};

const articleSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The main title of the article." },
    introduction: { type: Type.STRING, description: "A detailed introductory paragraph." },
    sections: {
      type: Type.ARRAY,
      description: "An array of 3-5 sections, each with a heading, detailed content, and a prompt for an accompanying image.",
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING, description: "The heading for this section." },
          content: { type: Type.STRING, description: "The detailed content for this section." },
          imagePrompt: { type: Type.STRING, description: "A detailed, visually descriptive prompt to generate an image that captures the essence of this section's content."}
        },
        required: ["heading", "content", "imagePrompt"]
      }
    },
    conclusion: { type: Type.STRING, description: "A concluding paragraph." },
    timeline: {
        type: Type.ARRAY,
        description: "If the topic is historical or has a clear chronological progression, provide a timeline of 3-5 key events. Otherwise, this should be an empty array.",
        items: timelineEventSchema,
    }
  },
  required: ["title", "introduction", "sections", "conclusion", "timeline"]
};

const relatedTopicsSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "The name of the related topic." },
            relevance: { type: Type.STRING, description: "A brief explanation of its relevance to the original topic." },
            quickSummary: { type: Type.STRING, description: "A very short, one-sentence summary of this new topic."}
        },
        required: ["name", "relevance", "quickSummary"]
    }
};

const serendipitySchema = {
    type: Type.OBJECT,
    properties: {
        topic: { type: Type.STRING, description: "An interesting, esoteric, and unexpected topic that is loosely or tangentially related to the original topic." },
    },
    required: ["topic"],
};

const simpleResponseSchema = {
  type: Type.OBJECT,
  properties: {
    response: { type: Type.STRING },
  },
  required: ["response"],
}

const suggestedQuestionsSchema = {
    type: Type.ARRAY,
    description: "A list of 3 insightful follow-up questions a curious user might ask about the article.",
    items: { type: Type.STRING }
};

const parseJsonResponse = <T,>(jsonText: string, context: string, locale: Locale): T => {
    try {
        const cleanedJson = jsonText.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedJson) as T;
    } catch (error) {
        const message = locale === 'de' 
            ? `Inhalt für ${context} konnte nicht geparst werden. Die KI-Antwort war kein gültiges JSON.`
            : `Could not parse content for ${context}. The AI response was not valid JSON.`;
        console.error(`Error parsing JSON for ${context}:`, error, "Raw text:", jsonText);
        throw new Error(message);
    }
}

export const generateArticleContent = async (topic: string, settings: AppSettings, locale: Locale): Promise<ArticleData> => {
  try {
    const prompt = Prompts.generateArticle(locale, topic, settings);
    const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: articleSchema,
      },
    }), `article content for "${topic}"`, locale);
    return parseJsonResponse<ArticleData>(response.text, "article", locale);
  } catch (error) {
    console.error(`Error generating article for "${topic}":`, error);
    if (error instanceof Error) {
        if (error.message.includes("API-Ratenlimit") || error.message.includes("rate limit")) throw error;
        if (error.message.includes("SAFETY")) {
             const message = locale === 'de'
                ? `Das Thema "${topic}" hat einen Sicherheitsfilter ausgelöst. Bitte versuchen Sie ein anderes Thema.`
                : `The topic "${topic}" triggered a safety filter. Please try another topic.`;
             throw new Error(message);
        }
    }
    const message = locale === 'de'
        ? `Fehler beim Erstellen des Artikels für "${topic}". Das Thema ist möglicherweise zu breit, zweideutig oder eingeschränkt.`
        : `Failed to create article for "${topic}". The topic may be too broad, ambiguous, or restricted.`;
    throw new Error(message);
  }
};

export const constructImagePrompt = (prompt: string, settings: AppSettings, locale: Locale): string => {
    return Prompts.constructImage(locale, prompt, settings);
}

export const generateImageForSection = async (prompt: string, settings: AppSettings, locale: Locale): Promise<string> => {
    if (!prompt) return '';
    try {
        const fullPrompt = constructImagePrompt(prompt, settings, locale);
        const response = await callGeminiWithRetry<GenerateImagesResponse>(() => ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '16:9',
            },
        }), `image for prompt "${prompt}"`, locale);
        const base64ImageBytes = response.generatedImages[0]?.image?.imageBytes;
        if (!base64ImageBytes) {
            throw new Error("No image bytes returned from API.");
        }
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch(error) {
        console.error('Error generating image for prompt "', prompt, '":', error);
        const safetyMessage = locale === 'de' ? 'Die Anweisung hat einen Sicherheitsfilter ausgelöst.' : 'The prompt triggered a safety filter.';
        const complexMessage = locale === 'de' ? 'Der Prompt könnte zu komplex oder eingeschränkt sein.' : 'The prompt may be too komplex oder eingeschränkt sein.';
        const errorMessage = error instanceof Error && error.message.includes('SAFETY') ? safetyMessage : complexMessage;
        const finalMessage = locale === 'de' ? `Bilderzeugung fehlgeschlagen. ${errorMessage}` : `Image generation failed. ${errorMessage}`;
        throw new Error(finalMessage);
    }
}

export const generateVideoForSection = async (
    prompt: string,
    settings: AppSettings,
    locale: Locale,
    onStatusUpdate: (status: string) => void
): Promise<string> => {
    if (!prompt) return '';
    try {
        const fullPrompt = constructImagePrompt(prompt, settings, locale);
        onStatusUpdate(locale === 'de' ? 'Starte Videogenerierung...' : 'Starting video generation...');
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: fullPrompt,
            config: { numberOfVideos: 1 }
        });

        onStatusUpdate(locale === 'de' ? 'Warte auf Verarbeitung...' : 'Awaiting processing...');
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            onStatusUpdate(locale === 'de' ? 'Überprüfe Status...' : 'Checking status...');
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        
        onStatusUpdate(locale === 'de' ? 'Video-Download...' : 'Downloading video...');
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error(locale === 'de' ? 'Kein Video-Download-Link erhalten.' : 'No video download link received.');
        }

        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            throw new Error(locale === 'de' ? `Fehler beim Abrufen des Videos: ${response.statusText}` : `Failed to fetch video: ${response.statusText}`);
        }
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);

    } catch(error) {
        console.error('Error generating video for prompt "', prompt, '":', error);
        const message = locale === 'de' ? 'Videogenerierung fehlgeschlagen.' : 'Video generation failed.';
        throw new Error(message);
    }
};

export const getRelatedTopics = async (topic: string, settings: AppSettings, locale: Locale): Promise<RelatedTopic[]> => {
    try {
        const prompt = Prompts.getRelatedTopics(locale, topic, settings);
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: relatedTopicsSchema,
            },
        }), `related topics for "${topic}"`, locale);
        return parseJsonResponse<RelatedTopic[]>(response.text, "related topics", locale);
    } catch (error) {
        console.error("Error generating related topics:", error);
        if (error instanceof Error && (error.message.includes("API-Ratenlimit") || error.message.includes("rate limit"))) {
            throw error;
        }
        const message = locale === 'de' ? "Fehler beim Generieren verwandter Themen." : "Failed to generate related topics.";
        throw new Error(message);
    }
};

export const getSerendipitousTopic = async (currentTopic: string, locale: Locale): Promise<string> => {
     try {
        const prompt = Prompts.getSerendipitousTopic(locale, currentTopic);
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: serendipitySchema,
            },
        }), `serendipity topic for "${currentTopic}"`, locale);
        const result = parseJsonResponse<{topic: string}>(response.text, "serendipity topic", locale);
        return result.topic;
    } catch (error) {
        console.error("Error generating serendipitous topic:", error);
        if (error instanceof Error && (error.message.includes("API-Ratenlimit") || error.message.includes("rate limit"))) {
            throw error;
        }
        const message = locale === 'de' ? "Fehler beim Generieren eines Kosmischer Sprung-Themas." : "Failed to generate a Cosmic Leap topic.";
        throw new Error(message);
    }
}

export const getStarterTopics = (t: (key: string, params?: { [key: string]: string | number | undefined }) => any): StarterTopic[] => {
    return t('starterTopics');
};


export const generateSummary = async (articleText: string, type: SummaryType, locale: Locale): Promise<string> => {
    const prompt = Prompts.generateSummary(locale, type, articleText);
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: simpleResponseSchema,
            }
        }), `summary (${type})`, locale);
        const result = parseJsonResponse<{ response: string }>(response.text, `summary (${type})`, locale);
        return result.response;
    } catch (error) {
        console.error(`Error generating summary type ${type}:`, error);
        if (error instanceof Error && (error.message.includes("API-Ratenlimit") || error.message.includes("rate limit"))) {
            throw error;
        }
        const message = locale === 'de' ? `Zusammenfassung konnte nicht generiert werden: ${type}` : `Could not generate summary: ${type}`;
        throw new Error(message);
    }
};

export const getSuggestedQuestions = async (articleText: string, locale: Locale, t: (key: string, params?: { [key: string]: string | number | undefined }) => any): Promise<string[]> => {
    try {
        const prompt = Prompts.getSuggestedQuestions(locale, articleText);
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: suggestedQuestionsSchema,
            },
        }), "suggested questions", locale);
        return parseJsonResponse<string[]>(response.text, "suggested questions", locale);
    } catch (error) {
        console.error("Error generating suggested questions:", error);
        return t('athena.fallbackQuestions');
    }
};

export const startChat = (articleContext: string, locale: Locale, t: (key: string, params?: { [key: string]: string | number | undefined }) => any): Chat => {
    const systemInstruction = t('athena.systemInstruction', { articleContext });
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
        },
    });
};

export const explainOrDefine = async (text: string, mode: 'Define' | 'Explain' | 'Visualize', settings: AppSettings, locale: Locale): Promise<string> => {
    try {
        if (mode === 'Visualize') {
            const prompt = Prompts.visualizeText(locale, text);
            return generateImageForSection(prompt, settings, locale);
        }

        const prompt = mode === 'Define'
            ? Prompts.defineText(locale, text)
            : Prompts.explainText(locale, text);

        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: simpleResponseSchema,
            }
        }), `${mode} for "${text}"`, locale);

        const result = parseJsonResponse<{ response: string }>(response.text, mode, locale);
        return result.response;

    } catch (error) {
        console.error(`Error in ${mode} for text "${text}":`, error);
        if (error instanceof Error && (error.message.includes("API-Ratenlimit") || error.message.includes("rate limit"))) {
            throw error;
        }
        if (locale === 'de') {
            const germanVerb = mode === 'Define' ? 'definieren' : mode === 'Explain' ? 'erklären' : 'visualisieren';
            throw new Error(`Ich konnte diese Auswahl nicht ${germanVerb}.`);
        } else {
            throw new Error(`I was unable to ${mode.toLowerCase()} this selection.`);
        }
    }
};

export const editImage = async (base64ImageDataUrl: string, prompt: string, locale: Locale): Promise<string> => {
    try {
        const [meta, base64Data] = base64ImageDataUrl.split(',');
        if (!meta || !base64Data) {
            throw new Error("Invalid base64 image data URL.");
        }
        const mimeType = meta.split(':')[1].split(';')[0];

        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        }), `image edit for prompt "${prompt}"`, locale);

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePart && imagePart.inlineData) {
            const newMimeType = imagePart.inlineData.mimeType;
            const newBase64Data = imagePart.inlineData.data;
            return `data:${newMimeType};base64,${newBase64Data}`;
        }
        
        throw new Error(locale === 'de' ? 'Das bearbeitete Bild konnte nicht extrahiert werden.' : 'Could not extract edited image.');

    } catch (error) {
        console.error(`Error editing image for prompt "${prompt}":`, error);
        if (error instanceof Error && (error.message.includes("API-Ratenlimit") || error.message.includes("rate limit"))) {
            throw error;
        }
        const message = locale === 'de' ? `Bildbearbeitung fehlgeschlagen.` : `Image editing failed.`;
        throw new Error(message);
    }
};