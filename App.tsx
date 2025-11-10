
import React, { useState, useEffect } from 'react';
import type { StyleSeed, Scene, Character, ScriptLine } from './types';
import HomePage from './components/HomePage';
import ScenesPage from './components/ScenesPage';
import CharactersPage from './components/CharactersPage';
import PlaygroundPage from './components/PlaygroundPage';
import ScriptBuilderPage from './components/ScriptBuilderPage';
import PostProductionPage from './components/PostProductionPage';
import VoiceAssistantWidget from './components/VoiceAssistantWidget';
import Icon from './components/common/Icon';
import ExportModal from './components/ExportModal';
import Tooltip from './components/common/Tooltip';
import Spinner from './components/common/Spinner';


type Page = 'scenes' | 'characters' | 'script' | 'post-production' | 'playground';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('scenes');
  const [styleSeed, setStyleSeed] = useState<StyleSeed | null>(null);
  const [styleSeedHistory, setStyleSeedHistory] = useState<StyleSeed[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [script, setScript] = useState<ScriptLine[]>([]);
  const [playgroundImages, setPlaygroundImages] = useState<string[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  const [isWorldLoaded, setIsWorldLoaded] = useState(false);
  const [hasExistingProject, setHasExistingProject] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');


  // Check for existing project and load it on initial render
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('visual-copilot-data');
      if (savedData) {
        setHasExistingProject(true);
        const { 
          styleSeed: savedStyleSeed, 
          scenes: savedScenes, 
          characters: savedCharacters,
          script: savedScript,
          styleSeedHistory: savedStyleSeedHistory,
        } = JSON.parse(savedData);
        if (savedStyleSeed) setStyleSeed(savedStyleSeed);
        if (savedScenes) setScenes(savedScenes);
        if (savedCharacters) setCharacters(savedCharacters);
        if (savedScript) setScript(savedScript);
        if (savedStyleSeedHistory) setStyleSeedHistory(savedStyleSeedHistory);
        // Backwards compatibility: if history doesn't exist, create it from the current seed
        else if (savedStyleSeed) setStyleSeedHistory([savedStyleSeed]);
      } else {
        setHasExistingProject(false);
      }
    } catch (error) {
      console.error('Failed to load project data from localStorage:', error);
      setHasExistingProject(false);
    }
  }, []);

  // Save state to localStorage whenever it changes, but only if the world is loaded
  useEffect(() => {
    if (!isWorldLoaded) return;
    setSaveState('saving');
    // Add a small delay so the user can see the "Saving..." state
    const timer = setTimeout(() => {
      try {
        const dataToSave = JSON.stringify({ styleSeed, scenes, characters, script, styleSeedHistory });
        localStorage.setItem('visual-copilot-data', dataToSave);
        setHasExistingProject(true); // Mark that a project now exists
        setSaveState('saved');
      } catch (error) {
        console.error('Failed to save project data to localStorage:', error);
        setSaveState('idle'); // Revert on error
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [styleSeed, scenes, characters, script, styleSeedHistory, isWorldLoaded]);

  // Effect to reset the 'saved' status indicator after a delay
  useEffect(() => {
    if (saveState === 'saved') {
      const timer = setTimeout(() => {
        setSaveState('idle');
      }, 2000); // Show "Saved" for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [saveState]);


  const handleNewWorld = () => {
    localStorage.removeItem('visual-copilot-data');
    setStyleSeed(null);
    setStyleSeedHistory([]);
    setScenes([]);
    setCharacters([]);
    setScript([]);
    setPlaygroundImages([]);
    setHasExistingProject(false);
    setIsWorldLoaded(true);
  };

  const handleResumeWorld = () => {
    setIsWorldLoaded(true);
  };
  
  const handleImportProject = (projectData: any) => {
    try {
        // Basic validation could go here
        setStyleSeed(projectData.styleSeed || null);
        setScenes(projectData.scenes || []);
        setCharacters(projectData.characters || []);
        setScript(projectData.script || []);
        setStyleSeedHistory(projectData.styleSeedHistory || (projectData.styleSeed ? [projectData.styleSeed] : []));
        
        // Save imported data to make it the current draft
        const dataToSave = JSON.stringify(projectData);
        localStorage.setItem('visual-copilot-data', dataToSave);
        
        setHasExistingProject(true);
        setIsWorldLoaded(true);
    } catch (error) {
        console.error("Failed to apply imported project data:", error);
        alert("There was an error importing the project file. It might be corrupted.");
    }
  };

  const NavButton: React.FC<{
    pageName: Page;
    label: string;
    icon: 'scene' | 'character' | 'clipboard-document-list' | 'film' | 'sparkles';
  }> = ({ pageName, label, icon }) => {
    const isActive = currentPage === pageName;
    return (
      <button
        onClick={() => setCurrentPage(pageName)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
          isActive
            ? 'bg-brand-pink text-white shadow-md'
            : 'text-gray-300 hover:bg-brand-dark-accent hover:text-white'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon name={icon} className="w-5 h-5" />
        {label}
      </button>
    );
  };

  const SaveStatusIndicator = () => {
    let content = null;
    switch (saveState) {
      case 'saving':
        content = (
          <>
            <Spinner className="w-4 h-4" />
            <span>Saving...</span>
          </>
        );
        break;
      case 'saved':
        content = (
          <>
            <Icon name="check" className="w-5 h-5" />
            <span>Saved</span>
          </>
        );
        break;
      default:
        // Render a placeholder to prevent layout shift
        return <div className="w-24 h-6" />;
    }
    return (
      <div className="flex items-center justify-start gap-2 text-sm text-gray-400 w-24 h-6 animate-fade-in">
        {content}
      </div>
    );
  };

  if (!isWorldLoaded) {
    return (
      <HomePage
        onNewWorld={handleNewWorld}
        onResumeWorld={handleResumeWorld}
        onImport={handleImportProject}
        hasExistingProject={hasExistingProject}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen bg-brand-dark font-sans">
        <header className="bg-brand-dark-accent/50 backdrop-blur-lg sticky top-0 z-10 border-b border-brand-purple/20">
          <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-pink to-brand-purple rounded-full flex items-center justify-center">
                    <Icon name="sparkles" className="w-6 h-6 text-white"/>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-wider">Visual Co-Pilot</h1>
              </div>
              <SaveStatusIndicator />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 p-1 bg-brand-dark rounded-xl border border-brand-purple/30">
                <Tooltip text="Manage scenes and visual style">
                  <NavButton pageName="scenes" label="Scenes" icon="scene" />
                </Tooltip>
                <Tooltip text="Create and manage characters">
                  <NavButton pageName="characters" label="Characters" icon="character" />
                </Tooltip>
                 <Tooltip text="Write your script with AI assistance">
                  <NavButton pageName="script" label="Script" icon="clipboard-document-list" />
                </Tooltip>
                 <Tooltip text="View your storyboard">
                  <NavButton pageName="post-production" label="Storyboard" icon="film" />
                </Tooltip>
                <Tooltip text="Freely generate images with any prompt">
                  <NavButton pageName="playground" label="Playground" icon="sparkles" />
                </Tooltip>
              </div>
              <Tooltip text="Export project assets">
                <button 
                  onClick={() => setIsExportModalOpen(true)}
                  className="p-2 rounded-full text-gray-300 hover:bg-brand-dark-accent hover:text-white transition-colors"
                  aria-label="Export project"
                >
                  <Icon name="download" className="w-6 h-6" />
                </button>
              </Tooltip>
            </div>
          </nav>
        </header>

        <main className="container mx-auto">
          {currentPage === 'scenes' && (
            <ScenesPage
              styleSeed={styleSeed}
              setStyleSeed={setStyleSeed}
              styleSeedHistory={styleSeedHistory}
              setStyleSeedHistory={setStyleSeedHistory}
              scenes={scenes}
              setScenes={setScenes}
            />
          )}
          {currentPage === 'characters' && (
            <CharactersPage characters={characters} setCharacters={setCharacters} />
          )}
           {currentPage === 'script' && (
            <ScriptBuilderPage characters={characters} script={script} setScript={setScript} />
          )}
          {currentPage === 'post-production' && (
            <PostProductionPage characters={characters} script={script} scenes={scenes} />
          )}
          {currentPage === 'playground' && (
              <PlaygroundPage images={playgroundImages} setImages={setPlaygroundImages} />
          )}
        </main>
      </div>
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectData={{ styleSeed, scenes, characters, script, styleSeedHistory }}
      />
      <VoiceAssistantWidget />
    </>
  );
}

export default App;