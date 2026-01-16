
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Scheme, UserState, TranscriptionItem } from '../types';
import { Mic, MicOff, X, MessageCircle } from 'lucide-react';

interface VoiceSessionProps {
  onSchemesFound: (schemes: Scheme[]) => void;
  onUserUpdate: (update: Partial<UserState>) => void;
  onAddTranscription: (role: 'user' | 'model', text: string) => void;
  transcriptions: TranscriptionItem[];
  onClose: () => void;
  onError: (msg: string) => void;
}

// Function declarations for the Gemini model
const showSchemesDeclaration: FunctionDeclaration = {
  name: 'show_schemes',
  parameters: {
    type: Type.OBJECT,
    description: 'Call this when you have gathered all necessary information and are ready to present the list of eligible schemes to the user.',
    properties: {
      schemes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            eligibility: { type: Type.STRING },
            url: { type: Type.STRING }
          },
          required: ['id', 'title', 'description', 'eligibility', 'url']
        },
        description: 'A list of 3-5 government or social support schemes that match the user profile.'
      }
    },
    required: ['schemes']
  }
};

const updateUserInfoDeclaration: FunctionDeclaration = {
  name: 'update_user_info',
  parameters: {
    type: Type.OBJECT,
    description: 'Update specific user details as you gather them during the conversation.',
    properties: {
      name: { type: Type.STRING },
      age: { type: Type.NUMBER },
      location: { type: Type.STRING },
      occupation: { type: Type.STRING },
      incomeLevel: { type: Type.STRING },
      needs: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  }
};

const setConfidenceScoreDeclaration: FunctionDeclaration = {
  name: 'set_confidence_score',
  parameters: {
    type: Type.OBJECT,
    description: 'Set the user confidence score (1-10). Use "initial" for the very first question assessment and "final" after displaying schemes.',
    properties: {
      type: { type: Type.STRING, enum: ['initial', 'final'] },
      score: { type: Type.NUMBER, description: 'Score from 1 to 10' }
    },
    required: ['type', 'score']
  }
};

export const VoiceSession: React.FC<VoiceSessionProps> = ({ 
  onSchemesFound, 
  onUserUpdate, 
  onAddTranscription,
  transcriptions,
  onClose,
  onError
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Ref handles for Audio/API
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  // Buffer state for transcription
  const currentInRef = useRef('');
  const currentOutRef = useRef('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  const initSession = useCallback(async () => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key is missing");

      const ai = new GoogleGenAI({ apiKey });
      
      // Setup Audio Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Professional female voice
          },
          systemInstruction: `
            You are "Kore", a professional and warm female AI assistant for the SchemeFinder platform.
            Your goal is to find relevant government and social schemes for the user.
            
            STRUCTURE OF CONVERSATION:
            1. WELCOME: Greet the user warmly.
            2. Q1 (Confidence & Intro): Ask for their name and their current situation. ALSO, ask them on a scale of 1-10, how confident they are that they can find the support they need.
            3. Q2-Q5 (Data Gathering): Ask about Age, Occupation, Income Level, and specific areas of concern (e.g., healthcare, education, housing).
            4. ACTION: Once you have enough info, call 'show_schemes' with a list of real-looking but generated data relevant to their profile.
            5. FINAL ASSESS: After presenting schemes, briefly describe them and then ask for their confidence level again (1-10) to see if you helped.
            
            RULES:
            - Keep responses concise but empathetic.
            - Always use the tools provided to track state.
            - Speak naturally as if on a phone call.
            - Use the 'update_user_info' tool as soon as you get a piece of data.
            - Use 'set_confidence_score' immediately after the user gives their 1-10 rating.
          `,
          tools: [{ functionDeclarations: [showSchemesDeclaration, updateUserInfoDeclaration, setConfidenceScoreDeclaration] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            console.log('Voice session opened');
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcriptions
            if (message.serverContent?.outputTranscription) {
              currentOutRef.current += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentInRef.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              if (currentInRef.current) onAddTranscription('user', currentInRef.current);
              if (currentOutRef.current) onAddTranscription('model', currentOutRef.current);
              currentInRef.current = '';
              currentOutRef.current = '';
              setIsThinking(false);
            }

            // Handle Audio Data
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsThinking(false);
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.onended = () => sourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            // Handle Tool Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                console.log('Tool Call:', fc.name, fc.args);
                
                if (fc.name === 'show_schemes') {
                  onSchemesFound((fc.args as any).schemes);
                } else if (fc.name === 'update_user_info') {
                  onUserUpdate(fc.args);
                } else if (fc.name === 'set_confidence_score') {
                  const { type, score } = fc.args as any;
                  onUserUpdate(type === 'initial' ? { initialConfidence: score } : { finalConfidence: score });
                }

                sessionPromise.then(session => {
                  session.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } }
                  });
                });
              }
            }
          },
          onerror: (e) => {
            console.error('Session Error:', e);
            onError("Failed to maintain session connection.");
          },
          onclose: () => {
            console.log('Session Closed');
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error(err);
      onError(err.message || "An error occurred starting the voice session.");
    }
  }, [onSchemesFound, onUserUpdate, onAddTranscription, isMuted, onError]);

  useEffect(() => {
    initSession();
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
      if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    };
  }, []);

  // Audio helpers
  function decode(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      const chData = buffer.getChannelData(ch);
      for (let i = 0; i < frameCount; i++) chData[i] = dataInt16[i * numChannels + ch] / 32768.0;
    }
    return buffer;
  }

  function createBlob(data: Float32Array) {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' };
  }

  return (
    <div className="flex flex-col h-[70vh] max-w-4xl mx-auto w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-500">
      {/* Voice Visualization & Status */}
      <div className="bg-slate-900 p-8 flex flex-col items-center justify-center space-y-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center justify-center h-32 w-full">
           <div className="flex items-center gap-1.5 h-16">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 bg-blue-500 rounded-full animate-pulse`}
                  style={{ 
                    height: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.1}s`,
                    opacity: isThinking ? 0.3 : 1
                  }}
                ></div>
              ))}
           </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-white font-semibold text-lg">Speaking with Kore</h3>
          <p className="text-slate-400 text-sm">Ask about scheme eligibility or support</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all duration-300 ${isMuted ? 'bg-red-500/20 text-red-500 ring-4 ring-red-500/10' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Transcription Area */}
      <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col">
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-2">
           <MessageCircle className="w-4 h-4 text-slate-400" />
           <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transcription</span>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {transcriptions.length === 0 && (
            <div className="flex justify-center items-center h-full">
              <p className="text-slate-400 text-sm italic">Say hello to start the conversation...</p>
            </div>
          )}
          {transcriptions.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                t.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-md' 
                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm'
              }`}>
                {t.text}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
               <div className="bg-white text-slate-400 border border-slate-200 px-4 py-2 rounded-2xl rounded-tl-none flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce delay-200"></span>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
