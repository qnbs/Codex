import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CloseIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';

interface HelpGuideProps {
    isVisible: boolean;
    onClose: () => void;
}

const TutorialStep = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="p-4 bg-gray-800/50 rounded-lg not-prose">
        <h4 className="font-bold text-md text-gray-100">{title}</h4>
        <div className="text-gray-400 text-sm mt-2 space-y-2">{children}</div>
    </div>
);

const TutorialContent = () => {
    const { t } = useLocalization();
    const tutorial = t('help.tutorialContent');

    return (
        <div className="space-y-4">
            <p className="text-gray-300 text-sm">{tutorial.intro}</p>
            
            {tutorial.sections.map((section: any, index: number) => (
                <TutorialStep key={index} title={section.title}>
                    <p>{section.p1}</p>
                    <ul className="list-disc pl-5 space-y-1">
                        {section.list.map((item: any, itemIndex: number) => (
                             <li key={itemIndex}>
                                <strong>{item.label}:</strong> {item.text1} {item.highlight && <span className="font-semibold text-gray-200">{item.highlight}</span>} {item.text2}
                            </li>
                        ))}
                    </ul>
                </TutorialStep>
            ))}
        </div>
    );
};


const GlossaryContent = () => {
    const { t } = useLocalization();
    const glossary = t('help.glossaryContent');

    return (
        <div className="prose prose-invert prose-sm max-w-none">
            <p className="lead">{glossary.intro}</p>
            {glossary.sections.map((section: any) => (
                <div key={section.title}>
                    <h3 className="mt-4">{section.title}</h3>
                    <dl>
                        {section.terms.map((term: any) => (
                            <React.Fragment key={term.name}>
                                <dt className="font-bold text-accent">{term.name}</dt>
                                <dd className="mb-3 pl-4 text-gray-400">{term.description}</dd>
                            </React.Fragment>
                        ))}
                    </dl>
                </div>
            ))}
        </div>
    );
};


const HelpGuide: React.FC<HelpGuideProps> = ({ isVisible, onClose }) => {
    const { t } = useLocalization();
    const [activeTab, setActiveTab] = useState('tutorial');
    const panelRef = useRef<HTMLDivElement>(null);
    const memoizedOnClose = useCallback(onClose, [onClose]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') memoizedOnClose();
        };
        if (isVisible) {
            document.addEventListener('keydown', handleKeyDown);
            panelRef.current?.focus();
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, memoizedOnClose]);
    
    return (
        <div 
            className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-900/80 backdrop-blur-sm shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
            role="dialog" aria-modal="true" aria-labelledby="help-title" ref={panelRef} tabIndex={-1}
        >
            <div className="flex flex-col h-full border-l border-gray-700">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 id="help-title" className="text-xl font-bold text-white">{t('help.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label={t('help.close')}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="border-b border-gray-700">
                    <nav className="flex space-x-1 p-2" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('tutorial')}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'tutorial' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                            aria-current={activeTab === 'tutorial' ? 'page' : undefined}
                        >
                            {t('help.tab.tutorial')}
                        </button>
                        <button
                             onClick={() => setActiveTab('glossary')}
                             className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'glossary' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                             aria-current={activeTab === 'glossary' ? 'page' : undefined}
                        >
                            {t('help.tab.glossary')}
                        </button>
                    </nav>
                </div>
                
                <div className="p-6 overflow-y-auto flex-grow">
                    {activeTab === 'tutorial' ? <TutorialContent /> : <GlossaryContent />}
                </div>
            </div>
        </div>
    );
};

export default HelpGuide;