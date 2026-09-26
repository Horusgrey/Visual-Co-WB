
import React, { useState } from 'react';
import type { Character, WorldBible } from '../types';
import { generateImage, generateCharacterBio } from '../services/geminiService';
import { applyWorldLock, isWorldLockActive } from '../services/worldLock';
import Spinner from './common/Spinner';
import Icon from './common/Icon';
import Tooltip from './common/Tooltip';

type AspectRatio = '1:1' | '3:4' | '9:16';
const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
    { value: '1:1', label: 'Square' },
    { value: '3:4', label: 'Portrait' },
    { value: '9:16', label: 'Tall' },
];

interface CharactersPageProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  worldBible?: WorldBible | null;
}

const CharactersPage: React.FC<CharactersPageProps> = ({ characters, setCharacters, worldBible }) => {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [characterAspectRatios, setCharacterAspectRatios] = useState<Record<string, AspectRatio>>({});

  const handleAddCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newRole) return;
    const newCharacter: Character = {
      id: new Date().toISOString(),
      name: newName,
      role: newRole,
      lookPrompt: `cinematic portrait of ${newName}, the ${newRole}, gritty sci-fi style, detailed face`,
    };
    setCharacters(prev => [newCharacter, ...prev]);
    setCharacterAspectRatios(prev => ({ ...prev, [newCharacter.id]: '1:1' }));
    setNewName('');
    setNewRole('');
  };
  
  const handleUpdateLookPrompt = (id: string, prompt: string) => {
    setCharacters(chars => chars.map(c => c.id === id ? { ...c, lookPrompt: prompt } : c));
  };

  const handleAddPromptFragment = (id: string, fragment: string) => {
    setCharacters(chars => chars.map(c => {
        if (c.id === id) {
            // Avoid adding duplicate fragments
            if (c.lookPrompt.includes(fragment)) return c;
            return { ...c, lookPrompt: `${c.lookPrompt}, ${fragment}` };
        }
        return c;
    }));
  };

  const handleGenerateLook = async (id:string) => {
    const character = characters.find(c => c.id === id);
    if (!character) return;

    setCharacters(chars => chars.map(c => c.id === id ? { ...c, isLoadingImage: true } : c));
    setError(null);
    try {
      const aspectRatio = characterAspectRatios[id] || '1:1';
      // World locks are injected here, not stored in lookPrompt, so the
      // character's own prompt stays editable and the bible stays the one
      // place the rules live.
      const lockedPrompt = applyWorldLock(character.lookPrompt, worldBible, 'character');
      const image = await generateImage(lockedPrompt, aspectRatio);
      setCharacters(chars => chars.map(c => c.id === id ? { ...c, image, isLoadingImage: false } : c));
    } catch (err) {
      setError(`Failed to generate look for ${character.name}.`);
      setCharacters(chars => chars.map(c => c.id === id ? { ...c, isLoadingImage: false } : c));
    }
  };

  const handleGenerateBio = async (id: string) => {
    const character = characters.find(c => c.id === id);
    if (!character) return;
    
    setCharacters(chars => chars.map(c => c.id === id ? { ...c, isLoadingBio: true } : c));
    setError(null);
    try {
      const bio = await generateCharacterBio(character.name, character.role);
      setCharacters(chars => chars.map(c => c.id === id ? { ...c, bio, isLoadingBio: false } : c));
    } catch (err) {
      setError(`Failed to generate bio for ${character.name}.`);
      setCharacters(chars => chars.map(c => c.id === id ? { ...c, isLoadingBio: false } : c));
    }
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

      <Card>
        <h2 className="text-xl font-bold text-brand-light mb-4 flex items-center gap-2"><Icon name="user" />Create a New Character</h2>
        <form onSubmit={handleAddCharacter} className="flex flex-col sm:flex-row gap-4">
          <Tooltip text="Enter the character's name" className="flex-grow">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Character Name"
              className="w-full p-3 bg-brand-dark border border-brand-purple/50 rounded-lg focus:ring-2 focus:ring-brand-pink focus:outline-none transition-all"
            />
          </Tooltip>
          <Tooltip text="Enter the character's role in the story" className="flex-grow">
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Role (e.g., Rogue AI, Veteran Smuggler)"
              className="w-full p-3 bg-brand-dark border border-brand-purple/50 rounded-lg focus:ring-2 focus:ring-brand-pink focus:outline-none transition-all"
            />
          </Tooltip>
          <Tooltip text="Add this character to your project">
            <button type="submit" className="flex items-center justify-center gap-2 bg-brand-pink hover:bg-brand-pink/80 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 disabled:bg-gray-500 h-full" disabled={!newName || !newRole}>
              Add
            </button>
          </Tooltip>
        </form>
      </Card>

      <div className="space-y-6">
        {characters.map(char => (
          <Card key={char.id} className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                 <div className="aspect-square bg-brand-dark/50 rounded-lg flex items-center justify-center border-2 border-dashed border-brand-purple/50 overflow-hidden">
                    {char.isLoadingImage && <div className="text-center"><Spinner className="w-10 h-10 mx-auto" /><p className="mt-2 text-gray-400">Generating...</p></div>}
                    {!char.isLoadingImage && char.image && (
                      <img src={`data:image/jpeg;base64,${char.image}`} alt={`Look for ${char.name}`} className="w-full h-full object-cover" />
                    )}
                    {!char.isLoadingImage && !char.image && (
                        <p className="text-gray-500 text-center p-4">Character portrait will appear here</p>
                    )}
                 </div>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-brand-light">{char.name}</h3>
                  <p className="text-brand-teal font-medium">{char.role}</p>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-300">Look Prompt</label>
                  <Tooltip text="Describe the character's appearance for the AI. Be specific!">
                    <textarea 
                      value={char.lookPrompt}
                      onChange={(e) => handleUpdateLookPrompt(char.id, e.target.value)}
                      className="w-full p-2 bg-brand-dark border border-brand-purple/50 rounded-lg focus:ring-2 focus:ring-brand-pink focus:outline-none transition-all"
                      rows={2}
                    />
                  </Tooltip>
                   <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleAddPromptFragment(char.id, 'close-up shot')} className="px-2 py-1 text-xs rounded-full bg-brand-dark hover:bg-brand-purple/50 text-gray-300 transition-colors">Close-up</button>
                        <button onClick={() => handleAddPromptFragment(char.id, 'full body shot')} className="px-2 py-1 text-xs rounded-full bg-brand-dark hover:bg-brand-purple/50 text-gray-300 transition-colors">Full Body</button>
                   </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-grow">
                      <label className="text-xs font-semibold text-gray-400">Aspect Ratio</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {ASPECT_RATIOS.map(ratio => (
                            <Tooltip key={ratio.value} text={`Set aspect ratio to ${ratio.label} (${ratio.value})`}>
                                <button
                                    onClick={() => setCharacterAspectRatios(prev => ({...prev, [char.id]: ratio.value}))}
                                    className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${ (characterAspectRatios[char.id] || '1:1') === ratio.value ? 'bg-brand-pink text-white' : 'bg-brand-dark hover:bg-brand-purple/50 text-gray-300'}`}
                                >
                                    {ratio.label}
                                </button>
                            </Tooltip>
                        ))}
                      </div>
                    </div>
                    <Tooltip text="Generate the character's portrait based on the look prompt">
                     <button
                        onClick={() => handleGenerateLook(char.id)}
                        className="w-full sm:w-auto self-end flex items-center justify-center gap-2 bg-brand-purple hover:bg-brand-purple/80 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-500"
                        disabled={char.isLoadingImage}
                      >
                        {char.isLoadingImage ? <Spinner /> : <Icon name="camera" className="w-5 h-5"/>}
                        Generate Look
                      </button>
                   </Tooltip>
                  </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-gray-300">AI Generated Bio</label>
                    </div>
                    {char.isLoadingBio ? <div className="flex justify-center p-4"><Spinner /></div> : char.bio ? <p className="text-gray-300 bg-brand-dark/50 p-3 rounded-lg border border-brand-purple/30">{char.bio}</p> : <p className="text-gray-500 italic p-3">Click "Gen Bio" to create a backstory.</p>}
                     <Tooltip text="Generate a short, creative biography for this character">
                       <button
                          onClick={() => handleGenerateBio(char.id)}
                          className="w-full flex items-center justify-center gap-2 bg-brand-purple hover:bg-brand-purple/80 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-500"
                          disabled={char.isLoadingBio}
                      >
                          {char.isLoadingBio ? <Spinner /> : <Icon name="book" className="w-5 h-5" />}
                          Gen Bio
                      </button>
                     </Tooltip>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CharactersPage;
