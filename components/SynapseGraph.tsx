
import React from 'react';
import { RelatedTopic } from '../types';
import { CosmicLeapIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';

interface SynapseGraphProps {
  currentTopic: string;
  relatedTopics: RelatedTopic[];
  onTopicClick: (topic: string) => void;
  onSerendipity: () => void;
  isLoading: boolean;
}

const SynapseGraph: React.FC<SynapseGraphProps> = ({ currentTopic, relatedTopics, onTopicClick, onSerendipity, isLoading }) => {
  const { t } = useLocalization();
  if (!currentTopic || relatedTopics.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 w-full">
      <div className="text-center mb-8 max-w-2xl mx-auto">
         <h2 className="text-3xl font-bold text-white">{t('synapse.title')}</h2>
         <p className="text-gray-400 mt-2">{t('synapse.description')}</p>
         <button 
            onClick={onSerendipity} 
            disabled={isLoading}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-accent-contrast bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:ring-offset-gray-900 disabled:bg-gray-500 transition-all transform active:scale-95"
        >
            <CosmicLeapIcon className="w-5 h-5"/>
             {t('synapse.cosmicLeap')}
         </button>
      </div>

      {/* Mobile Graphical List View */}
      <div className="md:hidden w-full max-w-lg mx-auto">
          <div className="relative border-l-2 border-gray-700 ml-4 pl-8 space-y-6">
              {relatedTopics.map((topic) => (
                  <div key={topic.name} className="relative">
                      <div className="absolute -left-[44px] top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-800 border-2 border-accent/50 rounded-full"></div>
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 transition-all hover:border-accent/50 active:scale-[0.99]">
                          <button 
                              onClick={() => onTopicClick(topic.name)}
                              className="w-full text-left font-semibold text-accent text-lg hover:underline focus:outline-none focus:underline"
                          >
                              {topic.name}
                          </button>
                          <p className="mt-1 text-gray-400 text-xs italic">"{topic.relevance}"</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>


      {/* Desktop Graph View */}
      <div className="hidden md:relative md:flex items-center justify-center p-8 min-h-[400px]">
          <div className="z-10 bg-accent text-accent-contrast rounded-full w-48 h-48 flex items-center justify-center text-center p-4 shadow-2xl shadow-amber-500/20">
              <span className="font-bold text-xl">{currentTopic}</span>
          </div>

          {relatedTopics.map((topic, index) => {
              const numTopics = relatedTopics.length;
              const radiusX = numTopics > 5 ? 360 : 320;
              const radiusY = numTopics > 5 ? 240 : 200;
              const angle = (index / numTopics) * 2 * Math.PI;
              const x = Math.cos(angle) * radiusX;
              const y = Math.sin(angle) * radiusY;

              const centralNodeRadius = 96; // 192px / 2
              const satelliteNodeRadius = 64; // 128px / 2
              const distance = Math.sqrt(x*x + y*y);
              const lineWidth = distance - centralNodeRadius - satelliteNodeRadius;
              const lineOffsetX = Math.cos(angle) * centralNodeRadius;
              const lineOffsetY = Math.sin(angle) * centralNodeRadius;
              
              return (
                  <React.Fragment key={topic.name}>
                    <div className="absolute top-1/2 left-1/2 h-px bg-gray-600 origin-left z-0" 
                        style={{ 
                            width: `${lineWidth}px`, 
                            transform: `translate(${lineOffsetX}px, ${lineOffsetY}px) rotate(${angle}rad)` 
                        }} 
                    />
                    <div 
                        className="absolute top-1/2 left-1/2 z-10 group animate-float" 
                        style={{ 
                            transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                            animationDelay: `${index * 0.4}s`
                        }}
                    >
                      <button 
                        onClick={() => onTopicClick(topic.name)}
                        className="bg-gray-800 border-2 border-gray-600 text-gray-200 rounded-full w-32 h-32 flex items-center justify-center text-center p-2 hover:border-accent focus:outline-none focus:border-accent transition-all duration-300 shadow-lg hover:animate-pulse focus:animate-pulse"
                      >
                          <span className="font-semibold text-sm">{topic.name}</span>
                      </button>
                      <div className="absolute bottom-full mb-2 w-72 p-3 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20 transform -translate-x-1/2 left-1/2">
                          <p className="font-bold text-accent mb-1">{t('synapse.relevance')}</p>
                          <p className="italic mb-2">"{topic.relevance}"</p>
                          <p className="font-bold text-accent mb-1">{t('synapse.summary')}</p>
                          <p>{topic.quickSummary}</p>
                      </div>
                    </div>
                  </React.Fragment>
              );
          })}
      </div>
    </div>
  );
};

export default React.memo(SynapseGraph);
