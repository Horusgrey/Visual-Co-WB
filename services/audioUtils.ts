
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Re-usable audio player for TTS
// FIX: Cast window to `any` to allow access to `webkitAudioContext` for older browser compatibility.
const ttsAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});

export async function playAudio(base64Audio: string): Promise<void> {
    const audioData = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioData, ttsAudioContext, 24000, 1);
    const source = ttsAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ttsAudioContext.destination);
    source.start();
    return new Promise(resolve => {
        source.onended = () => resolve();
    });
}