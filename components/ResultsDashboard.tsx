
import React from 'react';
import { Scheme, UserState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ExternalLink, CheckCircle2, RefreshCw, TrendingUp } from 'lucide-react';

interface ResultsDashboardProps {
  schemes: Scheme[];
  userState: UserState;
  onReset: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ schemes, userState, onReset }) => {
  const chartData = [
    { name: 'Initial', score: userState.initialConfidence || 0 },
    { name: 'Final', score: userState.finalConfidence || 0 }
  ];

  const delta = (userState.finalConfidence || 0) - (userState.initialConfidence || 0);
  const isImproved = delta > 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* Profile Summary */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">User Profile</h2>
          <div className="flex flex-wrap gap-2">
            <Badge label={`Name: ${userState.name || 'Anonymous'}`} />
            <Badge label={`Occupation: ${userState.occupation || 'Not specified'}`} />
            <Badge label={`Income: ${userState.incomeLevel || 'Private'}`} />
          </div>
        </div>
        <button 
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Start New Search
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Schemes List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Recommended Schemes</h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase">
              {schemes.length} Results
            </span>
          </div>
          
          <div className="space-y-4">
            {schemes.map((scheme) => (
              <div 
                key={scheme.id}
                className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-default"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {scheme.title}
                  </h3>
                  <a 
                    href={scheme.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
                <p className="text-slate-600 mb-4 line-clamp-2">
                  {scheme.description}
                </p>
                <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Eligibility</span>
                    <p className="text-sm text-slate-700">{scheme.eligibility}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Analytics */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Confidence Delta</h2>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Net Improvement</p>
                <p className={`text-3xl font-black ${isImproved ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {isImproved ? `+${delta}` : delta}
                </p>
              </div>
              <div className={`p-3 rounded-2xl ${isImproved ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-500'}`}>
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
                  <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#cbd5e1' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
               <p className="text-xs text-slate-400 leading-relaxed italic">
                 "Confidence Delta" measures how much more empowered the user feels after receiving tailored scheme recommendations from our AI.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Badge: React.FC<{ label: string }> = ({ label }) => (
  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold whitespace-nowrap">
    {label}
  </span>
);
