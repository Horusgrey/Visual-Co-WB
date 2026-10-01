
export interface StyleSeed {
  image: string; // base64 string
  mimeType: string;
  prompt: string;
}

// Project-level production bible. Field names are snake_case on purpose: they
// match the import cartridge wire format (vault/*/cartridge/*.visualco.json)
// so ingested canvases need no translation layer.
export interface WorldBible {
  project_id?: string;
  title?: string;
  tone?: string;
  visual_style?: string;
  location_rules?: string;
  time_period?: string;
  context?: string;
  aesthetic_locks?: string;
  negative_prompt?: string; // forbidden-drift rules
  locked?: boolean; // false disables injection without discarding the data
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