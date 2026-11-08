import React from 'react';
import { Calendar03Icon } from 'hugeicons-react';
import SharedAttendanceHeatmap from '../SharedAttendanceHeatmap';

export const AttendanceRadarSection = React.memo(function AttendanceRadarSection({
  subjects,
  totalSessionsRecorded = 0,
}) {
  return (
    <section className="bg-white rounded-xl p-5 sm:p-6 border border-[#E2E2E2] shadow-[0_1px_3px_rgba(0,0,0,0.02)] w-full min-w-0 overflow-hidden" id="attendance-radar">
      <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-[#E2E2E2] gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#D9ECFF] text-[#0073E6] flex items-center justify-center">
            <Calendar03Icon size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#383838]">Attendance Activity</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 text-[11px] text-[#727272] font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#30a14e]" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#DEEDFC]" />
              <span>Off Day</span>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#DEEDFC]/60 text-[#174073] border border-[#D9ECFF]">
            <span className="tabular-nums font-bold text-[#0073E6] mr-1">{totalSessionsRecorded}</span> Sessions
          </span>
        </div>
      </div>

      <div className="mt-3.5">
        <SharedAttendanceHeatmap subjects={subjects} weeksCount={18} />
      </div>
    </section>
  );
});

export default AttendanceRadarSection;
