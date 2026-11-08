import React from 'react';
import {
  BarChartIcon,
  Analytics01Icon,
  Download01Icon,
  HourglassIcon,
} from 'hugeicons-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { getSubjectAbbreviation } from '../../../lib/attendanceUtils';
import { formatName, getDepartmentName, isCiePending, getSubjectMaxCie } from './dashboardUtils';

export const CieBreakdownModal = React.memo(function CieBreakdownModal({
  isOpen,
  onClose,
  profile,
  subjectRegistry = [],
  cieStats = { evaluatedCount: 0, pendingCount: 0, totalMarks: 0, totalMax: 0, percentage: null, highScorers: 0 },
  cieCardRef,
  cieExportRef,
  onExportCie,
  exportingCie,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-[#E2E2E2] rounded-2xl overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Exportable Canvas Container */}
        <div ref={cieCardRef} className="bg-white text-[#383838] flex flex-col overflow-hidden">
          {/* Modal Header with Student Identity Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-[#E2E2E2] gap-3 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D9ECFF] text-[#0073E6] flex items-center justify-center shrink-0 border border-[#D9ECFF]">
                <BarChartIcon size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[#383838]">Internal Assessment Scores</h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-[#DEEDFC] text-[#174073] border border-[#D9ECFF]">
                    {profile?.semester || 'Semester'}
                  </span>
                </div>
                <p className="text-[11px] text-[#727272] font-normal mt-0.5">Continuous Internal Evaluation • Student Records</p>
              </div>
            </div>

            {/* Verified Student Badge on Exported Image */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#DEEDFC]/30 border border-[#E2E2E2] shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[#0073E6] text-white flex items-center justify-center text-xs font-semibold uppercase shrink-0">
                {profile?.name ? profile.name.charAt(0) : 'S'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#383838] truncate">
                  {formatName(profile?.name)}
                </span>
                <span className="text-[10px] text-[#727272] truncate">
                  PRN: {profile?.prn || profile?.rollNo || '-'} • {getDepartmentName(profile?.department) || profile?.department || 'Engineering'}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Stats */}
          <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 border-b border-[#E2E2E2] bg-white">
            {[
              { value: subjectRegistry.length, label: 'Enrolled Subjects' },
              {
                value: cieStats.percentage ? `${cieStats.percentage}%` : 'Pending',
                label: `Avg (${cieStats.totalMarks}/${cieStats.totalMax || 0})`
              },
              { value: cieStats.highScorers, label: 'Scored ≥80%' }
            ].map((stat, i) => (
              <div key={i} className="text-center p-2.5 bg-white rounded-lg border border-[#E2E2E2]">
                <p className="text-lg sm:text-2xl font-bold text-[#383838] tracking-tight">{stat.value}</p>
                <p className="text-[9px] sm:text-[10px] text-[#727272] uppercase tracking-wider font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Modal Chart */}
          <div className="p-3 sm:p-5 overflow-y-auto max-h-[46vh] bg-white">
            <div className="w-full overflow-x-auto pb-2">
              <div className="flex items-end justify-between gap-2 min-w-[620px] md:min-w-full min-h-[200px] p-3 sm:p-5 bg-white rounded-lg border border-[#E2E2E2]">
                {subjectRegistry.length > 0 ? (
                  subjectRegistry.map((sub, i) => {
                    const pending = isCiePending(sub.cie);
                    const cie = pending ? null : parseFloat(sub.cie);
                    const maxCie = getSubjectMaxCie(sub, subjectRegistry);
                    const heightPct = pending ? 0 : Math.min(Math.round((cie / maxCie) * 100), 100);
                    const isHigh = !pending && heightPct >= 80;
                    const isGood = !pending && heightPct >= 60;
                    return (
                      <div key={sub.id || i} className="flex-1 min-w-[48px] max-w-[72px] flex flex-col items-center gap-1.5">
                        <span className={cn(
                          "text-[11px] font-semibold whitespace-nowrap",
                          pending ? "text-[#727272]" : isHigh ? "text-emerald-600" : isGood ? "text-[#0073E6]" : "text-amber-600"
                        )}>
                          {pending ? (
                            <span className="text-[10px] text-slate-400 font-medium">-</span>
                          ) : (
                            <>
                              {cie} <span className="text-[9px] text-[#727272] font-normal">/{maxCie}</span>
                            </>
                          )}
                        </span>

                        {/* Bar container */}
                        <div className={cn(
                          "relative flex h-30 w-full items-end overflow-hidden rounded-t-xl rounded-b-xs",
                          pending ? "bg-slate-100 border border-dashed border-slate-300" : "bg-[#DEEDFC]"
                        )}>
                          {pending ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[8px] font-semibold text-slate-400 rotate-90 sm:rotate-0">N/A</span>
                            </div>
                          ) : (
                            <motion.div
                              className={cn(
                                'relative w-full rounded-t-xl rounded-b-xs transition-colors',
                                isHigh ? 'bg-emerald-500' : isGood ? 'bg-[#0073E6]' : 'bg-amber-500'
                              )}
                              initial={{ height: '0%' }}
                              animate={{ height: `${Math.max(heightPct, 14)}%` }}
                              transition={{
                                duration: 0.8,
                                delay: i * 0.08,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                            >
                              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white tabular-nums">
                                {heightPct}%
                              </span>
                            </motion.div>
                          )}
                        </div>

                        <div className="text-center flex flex-col items-center mt-1 w-full">
                          <p className="text-[10px] font-semibold text-[#383838] truncate w-full text-center" title={sub.code || sub.name}>
                            {sub.code || sub.name.substring(0, 4)}
                          </p>
                          <span className="text-[8px] text-[#727272] truncate max-w-full block" title={sub.name}>
                            {sub.name}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#727272] font-normal">No internal marks recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Modal Legend & Verification Stamp inside Card */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 border-t border-[#E2E2E2] bg-white text-[10px] text-[#727272] gap-2">
            <div className="flex items-center gap-3 uppercase tracking-wider font-medium flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                ≥80% Excellent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0073E6]" />
                ≥60% Good
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                &lt;60% Needs Improvement
              </span>
            </div>
            <span className="text-[10px] text-[#727272] font-mono">
              Internal Assessment Report • CampusAxis
            </span>
          </div>
        </div>

        {/* Dedicated Off-Screen Export Container - Identical unclipped wide layout on mobile & desktop */}
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: `${Math.max(940, (subjectRegistry?.length || 0) * 82 + 100)}px`,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: -9999
          }}
          aria-hidden="true"
        >
          <div
            ref={cieExportRef}
            style={{ width: `${Math.max(940, (subjectRegistry?.length || 0) * 82 + 100)}px` }}
            className="bg-white text-slate-900 flex flex-col p-6 rounded-2xl border border-slate-200"
          >
            {/* Header with Title + Student Identity */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-200 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                  <Analytics01Icon size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">Internal Assessment Scores</h3>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {profile?.semester || 'Semester'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">Continuous Internal Evaluation • Student Records</p>
                </div>
              </div>

              {/* Student Identity Badge */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold uppercase shrink-0 shadow-xs">
                  {profile?.name ? profile.name.charAt(0) : 'S'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-900">
                    {formatName(profile?.name)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    PRN: {profile?.prn || profile?.rollNo || '-'} • {getDepartmentName(profile?.department) || profile?.department || 'Engineering'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 my-5 p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              {[
                { value: subjectRegistry?.length || 0, label: 'Enrolled Subjects' },
                {
                  value: cieStats.percentage ? `${cieStats.percentage}%` : 'Pending',
                  label: `Average (${cieStats.totalMarks}/${cieStats.totalMax || 0})`
                },
                { value: cieStats.highScorers, label: 'Scored ≥80%' }
              ].map((stat, i) => (
                <div key={i} className="text-center p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Full unclipped chart for all subjects */}
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <div className="flex items-end justify-between gap-3 min-h-[250px] p-6 bg-slate-50/80 rounded-xl border border-slate-200">
                {(subjectRegistry || []).length > 0 ? (
                  subjectRegistry.map((sub, i) => {
                    const pending = isCiePending(sub.cie);
                    const cie = pending ? null : parseFloat(sub.cie);
                    const maxCie = getSubjectMaxCie(sub, subjectRegistry);
                    const heightPct = pending ? 0 : Math.min(Math.round((cie / maxCie) * 100), 100);
                    const isHigh = !pending && heightPct >= 80;
                    const isGood = !pending && heightPct >= 60;
                    return (
                      <div key={sub.id || i} className="flex-1 min-w-[56px] max-w-[76px] flex flex-col items-center gap-1.5">
                        <span className={cn(
                          "text-xs font-bold whitespace-nowrap",
                          pending ? "text-slate-400" : isHigh ? "text-emerald-600" : isGood ? "text-primary" : "text-amber-600"
                        )}>
                          {pending ? (
                            <span className="text-[11px] text-slate-400 font-medium">-</span>
                          ) : (
                            <>
                              {cie} <span className="text-[10px] text-slate-400 font-normal">/{maxCie}</span>
                            </>
                          )}
                        </span>

                        {/* Bar container with striped background */}
                        <div
                          className={cn(
                            "relative flex h-36 w-full items-end overflow-hidden rounded-lg",
                            pending ? "bg-slate-100 border border-dashed border-slate-300" : "bg-slate-100 border border-slate-200/50"
                          )}
                        >
                          {pending ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[9px] font-semibold text-slate-400">N/A</span>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'relative w-full rounded-t-md transition-colors',
                                isHigh ? 'bg-emerald-500 shadow-xs' : isGood ? 'bg-primary shadow-xs' : 'bg-amber-500 shadow-xs'
                              )}
                              style={{ height: `${Math.max(heightPct, 14)}%` }}
                            >
                              <div className="absolute left-1/2 top-1 h-1 w-1/3 -translate-x-1/2 rounded-full bg-white/60" />
                              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white tabular-nums drop-shadow-xs">
                                {heightPct}%
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-center flex flex-col items-center mt-1 w-full">
                          <p className="text-[11px] font-bold text-slate-900 truncate w-full text-center" title={sub.code || sub.name}>
                            {getSubjectAbbreviation(sub.name) || sub.code || sub.name?.slice(0, 8)}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate w-full text-center" title={sub.name}>
                            {sub.name}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 font-medium">No internal marks recorded yet.</p>
                )}
              </div>
            </div>

            {/* Footer with Legend & Watermark */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 text-xs text-slate-500">
              <div className="flex items-center gap-5 uppercase tracking-wider font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
                  ≥80% Excellent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                  ≥60% Good
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-600" />
                  &lt;60% Needs Improvement
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Internal Assessment Report • CampusAxis
              </span>
            </div>
          </div>
        </div>

        {/* Modal Controls / Action Bar */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-t border-[#E2E2E2] bg-white">
          <span className="text-xs text-[#727272] font-normal hidden sm:inline">
            Download your marks card with student details
          </span>
          <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto justify-end">
            <button
              onClick={onExportCie}
              disabled={exportingCie}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0073E6] hover:bg-[#4A9AF0] text-white text-xs font-medium rounded-full transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              title="Download or share marks card as image"
            >
              {exportingCie ? <HourglassIcon size={16} /> : <Download01Icon size={16} />}
              <span>{exportingCie ? 'Generating...' : 'Download Marks Card'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[#383838] text-xs font-medium rounded-full transition-colors cursor-pointer border border-[#E2E2E2]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CieBreakdownModal;
