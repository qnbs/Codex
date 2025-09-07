import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CloseIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';

interface HelpGuideProps {
    isVisible: boolean;
    onClose: () => void;
}

const TutorialContent = () => {
    const { t } = useLocalization();
    const tutorial = t('help.tutorialContent');

    const renderListItem = (item: { label: string; text: string; p2?: string; }, key: string) => (
        <li key={key} className="mb-2">
            <p><strong>{item.label}</strong> {item.text}</p>
            {item.p2 && <p className="mt-1 pl-4">{item.p2}</p>}
        </li>
    );

    return (
        <div className="prose prose-invert prose-sm max-w-none">
            <p className="lead">{tutorial.intro}</p>
            
            {/* Section 1 */}
            <h3>{tutorial.section1.title}</h3>
            <p>{tutorial.section1.p1}</p>
            <ul>
                {renderListItem(tutorial.section1.li1, 's1li1')}
                {renderListItem(tutorial.section1.li2, 's1li2')}
                {renderListItem(tutorial.section1.li3, 's1li3')}
            </ul>
            
            {/* Section 2 */}
            <h3>{tutorial.section2.title}</h3>
            <p>{tutorial.section2.p1}</p>
            <ul>
                <li key="s2li1" className="mb-2"><p><strong>{tutorial.section2.li1.label}</strong> {tutorial.section2.li1.text} <strong>Define</strong>, <strong>Explain</strong>, {t('help.tutorialContent.and')} <strong>Visualize</strong>. {tutorial.section2.li1.p2}</p></li>
                {renderListItem(tutorial.section2.li2, 's2li2')}
                {renderListItem(tutorial.section2.li3, 's2li3')}
                {renderListItem(tutorial.section2.li4, 's2li4')}
            </ul>

            {/* Section 3 */}
            <h3>{tutorial.section3.title}</h3>
            <p>{tutorial.section3.p1}</p>
            <ul>
                {renderListItem(tutorial.section3.li1, 's3li1')}
                {renderListItem(tutorial.section3.li2, 's3li2')}
            </ul>

            {/* Section 4 */}
            <h3>{tutorial.section4.title}</h3>
            <p>{tutorial.section4.p1}</p>
            <ul>
                {renderListItem(tutorial.section4.li1, 's4li1')}
                {renderListItem(tutorial.section4.li2, 's4li2')}
                {renderListItem(tutorial.section4.li3, 's4li3')}
            </ul>

            {/* Section 5 */}
            <h3>{tutorial.section5.title}</h3>
            <p>{tutorial.section5.p1}</p>
            <ul>
                {renderListItem(tutorial.section5.li1, 's5li1')}
                {renderListItem(tutorial.section5.li2, 's5li2')}
                {renderListItem(tutorial.section5.li3, 's5li3')}
                {renderListItem(tutorial.section5.li4, 's5li4')}
            </ul>
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

const AboutContent = () => {
    const { t } = useLocalization();
    const about = t('help.aboutContent');
    const aiStudioLink = "https://ai.studio/apps/drive/1e5Yc-ommOORZdnzXxOBpCWtjJw5dIypi";
    const githubLink = "https://github.com/qnbs/Codex";

    return (
        <div className="prose prose-invert prose-sm max-w-none">
            <p className="lead">{about.intro}</p>

            <h3 className="mt-6">{about.aiStudio.title}</h3>
            <p>{about.aiStudio.description}</p>
            <a href={aiStudioLink} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                {about.aiStudio.link} &rarr;
            </a>

            <h3 className="mt-6">{about.github.title}</h3>
            <p>{about.github.description}</p>
            <a href={githubLink} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                {about.github.link} &rarr;
            </a>
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
                        <button
                             onClick={() => setActiveTab('about')}
                             className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'about' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                             aria-current={activeTab === 'about' ? 'page' : undefined}
                        >
                            {t('help.tab.about')}
                        </button>
                    </nav>
                </div>
                
                <div className="p-6 overflow-y-auto flex-grow">
                    {activeTab === 'tutorial' && <TutorialContent />}
                    {activeTab === 'glossary' && <GlossaryContent />}
                    {activeTab === 'about' && <AboutContent />}
                </div>
            </div>
        </div>
    );
};

export default HelpGuide;