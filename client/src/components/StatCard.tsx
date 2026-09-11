import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'neutral' | 'negative';
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'rose';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'positive',
  color = 'blue',
}) => {
  const iconBgMap = {
    blue: 'bg-brand-500/20 text-brand-400',
    green: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 text-purple-400',
    rose: 'bg-rose-500/20 text-rose-400',
  };

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden transition-all duration-200 glass-card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-black text-white tracking-tight">{value}</h3>
            {trend && (
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  trendType === 'positive'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : trendType === 'negative'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {trend}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
        </div>

        <div className={`p-3 rounded-xl ${iconBgMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
