import React, { useState, useEffect } from 'react';
import { editImage } from '../services/geminiService';
import type { Scene } from '../types';
import Modal from './common/Modal';
import Spinner from './common/Spinner';
import Icon from './common/Icon';
import Tooltip from './common/Tooltip';

interface ImageEditorModalProps {
  scene: Scene | null;
  onClose: () => void;
  onSave: (sceneId: string, newImageBase64: string) => void;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ scene, onClose, onSave }) => {
    const [editPrompt, setEditPrompt] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (scene) {
            setHistory([scene.image]);
            setHistoryIndex(0);
            setEditPrompt('');
            setError(null);
            setIsLoading(false);
        }
    }, [scene]);

    const handleApplyEdit = async () => {
        if (!scene || !editPrompt) return;
        setIsLoading(true);
        setError(null);
        try {
            const currentImageForEdit = history[historyIndex];
            const newImageBase64 = await editImage(currentImageForEdit, 'image/jpeg', editPrompt);
            
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(newImageBase64);
            
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        } catch (err) {
            setError('Failed to edit image. Please try a different prompt.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUndo = () => {
        setHistoryIndex(prevIndex => Math.max(0, prevIndex - 1));
    };

    const handleRedo = () => {
        setHistoryIndex(prevIndex => Math.min(history.length - 1, prevIndex + 1));
    };

    const handleSave = () => {
        if (scene && historyIndex > 0) {
            onSave(scene.id, history[historyIndex]);
        }
    };

    if (!scene) return null;
    
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const hasChanges = historyIndex > 0;

    return (
        <Modal isOpen={!!scene} onClose={onClose} title="Edit Scene with AI">
            <div className="space-y-4">
                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm" role="alert">
                        <p>{error}</p>
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">Original</label>
                        <img src={`data:image/jpeg;base64,${history[0]}`} alt="Original scene" className="w-full rounded-lg" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold">Edited</label>
                            <div className="flex items-center gap-2">
                                <Tooltip text="Undo last edit">
                                    <button onClick={handleUndo} disabled={!canUndo || isLoading} className="disabled:opacity-30 text-gray-300 hover:text-white transition-opacity">
                                        <Icon name="undo" className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                                <Tooltip text="Redo last edit">
                                    <button onClick={handleRedo} disabled={!canRedo || isLoading} className="disabled:opacity-30 text-gray-300 hover:text-white transition-opacity">
                                        <Icon name="redo" className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                        <div className="aspect-video bg-brand-dark/50 rounded-lg flex items-center justify-center border-2 border-dashed border-brand-purple/50 overflow-hidden">
                             {isLoading && <div className="text-center"><Spinner className="w-10 h-10 mx-auto" /><p className="mt-2 text-gray-400 text-sm">Applying edit...</p></div>}
                             {!isLoading && hasChanges && (
                                <img src={`data:image/jpeg;base64,${history[historyIndex]}`} alt="Edited scene" className="w-full h-full object-cover animate-fade-in" />
                             )}
                             {!isLoading && !hasChanges && (
                                <p className="text-gray-500 text-sm">Your edit will appear here</p>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <Tooltip text="Describe the change you want to make (e.g., 'add a cat on the table', 'make it night time').">
                        <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="e.g., Add a retro filter, remove the person..."
                            className="w-full p-3 bg-brand-dark border border-brand-purple/50 rounded-lg focus:ring-2 focus:ring-brand-pink focus:outline-none transition-all"
                            rows={2}
                            disabled={isLoading}
                        />
                    </Tooltip>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Tooltip text="Apply the edit to the image" className="w-full">
                        <button
                            onClick={handleApplyEdit}
                            className="w-full flex items-center justify-center gap-2 bg-brand-purple hover:bg-brand-purple/80 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                            disabled={isLoading || !editPrompt}
                        >
                            {isLoading ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
                            Apply Edit
                        </button>
                    </Tooltip>
                    <Tooltip text="Save the edited image to your scene gallery" className="w-full">
                        <button
                            onClick={handleSave}
                            className="w-full flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal/80 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                            disabled={isLoading || !hasChanges}
                        >
                            Save Changes
                        </button>
                    </Tooltip>
                </div>
            </div>
        </Modal>
    );
};

export default ImageEditorModal;
