import React, { useContext, useRef } from 'react';
import { SettingsContext } from '../context/AppContext';
import { AppSettings, AccentColor, FontFamily, TextSize, Locale, ArticleLength, ImageStyle } from '../types';
import { CloseIcon, TrashIcon, UploadIcon, DownloadIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';
import { useUserData } from '../context/UserDataContext';
import { useNotification } from '../context/NotificationContext';
import { exportAllData, importAllData } from '../services/db';
import * as db from '../services/db';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-lg font-semibold text-accent mb-3 border-b border-gray-700 pb-2">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

type SelectOption<T> = { value: T; label: string };

const SettingSelect = <T extends string>({ label, description, options, value, onChange }: { label: string, description: string, options: SelectOption<T>[], value: T, onChange: (value: T) => void }) => (
    <div>
        <label className="block text-sm font-medium text-gray-200">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value as T)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border-gray-600 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md">
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
);

const SettingToggle = ({ label, description, checked, onChange }: { label: string, description: string, checked: boolean, onChange: (checked: boolean) => void }) => (
     <div className="flex items-center justify-between">
        <div>
            <label className="block text-sm font-medium text-gray-200">{label}</label>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
        <button onClick={() => onChange(!checked)} type="button" className={`${checked ? 'bg-accent' : 'bg-gray-600'} relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:ring-offset-gray-900`} role="switch" aria-checked={checked}>
            <span aria-hidden="true" className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}></span>
        </button>
    </div>
);

const SettingSlider = ({ label, description, value, min, max, step, onChange }: { label: string, description: string, value: number, min: number, max: number, step: number, onChange: (value: number) => void }) => (
    <div>
        <label className="block text-sm font-medium text-gray-200">{label} <span className="text-accent font-bold">{value}</span></label>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-accent" />
        <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
);

const DataButton: React.FC<{ onClick: () => void, text: string, icon: React.FC<{className?: string}>, variant?: 'danger' | 'default'}> = ({ onClick, text, icon: Icon, variant = 'default'}) => {
    const baseClasses = "w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors";
    const variantClasses = {
        danger: "bg-red-600/10 text-red-300 border-red-500/20 hover:bg-red-600/20",
        default: "bg-gray-700/50 text-gray-200 border-gray-600/80 hover:bg-gray-700",
    };
    return <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]}`}><Icon className="w-4 h-4" /> {text}</button>
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, setSettings } = useContext(SettingsContext)!;
    const { clearHistory, clearBookmarks, clearLearningPaths, clearSnapshots, refreshAll } = useUserData();
    const { addNotification } = useNotification();
    const { t } = useLocalization();
    const importRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleClearImages = async () => {
        if(window.confirm(t('prompts.confirmClearAll', { name: t('imageLibrary.title') }))) {
            await db.clearImages();
            addNotification(t('notifications.clearedAll', { name: t('imageLibrary.title') }), 'info');
        }
    }
    
    const handleExport = async () => {
        try {
            const data = await exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `codex_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            addNotification(t('notifications.exportSuccess'), 'success');
        } catch (error) {
            console.error(error);
            addNotification(error instanceof Error ? error.message : t('errors.exportFailed'), 'error');
        }
    };

    const handleImportClick = () => {
        importRef.current?.click();
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error(t('errors.fileRead'));
                const data = JSON.parse(text);
                await importAllData(data);
                setSettings(data.settings); // Directly apply imported settings
                await refreshAll();
                addNotification(t('notifications.importSuccess'), 'success');
                onClose();
            } catch (error) {
                console.error(error);
                const message = error instanceof Error ? error.message : t('errors.importFailed');
                addNotification(message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };

    const appearance = t('settings.appearance');
    const content = t('settings.content');
    const data = t('settings.data');
    
    const accentColorOptions: SelectOption<AccentColor>[] = Object.keys(appearance.accentColor.options).map(key => ({ value: key as AccentColor, label: appearance.accentColor.options[key] }));
    const fontOptions: SelectOption<FontFamily>[] = Object.keys(appearance.font.options).map(key => ({ value: key as FontFamily, label: appearance.font.options[key] }));
    const textSizeOptions: SelectOption<TextSize>[] = Object.keys(appearance.textSize.options).map(key => ({ value: key as TextSize, label: appearance.textSize.options[key] }));
    const languageOptions: SelectOption<Locale>[] = Object.keys(content.language.options).map(key => ({ value: key as Locale, label: content.language.options[key] }));
    const articleLengthOptions: SelectOption<ArticleLength>[] = Object.keys(content.articleLength.options).map(key => ({ value: key as ArticleLength, label: content.articleLength.options[key] }));
    const imageStyleOptions: SelectOption<ImageStyle>[] = Object.keys(content.imageStyle.options).map(key => ({ value: key as ImageStyle, label: content.imageStyle.options[key] }));

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">{t('settings.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label={t('settings.close')}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="p-6 overflow-y-auto">
                    <SettingsSection title={appearance.title}>
                         <SettingSelect label={appearance.accentColor.label} description={appearance.accentColor.description} options={accentColorOptions} value={settings.accentColor} onChange={v => handleChange('accentColor', v)} />
                         <SettingSelect label={appearance.font.label} description={appearance.font.description} options={fontOptions} value={settings.fontFamily} onChange={v => handleChange('fontFamily', v)} />
                         <SettingSelect label={appearance.textSize.label} description={appearance.textSize.description} options={textSizeOptions} value={settings.textSize} onChange={v => handleChange('textSize', v)} />
                    </SettingsSection>
                    <SettingsSection title={content.title}>
                         <SettingSelect label={content.language.label} description={content.language.description} options={languageOptions} value={settings.language} onChange={v => handleChange('language', v)} />
                         <SettingSelect label={content.articleLength.label} description={content.articleLength.description} options={articleLengthOptions} value={settings.articleLength} onChange={v => handleChange('articleLength', v)} />
                         <SettingSelect label={content.imageStyle.label} description={content.imageStyle.description} options={imageStyleOptions} value={settings.imageStyle} onChange={v => handleChange('imageStyle', v)} />
                         <SettingToggle label={content.autoLoad.label} description={content.autoLoad.description} checked={settings.autoLoadImages} onChange={v => handleChange('autoLoadImages', v)} />
                         <SettingSlider label={content.synapseDensity.label} description={content.synapseDensity.description} value={settings.synapseDensity} min={3} max={8} step={1} onChange={v => handleChange('synapseDensity', v)} />
                    </SettingsSection>
                    <SettingsSection title={data.title}>
                        <div className="grid grid-cols-2 gap-2">
                             <DataButton onClick={handleExport} text={data.export} icon={DownloadIcon} />
                             <DataButton onClick={handleImportClick} text={data.import} icon={UploadIcon} />
                             <input type="file" ref={importRef} accept=".json" onChange={handleFileImport} className="hidden" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <DataButton onClick={clearHistory} text={data.clearHistory} icon={TrashIcon} variant="danger" />
                            <DataButton onClick={clearBookmarks} text={data.clearBookmarks} icon={TrashIcon} variant="danger" />
                            <DataButton onClick={clearLearningPaths} text={data.clearPaths} icon={TrashIcon} variant="danger" />
                            <DataButton onClick={clearSnapshots} text={data.clearSnapshots} icon={TrashIcon} variant="danger" />
                            <DataButton onClick={handleClearImages} text={data.clearImages} icon={TrashIcon} variant="danger" />
                        </div>
                    </SettingsSection>
                </main>
            </div>
        </div>
    );
};

export default SettingsModal;