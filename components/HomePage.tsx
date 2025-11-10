
import React, { useRef } from 'react';
import Icon from './common/Icon';
import Tooltip from './common/Tooltip';

interface HomePageProps {
  onNewWorld: () => void;
  onResumeWorld: () => void;
  onImport: (projectData: any) => void;
  hasExistingProject: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ onNewWorld, onResumeWorld, onImport, hasExistingProject }) => {
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    const data = JSON.parse(text);
                    onImport(data);
                }
            } catch (error) {
                console.error("Error reading or parsing project file:", error);
                alert("Could not import the file. It might be corrupted or not a valid project file.");
            }
        };
        reader.onerror = () => {
             alert("Error reading the file.");
        };
        reader.readAsText(file);
    };

    return (
        <div className="min-h-screen bg-brand-dark font-sans flex items-center justify-center p-4">
            <div className="w-full max-w-md text-center bg-brand-dark-accent/50 border border-brand-purple/20 rounded-2xl p-8 shadow-2xl backdrop-blur-sm animate-fade-in">
                <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-brand-pink to-brand-purple rounded-full flex items-center justify-center">
                    <Icon name="sparkles" className="w-10 h-10 text-white"/>
                </div>
                <h1 className="text-4xl font-bold text-white tracking-wider">Visual Co-Pilot</h1>
                <p className="text-gray-400 mt-2">Your AI Partner in World Building</p>

                <div className="space-y-4 mt-10">
                    <Tooltip text="Start from scratch with a blank canvas." className="w-full">
                        <button
                            onClick={onNewWorld}
                            className="w-full flex items-center justify-center gap-3 bg-brand-pink hover:bg-brand-pink/80 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 text-lg"
                        >
                            <Icon name="sparkles" className="w-6 h-6" />
                            Start a New World
                        </button>
                    </Tooltip>
                     <Tooltip text={hasExistingProject ? "Continue your previously saved project." : "No saved project found in this browser."} className="w-full">
                        <button
                            onClick={onResumeWorld}
                            disabled={!hasExistingProject}
                            className="w-full flex items-center justify-center gap-3 bg-brand-teal hover:bg-brand-teal/80 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 text-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            <Icon name="book" className="w-6 h-6" />
                            Resume Project
                        </button>
                    </Tooltip>
                     <Tooltip text="Import a project from a .json file." className="w-full">
                        <button
                            onClick={handleImportClick}
                            className="w-full flex items-center justify-center gap-3 bg-brand-purple hover:bg-brand-purple/80 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 text-lg"
                        >
                            <Icon name="download" className="w-6 h-6 -rotate-90" />
                            Import World
                        </button>
                    </Tooltip>
                    <input
                        type="file"
                        accept=".json"
                        ref={importInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>
            </div>
        </div>
    );
};

export default HomePage;
