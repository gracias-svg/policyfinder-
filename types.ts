
export interface Scheme {
  id: string;
  title: string;
  description: string;
  eligibility: string;
  url: string;
}

export interface UserState {
  name?: string;
  age?: number;
  location?: string;
  occupation?: string;
  incomeLevel?: string;
  needs?: string[];
  initialConfidence?: number;
  finalConfidence?: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONVERSING = 'CONVERSING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}

export interface TranscriptionItem {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
