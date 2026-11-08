import React from 'react';
import SharedAttendanceHeatmap from '../SharedAttendanceHeatmap';

export const AttendanceHeatmapSection = React.memo(function AttendanceHeatmapSection({
  subjects = [],
  weeksCount = 18,
}) {
  return (
    <div className="w-full">
      <SharedAttendanceHeatmap subjects={subjects} weeksCount={weeksCount} />
    </div>
  );
});

export default AttendanceHeatmapSection;
