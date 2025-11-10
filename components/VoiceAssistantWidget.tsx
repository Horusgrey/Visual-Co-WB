
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, LiveSession } from '@google/genai';
import { decode, decodeAudioData, encode } from '../services/audioUtils';
import Icon from './common/Icon';
import Spinner from './common/Spinner';
import Tooltip from './common/Tooltip';

type Status = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

const VoiceAssistantWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);

    const [userTranscription, setUserTranscription] = useState('');
    const [modelTranscription, setModelTranscription] = useState('');
    const [history, setHistory] = useState<{ user: string; model: string }[]>([]);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, userTranscription, modelTranscription]);

    const cleanup = useCallback(() => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();

        mediaStreamRef.current = null;
        scriptProcessorRef.current = null;
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        sessionPromiseRef.current = null;
    }, []);

    const handleToggleSession = useCallback(async () => {
        if (status !== 'idle' && status !== 'error') { // Stop session
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => session.close());
            }
            cleanup();
            setStatus('idle');
            return;
        }

        // Start session
        setStatus('connecting');
        setError(null);
        setHistory([]);
        setUserTranscription('');
        setModelTranscription('');

        try {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error('Microphone access denied:', err);
            setError('Microphone access is required. Please enable it in your browser settings.');
            setStatus('error');
            return;
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    setStatus('listening');
                    const source = inputAudioContextRef.current!.createMediaStreamSource(mediaStreamRef.current!);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio) {
                        setStatus('speaking');
                        const outCtx = outputAudioContextRef.current!;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
                        const source = outCtx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outCtx.destination);
                        source.addEventListener('ended', () => {
                            sourcesRef.current.delete(source);
                            if (sourcesRef.current.size === 0) {
                                setStatus('listening');
                            }
                        });
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        sourcesRef.current.add(source);
                    }

                    if (message.serverContent?.inputTranscription) {
                        setUserTranscription(prev => prev + message.serverContent.inputTranscription.text);
                    }
                    if (message.serverContent?.outputTranscription) {
                        setModelTranscription(prev => prev + message.serverContent.outputTranscription.text);
                    }

                    if (message.serverContent?.turnComplete) {
                        const finalUser = userTranscription + (message.serverContent.inputTranscription?.text || '');
                        const finalModel = modelTranscription + (message.serverContent.outputTranscription?.text || '');
                        if(finalUser.trim() && finalModel.trim()){
                            setHistory(prev => [...prev, { user: finalUser, model: finalModel }]);
                        }
                        setUserTranscription('');
                        setModelTranscription('');
                    }

                    if (message.serverContent?.interrupted) {
                        for (const source of sourcesRef.current.values()) {
                            source.stop();
                            sourcesRef.current.delete(source);
                        }
                        nextStartTimeRef.current = 0;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Session error:', e);
                    setError('A connection error occurred. Please try again.');
                    setStatus('error');
                    cleanup();
                },
                onclose: () => {
                    cleanup();
                    setStatus('idle');
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                systemInstruction: "You are a creative co-pilot for a storyteller. Be concise, inspiring, and helpful. Your name is Co-Pilot.",
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
        });
    }, [status, cleanup, userTranscription, modelTranscription]);

    const getStatusIndicator = () => {
        switch (status) {
            case 'connecting':
                return <><Spinner className="w-4 h-4" /> Connecting...</>;
            case 'listening':
                return <span className="text-brand-teal">Listening...</span>;
            case 'speaking':
                return <span className="text-brand-pink">Speaking...</span>;
            case 'error':
                return <span className="text-red-400">Error</span>;
            default:
                return 'Voice Assistant';
        }
    };

    const MainButtonIcon = () => {
        switch (status) {
            case 'connecting':
                return <Spinner className="w-10 h-10" />;
            case 'listening':
                return <Icon name="microphone" className="w-10 h-10 text-brand-teal animate-pulse-fast" />;
            case 'speaking':
                return <Icon name="volume-high" className="w-10 h-10 text-brand-pink" />;
            case 'error':
                 return <Icon name="microphone-slash" className="w-10 h-10 text-red-400" />;
            default:
                return <Icon name="microphone" className="w-10 h-10" />;
        }
    };

    return (
        <>
            <div className={`fixed bottom-0 right-0 m-4 md:m-8 transition-all duration-300 ease-in-out z-20 ${isOpen ? 'w-[calc(100%-2rem)] md:w-[26rem] h-[70%] md:h-[36rem]' : 'w-16 h-16'}`}>
                {isOpen ? (
                    <div className="w-full h-full bg-brand-dark-accent/80 backdrop-blur-xl border border-brand-purple/30 rounded-2xl shadow-2xl flex flex-col animate-fade-in">
                        <header className="flex items-center justify-between p-3 border-b border-brand-purple/20 flex-shrink-0">
                            <h3 className="font-bold text-lg pl-2 flex items-center gap-2">{getStatusIndicator()}</h3>
                            <Tooltip text="Close Assistant">
                                <button onClick={() => { handleToggleSession(); setIsOpen(false); }} className="text-gray-400 hover:text-white">
                                    <Icon name="close" className="w-6 h-6" />
                                </button>
                            </Tooltip>
                        </header>
                        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                           {history.map((turn, index) => (
                                <div key={index} className="space-y-4">
                                    <p className="text-right text-gray-300">{turn.user}</p>
                                    <p className="text-left text-brand-light">{turn.model}</p>
                                </div>
                            ))}
                             {userTranscription && <p className="text-right text-gray-400 italic">{userTranscription}</p>}
                             {modelTranscription && <p className="text-left text-gray-200 italic">{modelTranscription}</p>}
                             {error && <p className="text-center text-red-400 bg-red-500/10 p-2 rounded-lg">{error}</p>}
                             {status === 'idle' && history.length === 0 && <p className="text-center text-gray-500 pt-16">Click the microphone to start the conversation.</p>}
                             <div ref={transcriptEndRef} />
                        </div>
                        <div className="p-6 border-t border-brand-purple/20 flex-shrink-0 flex justify-center items-center">
                            <Tooltip text={status === 'idle' || status === 'error' ? 'Start Session' : 'Stop Session'}>
                                <button
                                    onClick={handleToggleSession}
                                    className="w-24 h-24 bg-brand-dark border-4 border-brand-purple/50 rounded-full flex items-center justify-center text-white hover:border-brand-pink transition-colors"
                                >
                                    <MainButtonIcon />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                ) : (
                    <Tooltip text="Open Voice Assistant">
                        <button onClick={() => setIsOpen(true)} className="w-16 h-16 bg-gradient-to-br from-brand-pink to-brand-purple rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform">
                            <Icon name="microphone" className="w-8 h-8" />
                        </button>
                    </Tooltip>
                )}
            </div>
        </>
    );
};

export default VoiceAssistantWidget;
