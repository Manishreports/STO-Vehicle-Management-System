import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { SystemAlert } from '../types/models';

interface AlertsBannerProps {
  alerts: SystemAlert[];
}

export const AlertsBanner: React.FC<AlertsBannerProps> = ({ alerts }) => {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((alert) => {
        const isError = alert.type === 'ERROR';
        const isWarning = alert.type === 'WARNING';

        return (
          <div
            key={alert.id}
            className={`border rounded p-3 text-xs flex items-start justify-between gap-3 shadow-xs ${
              isError
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : isWarning
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-blue-50 border-blue-300 text-blue-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isError ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-bold tracking-wide uppercase text-[11px] mb-0.5">
                  {alert.title}
                </h4>
                <p className="text-slate-700 leading-relaxed font-sans">{alert.message}</p>
                {alert.relatedPlanIds && alert.relatedPlanIds.length > 0 && (
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-600">Affected Plans:</span>
                    {alert.relatedPlanIds.map((pid) => (
                      <span
                        key={pid}
                        className="bg-white border border-rose-200 text-rose-800 px-1.5 py-0.2 rounded font-mono text-[11px]"
                      >
                        {pid}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0">
              {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      })}
    </div>
  );
};
