
import React, { useState, useRef, useEffect } from 'react';
import type { Character, ScriptLine } from '../types';
import { generateDialogue, generateSpeech } from '../services/geminiService';
import { playAudio } from '../services/audioUtils';
import Icon from './common/Icon';
import Spinner from './common/Spinner';
import Tooltip from './common/Tooltip';

interface ScriptBuilderPageProps {
  characters: Character[];
  script: ScriptLine[];
  setScript: React.Dispatch<React.SetStateAction<ScriptLine[]>>;
}

const ScriptBuilderPage: React.FC<ScriptBuilderPageProps> = ({ characters, script, setScript }) => {
  const [currentLine, setCurrentLine] = useState('');
  const [selectedCharId, setSelectedCharId] = useState('narrator');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const scriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [script]);

  const handleAddLine = () => {
    if (!currentLine.trim()) return;
    const newLine: ScriptLine = {
      id: new Date().toISOString(),
      characterId: selectedCharId,
      line: currentLine.trim(),
    };
    setScript(prev => [...prev, newLine]);
    setCurrentLine('');
  };

  const handleGenerateLine = async () => {
    const character = characters.find(c => c.id === selectedCharId);
    if (!character) {
      setError("Please select a character (not Narrator) to generate dialogue.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const generatedLine = await generateDialogue(character, script, characters);
      setCurrentLine(generatedLine);
    } catch (err) {
      setError("Failed to generate dialogue. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAudioForLine = async (lineId: string) => {
    const line = script.find(l => l.id === lineId);
    if (!line || line.characterId === 'narrator') return;

    setScript(prev => prev.map(l => l.id === lineId ? { ...l, isGeneratingAudio: true } : l));
    setError(null);
    try {
      const audio = await generateSpeech(line.line);
      setScript(prev => prev.map(l => l.id === lineId ? { ...l, audio, isGeneratingAudio: false } : l));
    } catch (err) {
      setError("Failed to generate audio. Please try again.");
      console.error(err);
      setScript(prev => prev.map(l => l.id === lineId ? { ...l, isGeneratingAudio: false } : l));
    }
  };

  const handlePlayAudio = async (line: ScriptLine) => {
    if (line.audio && !playingAudioId) {
      setPlayingAudioId(line.id);
      await playAudio(line.audio);
      setPlayingAudioId(null);
    }
  };

  const getCharacterName = (id: string) => {
    if (id === 'narrator') return 'Narrator';
    return characters.find(c => c.id === id)?.name || 'Unknown';
  };

  const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-brand-dark-accent/50 border border-brand-purple/20 rounded-xl p-6 shadow-lg backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="p-4 md:p-8 animate-fade-in space-y-8">
       {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Script Content */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-2xl font-bold text-brand-light mb-4 flex items-center gap-2">
              <Icon name="clipboard-document-list" /> Script
            </h2>
            <div className="h-[60vh] overflow-y-auto pr-4 space-y-4 bg-brand-dark/30 p-4 rounded-lg border border-brand-purple/20">
              {script.length === 0 && <p className="text-gray-500">Your script will appear here.</p>}
              {script.map(item => (
                <div key={item.id} className="animate-fade-in flex items-start gap-3">
                  <div className="flex-grow">
                    <p className={`font-bold ${item.characterId === 'narrator' ? 'text-brand-teal' : 'text-brand-pink'}`}>
                      {getCharacterName(item.characterId)}
                    </p>
                    <p className="text-gray-200 whitespace-pre-wrap">{item.line}</p>
                  </div>
                  {item.characterId !== 'narrator' && (
                    <div className="flex-shrink-0 pt-1">
                      {item.isGeneratingAudio ? (
                        <Spinner className="w-5 h-5 text-brand-teal" />
                      ) : item.audio ? (
                        <Tooltip text="Play Audio">
                          <button onClick={() => handlePlayAudio(item)} disabled={!!playingAudioId}>
                            <Icon name="volume-high" className={`w-5 h-5 transition-colors ${playingAudioId === item.id ? 'text-brand-pink animate-pulse' : 'text-gray-400 hover:text-white'}`} />
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip text="Generate Audio">
                          <button onClick={() => handleGenerateAudioForLine(item.id)}>
                            <Icon name="microphone" className="w-5 h-5 text-gray-500 hover:text-white transition-colors" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={scriptEndRef} />
            </div>
          </Card>
        </div>

        {/* Script Controls */}
        <div className="lg:col-span-1">
          <Card>
            <div className="space-y-4">
              <div>
                <label htmlFor="character-select" className="text-sm font-semibold text-gray-300 mb-2 block">
                  Speaker
                </label>
                <select
                  id="character-select"
                  value={selectedCharId}
                  onChange={(e) => setSelectedCharId(e.target.value)}
                  className="w-full p-3 bg-brand-dark border border-brand-purple/50 rounded-lg focus:ring-2 focus:ring-brand-pink focus:outline-none transition-all"
                >
                  <option value="narrator">Narrator</option>
                  {characters.map(char => (
                    <option key={char.id} value={char.id}>{char.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="line-input" className="text-sm font-semibold text-gray-300 mb-2 block">
                  Dialogue or Action
                </label>
                 <textarea
                  id="line-input"
                  value={currentLine}
                  onChange={(e) => setCurrentLine(e.target.value)}
                  placeholder="Type dialogue or scene description..."
                  className="w-full h-40 p-3 bg-brand-dark border border-brand-purple/50 rounded-lg focus:ring-2 focus:ring-brand-pink focus:outline-none transition-all"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-3">
                 <Tooltip text="Let the AI generate the next line for the selected character" className="w-full">
                   <button
                    onClick={handleGenerateLine}
                    className="w-full flex items-center justify-center gap-2 bg-brand-purple hover:bg-brand-purple/80 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                    disabled={isLoading || selectedCharId === 'narrator'}
                  >
                    {isLoading ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
                    Generate Line
                  </button>
                 </Tooltip>
                 <Tooltip text="Add the current text to the script" className="w-full">
                   <button
                    onClick={handleAddLine}
                    className="w-full flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal/80 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                    disabled={isLoading || !currentLine.trim()}
                  >
                    Add to Script
                  </button>
                 </Tooltip>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScriptBuilderPage;