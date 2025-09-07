import React from 'react';
import { useUserData } from '../context/UserDataContext';
import { CloseIcon, TrashIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';
import { SessionSnapshot } from '../types';

interface SnapshotsPanelProps {
    onClose: () => void;
    onRestore: (snapshot: SessionSnapshot) => void;
}

const SnapshotsPanel: React.FC<SnapshotsPanelProps> = ({ onClose, onRestore }) => {
    const { t } = useLocalization();
    const { snapshots, getSnapshot, deleteSnapshot } = useUserData();
    
    const handleRestore = async (id: number) => {
        const snapshot = await getSnapshot(id);
        if (snapshot) {
            onRestore(snapshot);
        }
    };

    return (
         <div className="fixed top-0 left-0 h-full w-full max-w-sm bg-gray-900/80 backdrop-blur-sm shadow-2xl z-40">
            <div className="flex flex-col h-full border-r border-gray-700">
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">{t('panels.snapshots.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                </header>
                <main className="p-4 overflow-y-auto flex-grow">
                    {snapshots.length === 0 ? (
                        <p className="text-gray-500 text-center mt-8">{t('panels.noEntries')}</p>
                    ) : (
                        <ul className="space-y-2">
                           {snapshots.map(snap => (
                                <li key={snap.id} className="group flex items-center justify-between bg-gray-800/50 p-3 rounded-md hover:bg-gray-800 transition-colors">
                                    <div className="flex-grow">
                                        <button onClick={() => handleRestore(snap.id)} className="text-left text-gray-200 hover:text-accent font-semibold w-full text-base">
                                            {snap.name}
                                        </button>
                                        <p className="text-xs text-gray-500 mt-1">{new Date(snap.timestamp).toLocaleString()}</p>
                                        <p className="text-xs text-gray-400 mt-1 truncate">Topic: {snap.data.currentTopic}</p>
                                    </div>
                                    <button onClick={() => deleteSnapshot(snap.id, snap.name)} className="ml-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </li>
                           ))}
                        </ul>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SnapshotsPanel;