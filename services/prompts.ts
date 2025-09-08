import { AppSettings, ArticleLength, Locale, SummaryType, ImageStyle } from '../types';

const getArticleLengthPrompt = (locale: Locale, length: ArticleLength): string => {
    const map = {
        de: {
            [ArticleLength.Concise]: "Der Artikel sollte kompakt sein, ungefähr 300 Wörter.",
            [ArticleLength.Standard]: "Der Artikel sollte eine Standardlänge haben, ungefähr 600 Wörter.",
            [ArticleLength.InDepth]: "Der Artikel sollte ausführlich sein, über 900 Wörter.",
        },
        en: {
            [ArticleLength.Concise]: "The article should be concise, around 300 words.",
            [ArticleLength.Standard]: "The article should be standard length, around 600 words.",
            [ArticleLength.InDepth]: "The article should be in-depth, over 900 words.",
        }
    };
    return map[locale][length];
};

const getImageStylePrompt = (locale: Locale, style: ImageStyle): string => {
    const map = {
        de: {
            [ImageStyle.Photorealistic]: "Fotorealistisch",
            [ImageStyle.Artistic]: "Künstlerisch",
            [ImageStyle.Vintage]: "Vintage",
            [ImageStyle.Minimalist]: "Minimalistisch",
        },
        en: {
            [ImageStyle.Photorealistic]: "Photorealistic",
            [ImageStyle.Artistic]: "Artistic",
            [ImageStyle.Vintage]: "Vintage",
            [ImageStyle.Minimalist]: "Minimalist",
        }
    };
    return map[locale][style];
};

export const Prompts = {
    generateArticle: (locale: Locale, topic: string, settings: AppSettings): string => {
        const lengthText = getArticleLengthPrompt(locale, settings.articleLength);
        if (locale === 'de') {
            return `Erstelle einen umfassenden, enzyklopädischen Artikel auf Deutsch über "${topic}". Der Artikel sollte gut strukturiert, informativ und ansprechend sein, mit detaillierten Abschnitten. ${lengthText} Wenn das Thema historisch ist oder einen klaren chronologischen Verlauf hat (wie eine Biografie oder die Entwicklung einer Technologie), füge bitte eine Zeitleiste mit wichtigen Ereignissen hinzu.`;
        }
        return `Create a comprehensive, encyclopedic article in English about "${topic}". The article should be well-structured, informative, and engaging, with detailed sections. ${lengthText} If the topic is historical or has a clear chronological progression (like a biography or the development of a technology), please include a timeline of key events.`;
    },

    constructImage: (locale: Locale, prompt: string, settings: AppSettings): string => {
        const styleText = getImageStylePrompt(locale, settings.imageStyle);
        if (locale === 'de') {
            return `${prompt}, Stil ${styleText}, kinematographisch, dramatische Beleuchtung, hohe Detailgenauigkeit, 8k`;
        }
        return `${prompt}, ${styleText} style, cinematic, dramatic lighting, high detail, 8k`;
    },
    
    getRelatedTopics: (locale: Locale, topic: string, settings: AppSettings): string => {
        if (locale === 'de') {
            return `Basierend auf einem Artikel über "${topic}", generiere ${settings.synapseDensity} eng verwandte Themen auf Deutsch, die das Wissen eines Lesers erweitern würden. Gib für jedes Thema seine Relevanz und eine Zusammenfassung in einem Satz an.`;
        }
        return `Based on an article about "${topic}", generate ${settings.synapseDensity} closely related topics in English that would expand a reader's knowledge. For each topic, provide its relevance and a one-sentence summary.`;
    },

    getSerendipitousTopic: (locale: Locale, currentTopic: string): string => {
        if (locale === 'de') {
            return `Gib zum Thema "${currentTopic}" ein überraschendes, lose verwandtes "Kosmischer Sprung"-Thema auf Deutsch an. Es sollte eine unerwartete, aber faszinierende Verbindung sein. Gib nur den Themennamen zurück.`;
        }
        return `Given the topic "${currentTopic}", provide a surprising, loosely related "Cosmic Leap" topic in English. It should be an unexpected but fascinating connection. Return only the topic name.`;
    },

    generateSummary: (locale: Locale, type: SummaryType, articleText: string): string => {
        const prompts = {
            de: {
                [SummaryType.TLDR]: `Gib eine sehr kurze "Zusammenfassung" (TL;DR) des folgenden Artikels in ein oder zwei Sätzen.`,
                [SummaryType.ELI5]: `Erkläre die Kernideen des folgenden Artikels, als ob du sie einem 5-jährigen Kind erklären würdest. Verwende einfache Worte und Analogien.`,
                [SummaryType.KEY_POINTS]: `Liste die wichtigsten Punkte des folgenden Artikels als prägnante Aufzählung auf.`,
                [SummaryType.ANALOGY]: `Gib eine einfache, kluge Analogie oder Metapher an, um das Hauptkonzept des folgenden Artikels zu verstehen.`
            },
            en: {
                [SummaryType.TLDR]: `Provide a very brief "Too Long; Didn't Read" (TL;DR) summary of the following article in one or two sentences.`,
                [SummaryType.ELI5]: `Explain the core ideas of the following article as if you were explaining it to a 5-year-old. Use simple words and analogies.`,
                [SummaryType.KEY_POINTS]: `List the most important key points from the following article as concise bullet points.`,
                [SummaryType.ANALOGY]: `Provide a simple, clever analogy or metaphor to understand the main concept of the following article.`
            }
        };
        const articlePreamble = locale === 'de' ? 'Artikel' : 'Article';
        return `${prompts[locale][type]}\n\n${articlePreamble}:\n"""${articleText}"""`;
    },

    getSuggestedQuestions: (locale: Locale, articleText: string): string => {
        if (locale === 'de') {
            return `Basierend auf dem folgenden Artikeltext auf Deutsch, erstelle eine Liste von 3 aufschlussreichen und nachdenklichen Folgefragen, die ein neugieriger Benutzer haben könnte. Stelle keine Fragen, die direkt im Text beantwortet werden, sondern solche, die zum tieferen Nachdenken oder zur Erkundung verwandter Tangenten anregen.\n\nArtikel:\n"""${articleText}"""`;
        }
        return `Based on the following article text in English, generate a list of 3 insightful and thoughtful follow-up questions a curious user might have. Do not ask questions that are directly answered in the text, but rather ones that prompt deeper thinking or exploration of related tangents.\n\nArticle:\n"""${articleText}"""`;
    },
    
    visualizeText: (locale: Locale, text: string): string => {
        if (locale === 'de') {
            return `Ein kinoreifes Bild, das das Konzept von: ${text} visualisiert`;
        }
        return `A cinematic image visualizing the concept of: ${text}`;
    },

    defineText: (locale: Locale, text: string): string => {
        if (locale === 'de') {
            return `Gib eine knappe, wörterbuchartige Definition auf Deutsch für den Begriff: "${text}".`;
        }
        return `Provide a concise, dictionary-style definition in English for the term: "${text}".`;
    },
    
    explainText: (locale: Locale, text: string): string => {
        if (locale === 'de') {
            return `Erkläre das Konzept von "${text}" auf eine einfache und leicht verständliche Weise auf Deutsch, als ob du es einem neugierigen Oberstufenschüler erklären würdest.`;
        }
        return `Explain the concept of "${text}" in a simple and easy-to-understand way in English, as if explaining to a curious high school student.`;
    }
};