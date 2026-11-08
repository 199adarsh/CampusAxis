import React from 'react';
import { Analytics01Icon, ArrowRight01Icon } from 'hugeicons-react';
import { cn } from '../../../lib/utils';
import { isCiePending, getSubjectMaxCie } from './dashboardUtils';

export const CieSubjectCard = React.memo(function CieSubjectCard({ sub, maxCie }) {
  const pending = isCiePending(sub.cie);
  const cie = pending ? null : parseFloat(sub.cie);
  const pct = pending ? 0 : Math.min(Math.round((cie / maxCie) * 100), 100);
  const tagColor = pending
    ? "text-slate-600 bg-slate-100 border-slate-200"
    : pct >= 80
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : pct >= 60
        ? "text-[#0073E6] bg-[#D9ECFF] border-[#0073E6]/20"
        : "text-amber-700 bg-amber-50 border-amber-200";
  const statusLabel = pending ? "Pending" : pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : "Needs Imp.";

  return (
    <div className="p-2.5 rounded-lg bg-white border border-[#E2E2E2] hover:border-[#0073E6]/40 transition-colors flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-[#383838] font-sans truncate">{sub.name}</span>
          <span className="text-xs font-bold text-[#383838] tabular-nums ml-2 shrink-0">
            {pending ? (
              <span className="text-[#727272] font-normal italic text-[11px]">Pending</span>
            ) : (
              <>
                {cie} <span className="text-[10px] font-normal text-[#727272]">/ {maxCie}</span>
              </>
            )}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#DEEDFC] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0073E6] transition-all duration-300"
            style={{ width: pending ? '0%' : `${pct}%` }}
          />
        </div>
      </div>
      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0", tagColor)}>
        {statusLabel}
      </span>
    </div>
  );
});

export const CiePerformanceSection = React.memo(function CiePerformanceSection({
  displayCieList = [],
  subjectRegistry = [],
  profile,
  onOpenCiePopup,
}) {
  const semNumber = profile?.semester ? (profile.semester.match(/\d+/)?.[0] || '5') : '5';

  return (
    <section className="bg-white rounded-[12px] p-5 border border-[#E2E2E2] shadow-[0_1px_3px_rgba(0,0,0,0.02)] w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#E2E2E2] gap-3 min-w-0 w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[10px] bg-[#DEEDFC] text-[#0073E6] flex items-center justify-center shrink-0">
            <Analytics01Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[#383838] tracking-tight">
                Internal Marks (CIE)
              </h2>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#DEEDFC] text-[#174073]">
                Sem {semNumber}
              </span>
            </div>
            <p className="text-[11px] text-[#727272] truncate mt-0.5">Continuous internal evaluation</p>
          </div>
        </div>
        <button
          onClick={onOpenCiePopup}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[#0073E6] bg-white hover:bg-[#DEEDFC]/50 border border-[#D9ECFF] transition-all cursor-pointer shrink-0 shadow-2xs"
        >
          <span>View All</span>
          <ArrowRight01Icon size={13} />
        </button>
      </div>

      <div className="space-y-2">
        {displayCieList.length > 0 ? (
          displayCieList.slice(0, 4).map((sub, i) => (
            <CieSubjectCard
              key={sub.id || i}
              sub={sub}
              maxCie={getSubjectMaxCie(sub, subjectRegistry)}
            />
          ))
        ) : (
          <div className="py-5 text-center text-xs text-[#727272] bg-white border border-[#E2E2E2] rounded-lg">
            No internal marks available yet.
          </div>
        )}
      </div>
    </section>
  );
});

export default CiePerformanceSection;
