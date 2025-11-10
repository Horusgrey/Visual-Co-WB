
import React, { useState, useRef, useEffect } from 'react';
import type { Scene, StyleSeed, Place } from '../types';
import { generateImage, enhancePrompt, rewritePromptForStyle, fileToBase64, findLocationForPrompt, generatePromptVariations } from '../services/geminiService';
import Spinner from './common/Spinner';
import Icon from './common/Icon';
import ImageEditorModal from './ImageEditorModal';
import Tooltip from './common/Tooltip';

interface ScenesPageProps {
  styleSeed: StyleSeed | null;
  setStyleSeed: React.Dispatch<React.SetStateAction<StyleSeed | null>>;
  styleSeedHistory: StyleSeed[];
  setStyleSeedHistory: React.Dispatch<React.SetStateAction<StyleSeed[]>>;
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
}

const stylePresets = [
  {
    name: 'Cyberpunk Neon',
    prompt: 'Gloomy, cinematic, neon-drenched cyberpunk cityscape at night. Rain-slicked streets reflect glowing signs. High contrast, moody lighting, and a sense of futuristic noir. UHD, photorealistic.',
    mimeType: 'image/jpeg',
    image: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBAUEBAYFBQUGBgYHCQ4JCQgICRINDQoOFRIWFhUSFBQXGIcBBxgZGRESR0FCTFlORkBiX5KVLVBwQ1xNPT9FPj/2wBDAQYFBQgGBwkGEQ8gJSMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT/8QAFwABAQEBAAAAAAAAAAAAAAAAAAECA//EABcBAQEBAQAAAAAAAAAAAAAAAAABAgP/2gAMAwEAAhEDEQA/APpiRSlSAUEpQFBKQBQSkAUApAFALEAUAsQClAFsUAUWzQBRbNABQAUAFABQAUAFABQAUAFAH/2gAIAQEDAT8B3//Z'
  },
  {
    name: 'Ghibli-esque Watercolor',
    prompt: 'A lush, vibrant green landscape with rolling hills under a bright blue sky with fluffy white clouds. Soft, gentle watercolor aesthetic, reminiscent of a Studio Ghibli film. Warm, inviting, and peaceful.',
    mimeType: 'image/jpeg',
    image: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBAUEBAYFBQUGBgYHCQ4JCQgICRINDQoOFRIWFhUSFBQXGIcBBxgZGRESR0FCTFlORkBiX5KVLVBwQ1xNPT9FPj/2wBDAQYFBQgGBwkGEQ8gJSMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT/8QAFwABAQEBAAAAAAAAAAAAAAAAAAECA//EABYBAQEBAAAAAAAAAAAAAAAAAAABAv/aAAwDAQACEQMRAD8A+mJCpAUAlIBQFAFACgCgFAFAFACgCgCgCgCgCgCgCgCgCgCgCgP/2gAIAQEDAT8B3//Z'
  },
  {
    name: 'Gritty Film Noir',
    prompt: 'High-contrast black and white, dramatic hard shadows, a mysterious figure in a trench coat stands on a foggy street. Cinematic, 1940s film noir style, grainy texture.',
    mimeType: 'image/jpeg',
    image: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBAUEBAYFBQUGBgYHCQ4JCQgICRINDQoOFRIWFhUSFBQXGIcBBxgZGRESR0FCTFlORkBiX5KVLVBwQ1xNPT9FPj/2wBDAQYFBQgGBwkGEQ8gJSMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT/8QAFwABAQEBAAAAAAAAAAAAAAAAAAECA//EABYBAQEBAAAAAAAAAAAAAAAAAAABAv/aAAwDAQACEQMRAD8A+mJCpAKAUgCgFIBQBQBQCkAUApAFALEAUsQClsUAWxQBRbNABQAUAFABQAUAFABQAUAf/9k='
  },
  {
    name: 'Vintage Sepia',
    prompt: 'A warm, antique portrait of a person from the early 20th century. Rich sepia tones, soft focus, and a slightly faded, nostalgic quality. The texture of old photographic paper.',
    mimeType: 'image/jpeg',
    image: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBAUEBAYFBQUGBgYHCQ4JCQgICRINDQoOFRIWFhUSFBQXGIcBBxgZGRESR0FCTFlORkBiX5KVLVBwQ1xNPT9FPj/2wBDAQYFBQgGBwkGEQ8gJSMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT/8QAFwABAQEBAAAAAAAAAAAAAAAAAAECA//EABUBAQEAAAAAAAAAAAAAAAAAAAEA/9oADAMBAAIRAxEAPwD6YkUpUgFALEApQBSxAKWIBQCkAUAsQClAFsUAUWzQBRbNABQAUAFABQAUAFABQAUAFAH/2gAIAQEDAT8B3//Z'
  }
];

