import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    CloseIcon, BookOpenIcon, SearchIcon, SparklesIcon, CosmicLeapIcon, TextSelectIcon, 
    WandIcon, ImageIcon, SummarizeIcon, TimelineIcon, LightbulbIcon, HistoryIcon, 
    BookmarkIcon, PathIcon, CameraIcon, CogIcon 
} from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';

const TutorialSection = ({ title, icon: Icon, children }: { title: string, icon: React.FC<{className?: string}>, children: React.ReactNode }) => (
    <details className="p-4 bg-gray-800/50 rounded-lg group" open>
        <summary className="font-bold text-lg cursor-pointer flex items-center gap-3 text-gray-200 group-hover:text-accent transition-colors">
            <Icon className="w-6 h-6 text-accent flex-shrink-0" />
            {title}
        </summary>
        <div className="mt-4 pl-9 prose prose-invert prose-sm text-gray-400 max-w-none">
            {children}
        </div>
    </details>
);

const GlossaryTerm = ({ name, children }: { name: string, children: React.ReactNode }) => (
    <div className="py-4 border-b border-gray-700/50">
        <h4 className="font-bold text-accent text-md">{name}</h4>
        <p className="text-gray-400 text-sm mt-1">{children}</p>
    </div>
);


const TutorialContent = () => {
    const { t } = useLocalization();
    const tutorialData = t('help.tutorialContent');

    return (
        <div className="space-y-4">
            <p className="text-gray-400 mb-6">{tutorialData.intro}</p>
            
            <TutorialSection title={tutorialData.section1.title} icon={SparklesIcon}>
                <p>{tutorialData.section1.p1}</p>
                <ul className="list-disc pl-5">
                    <li><strong>{tutorialData.section1.li1.label} <SearchIcon className="w-4 h-4 inline-block" />:</strong> {tutorialData.section1.li1.text}</li>
                    <li><strong>{tutorialData.section1.li2.label} <SparklesIcon className="w-4 h-4 inline-block" />:</strong> {tutorialData.section1.li2.text}</li>
                    <li><strong>{tutorialData.section1.li3.label} <CosmicLeapIcon className="w-4 h-4 inline-block" />:</strong> {tutorialData.section1.li3.text}</li>
                </ul>
            </TutorialSection>

            <TutorialSection title={tutorialData.section2.title} icon={BookOpenIcon}>
                 <p>{tutorialData.section2.p1}</p>
                <ul className="list-disc pl-5">
                    <li><strong>{tutorialData.section2.li1.label} <TextSelectIcon className="w-4 h-4 inline-block" />:</strong> {tutorialData.section2.li1.text} <code className="text-xs">{t('interaction.define')}</code>, <code className="text-xs">{t('interaction.explain')}</code> <WandIcon className="w-3 h-3 inline-block" />, {tutorialData.and} <code className="text-xs">{t('interaction.visualize')}</code> <ImageIcon className="w-3 h-3 inline-block" />. {tutorialData.section2.li1.p2}</li>
                    <li><strong>{tutorialData.section2.li2.label} <ImageIcon className="w-4 h-4 inline-block" />:</strong> {tutorialData.section2.li2.text}</li>
                    <li><strong>{tutorialData.section2.li3.label} <SummarizeIcon className="w-4 h-4 inline-block" />:</strong> {tutorialData.section2.li3.text}</li>
                    <li><strong>{tutorialData.section2.li4.label} <TimelineIcon className="w-4 h-4 inline-block" />:</strong> {tutorialData.section2.li4.text}</li>
                </ul>
            </TutorialSection>

            <TutorialSection title={tutorialData.section3.title} icon={LightbulbIcon}>
                <p>{tutorialData.section3.p1}</p>
                 <ul className="list-disc pl-5">
                    <li><strong>{tutorialData.section3.li1.label}</strong> {tutorialData.section3.li1.text}</li>
                    <li><strong>{tutorialData.section3.li2.label}</strong> {tutorialData.section3.li2.text}</li>
                </ul>
            </TutorialSection>
            
            <TutorialSection title={tutorialData.section4.title} icon={CosmicLeapIcon}>
                <p>{tutorialData.section4.p1}</p>
                 <ul className="list-disc pl-5">
                    <li><strong>{tutorialData.section4.li1.label}</strong> {tutorialData.section4.li1.text}</li>
                    <li><strong>{tutorialData.section4.li2.label}</strong> {tutorialData.section4.li2.text}</li>
                    <li><strong>{tutorialData.section4.li3.label}</strong> {tutorialData.section4.li3.text}</li>
                </ul>
            </TutorialSection>

            <TutorialSection title={tutorialData.section5.title} icon={CogIcon}>
                 <p>{tutorialData.section5.p1}</p>
                <ul className="list-disc pl-5">
                    <li><strong>{tutorialData.section5.li1.label} <HistoryIcon className="w-4 h-4 inline-block" />:</strong> {tutorialData.section5.li1.text}</li>
                    <li><strong>{tutorialData.section5.li2.label} <BookmarkIcon className="w-4 h-4 inline-block" />:</strong> {tutorialData.section5.li2.text}</li>
                    <li><strong>{tutorialData.section5.li3.label} <PathIcon className="w-4 h-4 inline-block" />:</strong> {tutorialData.section5.li3.text}</li>
                    <li><strong>{tutorialData.section5.li4.label} <CameraIcon className="w-4 h-4 inline-block" />:</strong> {tutorialData.section5.li4.text}</li>
                </ul>
            </TutorialSection>
        </div>
    );
};

