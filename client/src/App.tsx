import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.js';
import { Dashboard } from './pages/Dashboard.js';
import { DailySummary } from './pages/DailySummary.js';
import { Accounts } from './pages/Accounts.js';
import { Campaigns } from './pages/Campaigns.js';
import { CampaignEditor } from './pages/CampaignEditor.js';
import { LeadsView } from './pages/LeadsView.js';
import { Settings } from './pages/Settings.js';

export const App: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-slate-100 selection:bg-brand-500/30 selection:text-brand-300">
      <Sidebar />
      <main className="flex-1 min-w-0 p-8 overflow-y-auto max-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/summary" element={<DailySummary />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignEditor />} />
          <Route path="/leads" element={<LeadsView />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
};
