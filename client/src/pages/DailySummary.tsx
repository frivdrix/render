import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Send,
  MessageSquare,
  TrendingUp,
  Mail,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  Database,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { api } from '../services/api.js';
import { DaySummaryItem, DaySummaryLog } from '../types/index.js';

export const DailySummary: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DaySummaryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDailyData = async () => {
    try {
      const data = await api.getDailySummary();
      if (data && data.days) {
        setDays(data.days);
        if (!selectedDate && data.days.length > 0) {
          setSelectedDate(data.days[0].date);
        }
      }
    } catch (err) {
      console.error('Failed to load daily summary:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDailyData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDailyData();
  };

  const selectedDay = days.find((d) => d.date === selectedDate) || days[0];

  const filteredLogs = selectedDay?.logs?.filter((l: DaySummaryLog) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      l.toEmail.toLowerCase().includes(q) ||
      l.fromEmail.toLowerCase().includes(q) ||
      l.campaignName.toLowerCase().includes(q) ||
      l.subject.toLowerCase().includes(q)
    );
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-medium">Loading permanent daily outreach analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <CalendarDays className="w-4 h-4" />
            <span>Day-by-Day Outreach Summary</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Daily Breakdown & Reply Tracking
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Permanent day-by-day logs recording exact emails sent, replies received, and daily reply rates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Stored & Persisted</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Day Selector Pills / Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          return (
            <button
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border ${
                isSelected
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm shadow-brand-500/10'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                Day {day.dayNumber}: {day.displayDate}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {day.sentCount} sent
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Day Stats Card Grid */}
      {selectedDay && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Overview for Day {selectedDay.dayNumber}</span>
              <span className="text-sm font-normal text-slate-400">({selectedDay.displayDate})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Outbound Sent */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Outbound Sent (Today)</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Send className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">{selectedDay.sentCount}</div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                <span className="text-blue-400 font-semibold">{selectedDay.sentCount}</span> cold emails delivered on this day
              </p>
            </div>

            {/* Replies Received */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Replies Received</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">{selectedDay.repliedCount}</div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                <span className="text-emerald-400 font-semibold">{selectedDay.repliedCount}</span> prospects engaged & replied
              </p>
            </div>

            {/* Daily Reply Rate */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Daily Reply Rate</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">{selectedDay.replyRate}</div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Calculated purely for this date</span>
              </p>
            </div>

            {/* Active Inboxes Used */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Inboxes Dispatched</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">{selectedDay.totalInboxesUsed}</div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Google Workspace accounts rotated</span>
              </p>
            </div>
          </div>

          {/* Inbox Sending Distribution for this Day */}
          {selectedDay.totalInboxesUsed > 0 && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400" />
                  <span>Google Workspace Inbox Rotation Breakdown on {selectedDay.displayDate}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedDay.totalInboxesUsed} active sender(s)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(selectedDay.inboxCounts).map(([email, count]) => (
                  <div
                    key={email}
                    className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">
                        @
                      </div>
                      <span className="text-xs font-medium text-slate-200 truncate">{email}</span>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="text-sm font-bold text-white">{count}</span>
                      <span className="text-[10px] text-slate-400 ml-1">sent</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historical Day-by-Day Table */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-brand-400" />
                  <span>All-Time Day-by-Day Outreach History</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete chronological archive of all previous outreach days.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-4">Day Number</th>
                    <th className="pb-3 px-4">Date</th>
                    <th className="pb-3 px-4 text-center">Outbound Sent</th>
                    <th className="pb-3 px-4 text-center">Replies</th>
                    <th className="pb-3 px-4 text-center">Daily Reply Rate</th>
                    <th className="pb-3 px-4 text-center">Inboxes Used</th>
                    <th className="pb-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {days.map((day) => {
                    const isRowSelected = day.date === selectedDate;
                    return (
                      <tr
                        key={day.date}
                        onClick={() => setSelectedDate(day.date)}
                        className={`cursor-pointer transition-colors ${
                          isRowSelected ? 'bg-brand-500/10' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>Day {day.dayNumber}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">{day.displayDate}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-100">{day.sentCount}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                            {day.repliedCount} replies
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-extrabold text-purple-400">
                          {day.replyRate}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-300">{day.totalInboxesUsed} inboxes</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(day.date);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Sent Emails Log Feed for Selected Day */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-400" />
                  <span>Emails Dispatched on {selectedDay.displayDate}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {filteredLogs.length} of {selectedDay.logs.length} emails recorded for this day.
                </p>
              </div>

              {/* Search Filter */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search lead or sender..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-400 text-sm">
                  {selectedDay.logs.length === 0
                    ? `No emails were dispatched on ${selectedDay.displayDate} yet.`
                    : 'No emails match your search filter.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="pb-3 px-4">Time</th>
                      <th className="pb-3 px-4">Prospect Email</th>
                      <th className="pb-3 px-4">Sender Inbox</th>
                      <th className="pb-3 px-4">Campaign</th>
                      <th className="pb-3 px-4">Subject</th>
                      <th className="pb-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                          {new Date(log.sentAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white truncate max-w-[180px]">
                          {log.toEmail}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300 font-mono truncate max-w-[180px]">
                          {log.fromEmail}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400 truncate max-w-[140px]">
                          {log.campaignName}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300 truncate max-w-[200px]">
                          {log.subject}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{log.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