const GlossaryContent = () => {
    const { t } = useLocalization();
    const glossaryData = t('help.glossaryContent');

    return (
        <div className="space-y-4">
            <p className="text-gray-400 mb-6">{glossaryData.intro}</p>
            {glossaryData.sections.map((section: any) => (
                <div key={section.title}>
                    <h3 className="text-xl font-bold text-gray-200 mt-6 mb-2">{section.title}</h3>
                    {section.terms.map((term: any) => (
                        <GlossaryTerm key={term.name} name={term.name}>{term.description}</GlossaryTerm>
                    ))}
                </div>
            ))}
        </div>
    );
};


export const HelpGuide = ({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) => {
    const { t } = useLocalization();
    const [activeTab, setActiveTab] = useState<'tutorial' | 'glossary'>('tutorial');
    const modalRef = useRef<HTMLDivElement>(null);
    const memoizedOnClose = useCallback(onClose, [onClose]);

    useEffect(() => {
        if (isVisible) {
            const modalNode = modalRef.current;
            if (!modalNode) return;

            const focusableElements = Array.from(modalNode.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ));
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    memoizedOnClose();
                }
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            lastElement?.focus();
                            e.preventDefault();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            firstElement?.focus();
                            e.preventDefault();
                        }
                    }
                }
            };

            firstElement?.focus();
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isVisible, memoizedOnClose]);
    
    return (
        <div className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-all duration-300 ${isVisible ? 'bg-opacity-80' : 'bg-opacity-0 pointer-events-none'}`} role="dialog" aria-modal="true" aria-labelledby="help-guide-title">
            <div ref={modalRef} tabIndex={-1} className={`bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 id="help-guide-title" className="text-2xl font-bold text-white">{t('help.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label={t('help.close')}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex border-b border-gray-700">
                    <button 
                        onClick={() => setActiveTab('tutorial')} 
                        role="tab"
                        aria-selected={activeTab === 'tutorial'}
                        className={`px-4 py-3 text-sm font-medium ${activeTab === 'tutorial' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:bg-gray-700/50'}`}
                    >
                        {t('help.tab.tutorial')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('glossary')} 
                        role="tab"
                        aria-selected={activeTab === 'glossary'}
                        className={`px-4 py-3 text-sm font-medium ${activeTab === 'glossary' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:bg-gray-700/50'}`}
                    >
                        {t('help.tab.glossary')}
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow" role="tabpanel">
                    {activeTab === 'tutorial' ? <TutorialContent /> : <GlossaryContent />}
                </div>
            </div>
        </div>
    );
};

export default HelpGuide;