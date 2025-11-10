import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import Spinner from './common/Spinner';
import Icon from './common/Icon';
import Tooltip from './common/Tooltip';

type AspectRatio = '16:9' | '1:1' | '9:16' | '4:3' | '3:4';

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
    { value: '16:9', label: 'Landscape' },
    { value: '1:1', label: 'Square' },
    { value: '9:16', label: 'Portrait' },
    { value: '4:3', label: '4:3' },
    { value: '3:4', label: '3:4' },
];

interface PlaygroundPageProps {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
}

const PlaygroundPage: React.FC<PlaygroundPageProps> = ({ images, setImages }) => {
    const [prompt, setPrompt] = useState('a majestic cyberpunk city skyline at dusk, neon reflections on the wet streets');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError(null);
        try {
            const newImage = await generateImage(prompt, aspectRatio);
            setImages(prev => [newImage, ...prev]);
        } catch (err) {
            setError('Failed to generate image. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
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
                <h2 className="text-xl font-bold text-brand-light mb-4 flex items-center gap-2"><Icon name="sparkles" /> AI Image Playground</h2>
                <div className="space-y-4">
                    <Tooltip text="Describe the image you want the AI to create in detail.">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the image you want to create..."
                            className="w-full h-32 p-3 bg-brand-dark border border-brand-purple/50 rounded-lg focus:ring-2 focus:ring-brand-pink focus:outline-none transition-all"
                            disabled={isLoading}
                        />
                    </Tooltip>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Aspect Ratio</label>
                        <div className="flex flex-wrap gap-2">
                            {ASPECT_RATIOS.map(ratio => (
                                <Tooltip key={ratio.value} text={`Set aspect ratio to ${ratio.label} (${ratio.value})`}>
                                  <button
                                      onClick={() => setAspectRatio(ratio.value)}
                                      className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${aspectRatio === ratio.value ? 'bg-brand-pink text-white' : 'bg-brand-dark hover:bg-brand-purple/50 text-gray-300'}`}
                                  >
                                      {ratio.label}
                                  </button>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                     <Tooltip text="Generate a new image from your prompt and selected aspect ratio">
                       <button
                          onClick={handleGenerate}
                          className="w-full flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal/80 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
                          disabled={isLoading || !prompt}
                      >
                          {isLoading ? <Spinner /> : <Icon name="camera" className="w-5 h-5" />}
                          Generate Image
                      </button>
                     </Tooltip>
                </div>
            </Card>

            {isLoading && (
                <div className="flex justify-center">
                    <div className="text-center p-8 bg-brand-dark-accent/50 rounded-xl">
                        <Spinner className="w-12 h-12 text-brand-pink mx-auto animate-pulse-fast" />
                        <p className="mt-4 text-gray-400">Your vision is materializing...</p>
                    </div>
                </div>
            )}

            {images.length > 0 && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-4 text-brand-light">Your Creations</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {images.map((img, index) => (
                        <div key={index} className="group relative bg-brand-dark-accent rounded-xl overflow-hidden shadow-lg animate-fade-in border-2 border-transparent hover:border-brand-teal transition-all">
                            <img src={`data:image/jpeg;base64,${img}`} alt={`Generated image ${index + 1}`} className="w-full h-full object-contain" />
                        </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlaygroundPage;
