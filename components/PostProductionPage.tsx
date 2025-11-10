
import React, { useState } from 'react';
import type { Character, ScriptLine, Scene } from '../types';
import { playAudio } from '../services/audioUtils';
import Icon from './common/Icon';
import Tooltip from './common/Tooltip';

interface PostProductionPageProps {
  characters: Character[];
  script: ScriptLine[];
  scenes: Scene[];
}

const PostProductionPage: React.FC<PostProductionPageProps> = ({ characters, script, scenes }) => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const getCharacterName = (id: string) => {
    if (id === 'narrator') return 'Narrator';
    return characters.find(c => c.id === id)?.name || 'Unknown';
  };
  
  const getCharacterImage = (id: string) => {
    return characters.find(c => c.id === id)?.image;
  };

  const handlePlayAudio = async (line: ScriptLine) => {
    if (line.audio && !playingAudioId) {
      setPlayingAudioId(line.id);
      await playAudio(line.audio);
      setPlayingAudioId(null);
    }
  };

  const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-brand-dark-accent/50 border border-brand-purple/20 rounded-xl p-6 shadow-lg backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
  
  return (
    <div className="p-4 md:p-8 animate-fade-in space-y-8">
        <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-brand-light">Post Production Storyboard</h1>
            <p className="text-gray-400 mt-2">Bringing your script and scenes together.</p>
        </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Script Column */}
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-light flex items-center gap-2"><Icon name="clipboard-document-list" /> Final Script</h2>
            <Card className="max-h-[70vh] overflow-y-auto">
                <div className="space-y-6 p-4">
                {script.length === 0 && <p className="text-gray-500">Your script is empty. Go to the Script tab to start writing!</p>}
                {script.map(item => {
                    const charImage = getCharacterImage(item.characterId);
                    return (
                    <div key={item.id} className="flex gap-4 animate-fade-in">
                        {item.characterId !== 'narrator' && (
                        <div className="flex-shrink-0 w-12 h-12 bg-brand-dark rounded-full overflow-hidden">
                            {charImage ? (
                                <img src={`data:image/jpeg;base64,${charImage}`} alt={getCharacterName(item.characterId)} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-brand-purple/50">
                                    <Icon name="user" className="w-6 h-6 text-brand-light" />
                                </div>
                            )}
                        </div>
                        )}
                        <div className={item.characterId === 'narrator' ? 'w-full' : 'flex-grow'}>
                          <p className={`font-bold ${item.characterId === 'narrator' ? 'text-brand-teal' : 'text-brand-pink'}`}>
                            {getCharacterName(item.characterId)}
                          </p>
                          <div className="flex items-start gap-2">
                              <p className={`mt-1 flex-grow ${item.characterId === 'narrator' ? 'text-gray-400 italic' : 'text-gray-200'} whitespace-pre-wrap`}>{item.line}</p>
                              {item.audio && (
                                <Tooltip text="Play Audio">
                                  <button onClick={() => handlePlayAudio(item)} disabled={!!playingAudioId} className="flex-shrink-0 mt-1">
                                    <Icon name="volume-high" className={`w-5 h-5 transition-colors ${playingAudioId === item.id ? 'text-brand-pink animate-pulse' : 'text-gray-400 hover:text-white'}`} />
                                  </button>
                                </Tooltip>
                              )}
                          </div>
                        </div>
                    </div>
                    );
                })}
                </div>
            </Card>
        </div>

        {/* Scenes Column */}
        <div className="space-y-4">
             <h2 className="text-2xl font-bold text-brand-light flex items-center gap-2"><Icon name="scene" /> Scene Gallery</h2>
            {scenes.length === 0 ? (
                <Card>
                    <p className="text-gray-500 text-center py-10">No scenes generated yet. Go to the Scenes tab to create some visuals!</p>
                </Card>
            ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2">
                    {scenes.map(scene => (
                        <div key={scene.id} className="group relative aspect-video bg-brand-dark-accent rounded-xl overflow-hidden shadow-lg animate-fade-in border-2 border-transparent hover:border-brand-teal transition-all">
                            <img src={`data:image/jpeg;base64,${scene.image}`} alt={scene.prompt} className="w-full h-full object-cover" />
                             <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <p className="text-white text-xs translate-y-2 group-hover:translate-y-0 transition-transform">{scene.prompt}</p>
                            </div>
                        </div>
                    ))}
                 </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default PostProductionPage;