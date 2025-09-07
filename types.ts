import type { Chat } from '@google/genai';

export type Locale = 'en' | 'de';

export type ArticleLength = 'concise' | 'standard' | 'in-depth';
export type ImageStyle = 'photorealistic' | 'artistic' | 'vintage' | 'minimalist';
export type AccentColor = 'amber' | 'sky' | 'rose' | 'emerald';
export type FontFamily = 'artistic' | 'modern';
export type TextSize = 'sm' | 'base' | 'lg';
export type SummaryType = 'tldr' | 'eli5' | 'keyPoints' | 'analogy';

export interface AppSettings {
  language: Locale;
  articleLength: ArticleLength;
  imageStyle: ImageStyle;
  autoLoadImages: boolean;
  synapseDensity: number;
  accentColor: AccentColor;
  fontFamily: FontFamily;
  textSize: TextSize;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
}

export interface ArticleSection {
  heading: string;
  content: string;
  imagePrompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
}

export interface ArticleData {
  title: string;
  introduction: string;
  sections: ArticleSection[];
  conclusion: string;
  timeline: TimelineEvent[];
}

export interface RelatedTopic {
  name: string;
  relevance: string;
  quickSummary: string;
}

export interface ChatMessagePart {
  text: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatMessagePart[];
}

export interface StarterTopic {
    title: string;
    description: string;
}

export interface HistoryItem {
    // FIX: Make id optional for auto-incrementing database entries.
    id?: number;
    name: string; 
    timestamp: number;
}

export interface Bookmark {
    // FIX: Make id optional for auto-incrementing database entries.
    id?: number;
    name: string; 
    timestamp: number;
}

export interface LearningPath {
    // FIX: Make id optional for auto-incrementing database entries.
    id?: number;
    name: string;
    articles: string[]; 
    timestamp: number;
}

export interface SessionSnapshot {
    // FIX: Make id optional for auto-incrementing database entries.
    id?: number;
    name: string;
    timestamp: number;
    data: {
        currentTopic: string;
        article: ArticleData | null;
        relatedTopics: RelatedTopic[];
        messages: ChatMessage[];
    };
}

export interface StoredImage {
  // FIX: Make id optional for auto-incrementing database entries.
  id?: number;
  prompt: string;
  imageData: string; 
  timestamp: number;
}

export interface LocalizationContextType {
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  t: (key: string, params?: { [key: string]: string | number | undefined; }) => any;
}

export interface UserDataContextType {
    history: HistoryItem[];
    bookmarks: Bookmark[];
    learningPaths: LearningPath[];
    snapshots: SessionSnapshot[];
    isBookmarked: boolean;
    
    addHistory: (topic: string) => Promise<void>;
    deleteHistoryItem: (id: number) => Promise<void>;
    clearHistory: () => Promise<void>;
    
    toggleBookmark: (topic: string) => Promise<void>;
    checkIfBookmarked: (topic: string) => Promise<void>;
    clearBookmarks: () => Promise<void>;
    
    createLearningPath: (name: string) => Promise<void>;
    deleteLearningPath: (id: number, name: string) => Promise<void>;
    addArticleToPath: (pathId: number, pathName: string, articleTopic: string) => Promise<void>;
    removeArticleFromPath: (pathId: number, pathName: string, articleTopic: string) => Promise<void>;
    clearLearningPaths: () => Promise<void>;
    
    saveSnapshot: (name: string, data: SessionSnapshot['data']) => Promise<void>;
    getSnapshot: (id: number) => Promise<SessionSnapshot | undefined>;
    deleteSnapshot: (id: number, name: string) => Promise<void>;
    clearSnapshots: () => Promise<void>;

    refreshAll: () => Promise<void>;
}