const MAX_HISTORY_LENGTH = 8;

const ScenesPage: React.FC<ScenesPageProps> = ({ styleSeed, setStyleSeed, styleSeedHistory, setStyleSeedHistory, scenes, setScenes }) => {
  const [stylePrompt, setStylePrompt] = useState('gritty, near-future Twin Cities, neon signs reflect in puddles on cracked pavement, moody, atmospheric, cinematic lighting');
  const [locationQuery, setLocationQuery] = useState('a moody, historic bar in New Orleans');
  const [scenePrompt, setScenePrompt] = useState('a character walks into a dimly lit coffee shop');
  const [numToGenerate, setNumToGenerate] = useState(1);
  
  const [isLoadingStyleSeed, setIsLoadingStyleSeed] = useState(false);
  const [isScouting, setIsScouting] = useState(false);
  const [isLoadingScene, setIsLoadingScene] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);

  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [scoutedPlaces, setScoutedPlaces] = useState<Place[] | null>(null);

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setLocationError(null);
            },
            (error) => {
                console.warn(`Geolocation error: ${error.message}`);
                setLocationError("Couldn't get your location. Location scouting will be less accurate.");
            }
        );
    } else {
        setLocationError("Geolocation is not supported by your browser.");
    }
}, []);

const updateAndRecordStyleSeed = (newSeed: StyleSeed) => {
  setStyleSeed(newSeed);
  setStyleSeedHistory(prevHistory => {
      // Avoid adding if it's identical to the most recent entry
      if (prevHistory.length > 0 && prevHistory[0].image === newSeed.image && prevHistory[0].prompt === newSeed.prompt) {
          return prevHistory;
      }
      const updatedHistory = [newSeed, ...prevHistory];
      return updatedHistory.slice(0, MAX_HISTORY_LENGTH);
  });
};

  const handleGenerateStyleSeed = async () => {
    if (!stylePrompt) return;
    setSelectedPreset(null);
    setIsLoadingStyleSeed(true);
    setError(null);
    try {
      const base64Image = await generateImage(stylePrompt);
      updateAndRecordStyleSeed({ 
        image: base64Image, 
        prompt: stylePrompt,
        mimeType: 'image/jpeg',
      });
    } catch (err) {
      setError('Failed to generate style seed. Please try again.');
      console.error(err);
    } finally {
      setIsLoadingStyleSeed(false);
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPreset(null);
      setIsLoadingStyleSeed(true);
      setError(null);
      try {
        const base64Image = await fileToBase64(file);
        updateAndRecordStyleSeed({
          image: base64Image,
          prompt: 'Uploaded from file',
          mimeType: file.type,
        });
      } catch (err) {
        setError('Failed to process uploaded image.');
        console.error(err);
      } finally {
        setIsLoadingStyleSeed(false);
      }
    }
  };

  const handleSelectPreset = (preset: typeof stylePresets[0]) => {
    updateAndRecordStyleSeed({
      image: preset.image,
      mimeType: preset.mimeType,
      prompt: preset.prompt,
    });
    setStylePrompt(preset.prompt);
    setSelectedPreset(preset.name);
  };

  const handleSelectHistorySeed = (seed: StyleSeed) => {
    setStyleSeed(seed);
    setStylePrompt(seed.prompt);
    const presetMatch = stylePresets.find(p => p.prompt === seed.prompt);
    setSelectedPreset(presetMatch ? presetMatch.name : null);
  };

  const handleScoutLocation = async () => {
    if (!locationQuery) return;
    setIsScouting(true);
    setError(null);
    setScoutedPlaces(null);
    try {
        const result = await findLocationForPrompt(locationQuery, userLocation);
        setScenePrompt(result.prompt);
        if (result.places.length > 0) {
            setScoutedPlaces(result.places);
        }
    } catch (err) {
        setError('Failed to scout location. Please try again.');
        console.error(err);
    } finally {
        setIsScouting(false);
    }
};

  const handleSuggestDetails = async () => {
    if (!scenePrompt) return;
    setIsSuggesting(true);
    setError(null);
    try {
      const enhanced = await enhancePrompt(scenePrompt);
      setScenePrompt(enhanced);
    } catch (err) {
      setError('Failed to get suggestions. Please try again.');
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerateScene = async () => {
    if (!scenePrompt || !styleSeed) return;
    setIsLoadingScene(true);
    setError(null);
    try {
        const promptsToGenerate = numToGenerate > 1
            ? await generatePromptVariations(scenePrompt, numToGenerate)
            : [scenePrompt];

        const newScenesPromises = promptsToGenerate.map(async (promptVar) => {
            const detailedPrompt = await rewritePromptForStyle(styleSeed.image, styleSeed.mimeType, promptVar);
            const sceneImage = await generateImage(detailedPrompt);
            return {
                id: `${new Date().toISOString()}-${Math.random()}`, // Ensure unique id
                prompt: promptVar,
                image: sceneImage,
            };
        });

        const newScenes = await Promise.all(newScenesPromises);
        setScenes(prevScenes => [...newScenes, ...prevScenes]);

        if (newScenes.length > 0) {
          setEditingScene(newScenes[0]);
        }
    } catch (err) {
      setError(`Failed to generate scene(s). Please try again.`);
      console.error(err);
    } finally {
      setIsLoadingScene(false);
    }
  };

  const handleSaveEdit = (sceneId: string, newImageBase64: string) => {
    setScenes(prevScenes => prevScenes.map(s => s.id === sceneId ? { ...s, image: newImageBase64 } : s));
    setEditingScene(null);
  };

  const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-brand-dark-accent/50 border border-brand-purple/20 rounded-xl p-6 shadow-lg backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );

  const StepHeader: React.FC<{ number: number; title: string; subtitle: string }> = ({ number, title, subtitle }) => (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-brand-purple text-brand-light rounded-full text-xl font-bold border-2 border-brand-pink/50">
        {number}
      </div>
      <div>
        <h2 className="text-xl font-bold text-brand-light">{title}</h2>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="p-4 md:p-8 animate-fade-in space-y-8">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg" role="alert">
            <p>{error}</p>
          </div>
        )}

        {/* Step 1: Style Seed */}
        <Card>
          <StepHeader number={1} title="Define the Vibe" subtitle="Create your project's visual anchor or 'Style Seed'." />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
              <Tooltip text="Describe the visual style, mood, color palette, and lighting for your project.">
                <textarea
                  value={stylePrompt}
                  onChange={(e) => {
                    setStylePrompt(e.target.value);
                    setSelectedPreset(null);
                  }}
                  placeholder="e.g., Gritty, near-future Twin Cities..."
                  className="w-full h-32 p-3 bg-brand-dark border border-brand-purple/50 rounded-lg focus:ring-2 focus:ring-brand-pink focus:outline-none transition-all"
                  disabled={isLoadingStyleSeed}
                />
              </Tooltip>
              <div className="flex flex-col sm:flex-row gap-3">
                <Tooltip text="Generate an image from your text description" className="w-full">
                  <button
                    onClick={handleGenerateStyleSeed}
                    className="w-full flex items-center justify-center gap-2 bg-brand-pink hover:bg-brand-pink/80 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                    disabled={isLoadingStyleSeed || !stylePrompt}
                  >
                    {isLoadingStyleSeed ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
                    Generate with AI
                  </button>
                </Tooltip>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                <Tooltip text="Upload your own image as a style reference" className="w-full">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-brand-purple hover:bg-brand-purple/80 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                    disabled={isLoadingStyleSeed}
                  >
                    <Icon name="camera" className="w-5 h-5" />
                    Upload Image
                  </button>
                </Tooltip>
              </div>
              
              <div className="space-y-3 pt-4">
                <p className="text-sm text-gray-400">Or, pick from the Style Library:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {stylePresets.map(preset => (
                    <Tooltip key={preset.name} text={preset.name}>
                      <button
                        onClick={() => handleSelectPreset(preset)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${selectedPreset === preset.name ? 'border-brand-pink scale-105' : 'border-transparent hover:border-brand-purple/50'}`}
                        aria-pressed={selectedPreset === preset.name}
                      >
                        <img src={`data:${preset.mimeType};base64,${preset.image}`} alt={preset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/30"></div>
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </div>

            </div>
            <div className="h-48 lg:h-full w-full bg-brand-dark/50 rounded-lg flex items-center justify-center border-2 border-dashed border-brand-purple/50 overflow-hidden">
              {isLoadingStyleSeed && <div className="text-center"><Spinner className="w-10 h-10 mx-auto" /><p className="mt-2 text-gray-400">Brewing the style...</p></div>}
              {!isLoadingStyleSeed && styleSeed && (
                <img src={`data:${styleSeed.mimeType};base64,${styleSeed.image}`} alt="Style Seed" className="w-full h-full object-cover animate-fade-in" />
              )}
              {!isLoadingStyleSeed && !styleSeed && (
                <p className="text-gray-500">Your Style Seed will appear here</p>
              )}
            </div>
          </div>
          {styleSeedHistory.length > 1 && (
              <div className="mt-6 pt-6 border-t border-brand-purple/20">
                <h3 className="text-lg font-bold text-brand-light mb-3">Style History</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6">
                  {styleSeedHistory.map((historySeed, index) => (
                    <Tooltip key={`${index}-${historySeed.prompt}`} text={`Re-apply style: "${historySeed.prompt.substring(0, 40)}..."`}>
                      <button
                        onClick={() => handleSelectHistorySeed(historySeed)}
                        className={`group relative flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          styleSeed?.image === historySeed.image && styleSeed?.prompt === historySeed.prompt ? 'border-brand-pink scale-105' : 'border-transparent hover:border-brand-purple/50'
                        }`}
                        aria-pressed={styleSeed?.image === historySeed.image && styleSeed?.prompt === historySeed.prompt}
                      >
                        <img src={`data:${historySeed.mimeType};base64,${historySeed.image}`} alt={`History style ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
        </Card>
        
        {/* Step 2: Location Scout */}
        {styleSeed && (
            <Card className="animate-fade-in">
                <StepHeader number={2} title="Location Scout" subtitle="Find real places to inspire your scenes." />
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Tooltip text="Describe a place you want to find (e.g., 'a haunted library in Scotland')" className="flex-grow">
                          <input
                              type="text"
                              value={locationQuery}
                              onChange={(e) => setLocationQuery(e.target.value)}
                              placeholder="e.g., A moody, historic bar in New Orleans"
                              className="w-full p-3 bg-brand-dark border border-brand-purple/50 rounded-lg focus:ring-2 focus:ring-brand-pink focus:outline-none transition-all"
                              disabled={isScouting}
                          />
                        </Tooltip>
                        <Tooltip text="Find a real-world location with AI">
                          <button
                              onClick={handleScoutLocation}
                              className="flex items-center justify-center gap-2 bg-brand-purple hover:bg-brand-purple/80 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 h-full"
                              disabled={isScouting || !locationQuery}
                          >
                              {isScouting ? <Spinner /> : <Icon name="location-marker" className="w-5 h-5" />}
                              Scout
                          </button>
                        </Tooltip>
                    </div>
                    {locationError && <p className="text-xs text-yellow-400">{locationError}</p>}
                    {scoutedPlaces && scoutedPlaces.length > 0 && (
                        <div className="bg-brand-dark/30 p-3 rounded-lg text-sm space-y-1">
                            <p className="font-semibold text-gray-300">AI found a real location:</p>
                            {scoutedPlaces.map((place, index) => (
                                <a key={index} href={place.uri} target="_blank" rel="noopener noreferrer" className="block text-brand-teal hover:underline truncate">
                                    {place.title}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        )}

        {/* Step 3: Scene Generation */}
        {styleSeed && (
          <Card className="animate-fade-in">
            <StepHeader number={3} title="Create Scenes" subtitle="Generate scenes that automatically match your Style Seed." />
            <div className="space-y-4">
              <div className="relative">
                <Tooltip text="Describe the scene you want to create. It will be automatically styled.">
                  <textarea
                    value={scenePrompt}
                    onChange={(e) => setScenePrompt(e.target.value)}
                    placeholder="e.g., A detective looking at a holographic map..."
                    className="w-full h-32 p-3 pr-44 bg-brand-dark border border-brand-purple/50 rounded-lg focus:ring-2 focus:ring-brand-pink focus:outline-none transition-all"
                    disabled={isLoadingScene || isSuggesting}
                  />
                </Tooltip>
                <Tooltip text="Let AI enhance your prompt with more detail" className="absolute bottom-3 right-3">
                  <button
                    onClick={handleSuggestDetails}
                    className="flex items-center justify-center gap-2 bg-brand-purple hover:bg-brand-purple/80 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                    disabled={isSuggesting || isLoadingScene || !scenePrompt}
                  >
                    {isSuggesting ? <Spinner /> : <Icon name="sparkles" className="w-5 h-5" />}
                    Suggest Details
                  </button>
                </Tooltip>
              </div>

              <div className="flex gap-3">
                <Tooltip text="Create new scene images based on your prompt and style" className="flex-grow">
                  <button
                    onClick={handleGenerateScene}
                    className="w-full h-full flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal/80 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                    disabled={isLoadingScene || !scenePrompt}
                  >
                    {isLoadingScene ? <Spinner /> : <Icon name="camera" className="w-5 h-5" />}
                    Generate Scene{numToGenerate > 1 ? `s (${numToGenerate})` : ''}
                  </button>
                </Tooltip>
                <Tooltip text="Number of scene variations to generate">
                    <select 
                    value={numToGenerate}
                    onChange={(e) => setNumToGenerate(Number(e.target.value))}
                    className="h-full bg-brand-teal/80 hover:bg-brand-teal text-white font-bold py-2 px-3 rounded-lg appearance-none text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-pink"
                    disabled={isLoadingScene}
                    >
                    <option value={1}>x1</option>
                    <option value={2}>x2</option>
                    <option value={3}>x3</option>
                    </select>
                </Tooltip>
              </div>
            </div>
          </Card>
        )}

        {/* Scene Gallery */}
        {scenes.length > 0 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 text-brand-light">Scene Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoadingScene && (
                  <div className="relative aspect-video bg-brand-dark-accent/50 border border-brand-purple/20 rounded-xl flex items-center justify-center overflow-hidden">
                      <div className="text-center">
                          <Spinner className="w-10 h-10 text-brand-pink animate-pulse-fast" />
                          <p className="mt-2 text-gray-400">Rendering scene(s)...</p>
                      </div>
                  </div>
              )}
              {scenes.map(scene => (
                <div key={scene.id} className="group relative aspect-video bg-brand-dark-accent rounded-xl overflow-hidden shadow-lg animate-fade-in border-2 border-transparent hover:border-brand-teal transition-all">
                  <img src={`data:image/jpeg;base64,${scene.image}`} alt={scene.prompt} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Tooltip text="Open the image editor">
                        <button 
                          onClick={() => setEditingScene(scene)}
                          className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white font-bold py-2 px-4 rounded-lg hover:bg-white/20 transition-all"
                        >
                            <Icon name="edit" className="w-5 h-5" />
                            Edit with AI
                        </button>
                      </Tooltip>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-4 group-hover:translate-y-0">{scene.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <ImageEditorModal
        scene={editingScene}
        onClose={() => setEditingScene(null)}
        onSave={handleSaveEdit}
      />
    </>
  );
};

export default ScenesPage;
