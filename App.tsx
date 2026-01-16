
import React, { useState } from 'react';
import { VoiceSession } from './components/VoiceSession';
import { ResultsDashboard } from './components/ResultsDashboard';
import { AppStatus, Scheme, UserState, TranscriptionItem } from './types';
import { Package, ShieldCheck, Heart, Info, LayoutGrid } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [userState, setUserState] = useState<UserState>({});
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    setStatus(AppStatus.CONNECTING);
    setTranscriptions([]);
    setSchemes([]);
    setUserState({});
    setError(null);
  };

  const handleSchemesFound = (foundSchemes: Scheme[]) => {
    setSchemes(foundSchemes);
    setStatus(AppStatus.RESULTS);
  };

  const handleUserUpdate = (update: Partial<UserState>) => {
    setUserState(prev => ({ ...prev, ...update }));
  };

  const addTranscription = (role: 'user' | 'model', text: string) => {
    setTranscriptions(prev => [
      ...prev,
      { role, text, timestamp: Date.now() }
    ]);
    // Transition to Conversing once connection established
    if (status === AppStatus.CONNECTING) setStatus(AppStatus.CONVERSING);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-100">
      {/* Dynamic Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setStatus(AppStatus.IDLE)}>
            <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none mb-1">
                SchemeFinder <span className="text-blue-600">AI</span>
              </h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Public Service Hub</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <NavLink icon={<LayoutGrid className="w-4 h-4" />} label="Dashboard" />
            <NavLink icon={<Info className="w-4 h-4" />} label="About" />
            {status === AppStatus.CONVERSING && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Connected</span>
               </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        {status === AppStatus.IDLE && (
          <div className="flex flex-col items-center justify-center py-10 lg:py-20 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="max-w-3xl">
              <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-widest mb-6">
                Next-Gen Government Support
              </span>
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tight">
                Stop Searching. <br/>Start <span className="text-blue-600">Receiving.</span>
              </h2>
              <p className="text-xl text-slate-500 mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
                Our voice AI "Kore" understands your personal needs and matches you with social schemes you are eligible for in seconds.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                <FeatureCard 
                  icon={<Package className="w-6 h-6 text-blue-600" />}
                  title="Hyper-Tailored"
                  description="Proprietary matching engine for local & national schemes."
                />
                <FeatureCard 
                  icon={<Heart className="w-6 h-6 text-rose-500" />}
                  title="Human-Centric"
                  description="Natural conversation that prioritizes your comfort."
                />
                <FeatureCard 
                  icon={<TrendingUpIcon className="w-6 h-6 text-emerald-500" />}
                  title="Confidence Lift"
                  description="We track your peace of mind from start to finish."
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleStart}
                  className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-300 bg-slate-900 hover:bg-blue-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 shadow-2xl shadow-slate-200"
                >
                  Launch Voice Assistant
                  <div className="ml-3 p-1 bg-white/20 rounded-full transition-transform group-hover:translate-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </div>
                </button>
                <button className="px-10 py-5 font-bold text-slate-600 hover:text-slate-900 transition-colors">
                  View Demo
                </button>
              </div>
            </div>
          </div>
        )}

        {(status === AppStatus.CONNECTING || status === AppStatus.CONVERSING) && (
          <VoiceSession 
            onSchemesFound={handleSchemesFound}
            onUserUpdate={handleUserUpdate}
            onAddTranscription={addTranscription}
            transcriptions={transcriptions}
            onClose={() => setStatus(AppStatus.IDLE)}
            onError={(err) => { setError(err); setStatus(AppStatus.ERROR); }}
          />
        )}

        {status === AppStatus.RESULTS && (
          <ResultsDashboard 
            schemes={schemes} 
            userState={userState}
            onReset={() => setStatus(AppStatus.IDLE)}
          />
        )}

        {status === AppStatus.ERROR && (
          <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95">
             <div className="p-10 bg-white border border-red-100 rounded-[32px] max-w-md text-center shadow-xl shadow-red-500/5">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Info className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Connection Interrupted</h3>
                <p className="text-slate-500 mb-8 leading-relaxed">{error || 'Unable to establish a secure voice link at this time.'}</p>
                <button 
                  onClick={() => setStatus(AppStatus.IDLE)}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg"
                >
                  Try Again
                </button>
             </div>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-slate-200/60 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-slate-400 w-5 h-5" />
            <span className="text-sm font-bold text-slate-400">SchemeFinder AI</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">&copy; 2024 Secure Social Services. Secure and Private.</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Privacy</a>
            <a href="#" className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const NavLink: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <a href="#" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 transition-all">
    {icon}
    <span>{label}</span>
  </a>
);

const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
  </svg>
);

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="group bg-white p-8 rounded-[32px] border border-slate-200/50 shadow-sm text-left hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div className="mb-6 w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{title}</h3>
    <p className="text-sm font-medium text-slate-500 leading-relaxed">{description}</p>
  </div>
);

export default App;
