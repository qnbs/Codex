import React from 'react';
import { SearchIcon, TextSelectIcon, LightbulbIcon, CosmicLeapIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';

interface EntryPortalProps {
    onStart: () => void;
}

const TutorialStep = ({ icon: Icon, title, children }: { icon: React.FC<{className?: string}>, title: string, children: React.ReactNode }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-lg">
        <div className="flex-shrink-0 w-10 h-10 bg-accent/20 text-accent rounded-full flex items-center justify-center mt-1">
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <h3 className="font-bold text-lg text-gray-100">{title}</h3>
            <p className="text-gray-400 text-sm">{children}</p>
        </div>
    </div>
);


const EntryPortal: React.FC<EntryPortalProps> = ({ onStart }) => {
    const { t, locale, setLocale } = useLocalization();
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-[100] flex justify-center items-start p-4 pt-12 transition-opacity duration-500">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-y-auto">
                <div className="p-8 md:p-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-accent mb-3">{t('entry.title')}</h1>
                    <p className="text-lg text-gray-300 max-w-3xl mx-auto">{t('entry.subtitle')}</p>
                </div>

                <div className="px-8 md:px-12 pb-8">
                    <h2 className="text-2xl font-bold text-center text-white mb-6">{t('entry.tutorial.title')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TutorialStep icon={SearchIcon} title={t('entry.tutorial.step1.title')}>
                            {t('entry.tutorial.step1.description')}
                        </TutorialStep>
                        <TutorialStep icon={TextSelectIcon} title={t('entry.tutorial.step2.title')}>
                             {t('entry.tutorial.step2.description')}
                        </TutorialStep>
                        <TutorialStep icon={LightbulbIcon} title={t('entry.tutorial.step3.title')}>
                            {t('entry.tutorial.step3.description')}
                        </TutorialStep>
                        <TutorialStep icon={CosmicLeapIcon} title={t('entry.tutorial.step4.title')}>
                            {t('entry.tutorial.step4.description')}
                        </TutorialStep>
                    </div>
                </div>

                <div className="p-8 text-center mt-auto">
                    <div className="mb-6">
                        <div className="flex justify-center items-center gap-4">
                            <button
                                onClick={() => setLocale('de')}
                                className={`px-6 py-2 border-2 rounded-full font-semibold transition-colors ${
                                    locale === 'de'
                                    ? 'border-accent bg-accent/20 text-accent'
                                    : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
                                }`}
                            >
                                Deutsch
                            </button>
                            <button
                                onClick={() => setLocale('en')}
                                className={`px-6 py-2 border-2 rounded-full font-semibold transition-colors ${
                                    locale === 'en'
                                    ? 'border-accent bg-accent/20 text-accent'
                                    : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
                                }`}
                            >
                                English
                            </button>
                        </div>
                    </div>
                     <div className="h-[60px] flex items-center justify-center">
                         <button 
                            onClick={onStart} 
                            className="px-8 py-3 bg-accent text-accent-contrast font-bold text-lg rounded-full hover:bg-accent-hover transition-transform transform hover:scale-105 active:scale-100 shadow-lg"
                        >
                            {t('entry.startExploring')}
                        </button>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default EntryPortal;