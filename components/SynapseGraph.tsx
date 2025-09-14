import React from 'react';
import { RelatedTopic } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import { CosmicLeapIcon } from './IconComponents';

interface SynapseGraphProps {
    relatedTopics: RelatedTopic[];
    currentTopic: string;
    onTopicSelect: (topic: string) => void;
    onSerendipity: () => void;
}

const SynapseGraph: React.FC<SynapseGraphProps> = ({ relatedTopics, currentTopic, onTopicSelect, onSerendipity }) => {
    const { t } = useLocalization();

    return (
        <div className="py-12 bg-gray-900/50">
            <div className="text-center max-w-3xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-white">{t('synapse.title')}</h2>
                <p className="mt-2 text-gray-400">{t('synapse.description')}</p>
            </div>

            <div className="mt-10 max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 px-4">
                {/* Related Topics Section */}
                <div className="flex-1 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {relatedTopics.map((topic) => (
                            <button
                                key={topic.name}
                                onClick={() => onTopicSelect(topic.name)}
                                className="group p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg text-left hover:bg-gray-800 hover:border-accent/50 transition-all duration-300 transform hover:-translate-y-1"
                            >
                                <h3 className="font-bold text-gray-200 group-hover:text-accent transition-colors">{topic.name}</h3>
                                <p className="text-xs text-gray-500 mt-2">
                                    <span className="font-semibold">{t('synapse.relevance')}</span> {topic.relevance}
                                </p>
                                <p className="text-sm text-gray-400 mt-2">{topic.quickSummary}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Separator and Cosmic Leap */}
                <div className="flex md:flex-col items-center gap-4 my-6 md:my-0">
                    <div className="w-16 h-px md:w-px md:h-16 bg-gray-700"></div>
                     <span className="text-sm text-gray-500 font-mono">OR</span>
                    <div className="w-16 h-px md:w-px md:h-16 bg-gray-700"></div>
                </div>
                
                <div className="flex-shrink-0">
                     <button
                        onClick={onSerendipity}
                        className="group flex flex-col items-center justify-center w-48 h-48 bg-gray-800/50 border-2 border-dashed border-gray-700/50 rounded-full text-center hover:border-accent/80 hover:bg-gray-800 transition-all duration-300 transform hover:scale-105"
                    >
                        <CosmicLeapIcon className="w-12 h-12 text-gray-500 group-hover:text-accent transition-colors mb-2" />
                        <h3 className="font-bold text-lg text-gray-300 group-hover:text-accent transition-colors">{t('synapse.cosmicLeap')}</h3>
                        <p className="text-xs text-gray-500">{t('searchbar.cosmicLeap.title')}</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SynapseGraph;
