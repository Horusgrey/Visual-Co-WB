
export interface StyleSeed {
  image: string; // base64 string
  mimeType: string;
  prompt: string;
}

export interface Scene {
  id: string;
  prompt: string;
  image: string; // base64 string
}

export interface Character {
  id: string;
  name: string;
  role: string;
  lookPrompt: string;
  image?: string; // base64 string
  bio?: string;
  isLoadingImage?: boolean;
  isLoadingBio?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface Place {
  title: string;
  uri: string;
}

export interface ScriptLine {
  id: string;
  characterId: string; // 'narrator' or character.id
  line: string;
  audio?: string; // base64 string
  isGeneratingAudio?: boolean;
}