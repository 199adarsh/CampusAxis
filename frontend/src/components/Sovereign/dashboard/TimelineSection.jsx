import React from 'react';
import {
  Calendar03Icon,
  Cancel01Icon,
  Add01Icon,
  Delete02Icon,
} from 'hugeicons-react';
import DeadlinesPopover from '../DeadlinesPopover';

// Lucide Calendar icon for buttons
const CalendarIcon = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

export const TimelineCard = React.memo(function TimelineCard({ item, index, onDelete }) {
  const itemDate = new Date(item.date);
  const month = !isNaN(itemDate.getTime()) ? itemDate.toLocaleDateString('en-US', { month: 'short' }) : 'Now';
  const day = !isNaN(itemDate.getTime()) ? itemDate.getDate() : '--';

  return (
    <div className="w-full flex items-center justify-between gap-2.5 p-3 bg-white hover:bg-slate-50 border border-border-subtle hover:border-slate-300 rounded-xl group transition-all min-w-0 overflow-hidden">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] font-bold uppercase text-primary leading-tight">{month}</span>
          <span className="text-xs font-extrabold text-text-primary leading-none">{day}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-text-primary truncate">{item.title}</p>
          {item.isAnnouncement ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Announcement Deadline
            </span>
          ) : item.description ? (
            <p className="text-[11px] text-text-secondary truncate mt-0.5">{item.description}</p>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 mt-0.5">
              Academic
            </span>
          )}
        </div>
      </div>
      {!item.isAnnouncement && (
        <button
          onClick={() => onDelete(index, item.id)}
          className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-status-danger-text transition-opacity p-1.5 rounded-lg hover:bg-slate-50 shrink-0 cursor-pointer"
          title="Delete"
        >
          <Delete02Icon size={15} />
        </button>
      )}
    </div>
  );
});

export const TimelineSection = React.memo(function TimelineSection({
  combinedTimeline = [],
  annoDeadlinesList = [],
  showHomeCalendar,
  setShowHomeCalendar,
  homeCalendarRef,
  showAddForm,
  setShowAddForm,
  newMilestone,
  setNewMilestone,
  handleAddMilestone,
  handleDeleteMilestone,
}) {
  return (
    <section className="bg-white rounded-xl p-5 sm:p-6 border border-[#E2E2E2] shadow-[0_1px_3px_rgba(0,0,0,0.02)] w-full min-w-0 overflow-visible relative">
      <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E2E2] gap-2 flex-wrap sm:flex-nowrap min-w-0 w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#D9ECFF] text-[#0073E6] flex items-center justify-center">
            <Calendar03Icon size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#383838]">Deadlines &amp; Events</h2>
            <span className="text-xs font-normal text-[#727272]">Academic Schedule</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={homeCalendarRef}>
            <button
              type="button"
              onClick={() => setShowHomeCalendar(prev => !prev)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${showHomeCalendar
                ? 'bg-[#D9ECFF] border-[#0073E6] text-[#0073E6]'
                : 'bg-white border-[#E2E2E2] hover:bg-[#DEEDFC]/40 text-[#383838]'
                }`}
              title="View Announcements Deadlines Calendar"
              aria-expanded={showHomeCalendar}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#0073E6]" />
              <span className="hidden sm:inline">Calendar</span>
              {annoDeadlinesList.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#E11D48] text-white text-[10px] font-bold">
                  {annoDeadlinesList.length}
                </span>
              )}
            </button>

            {showHomeCalendar && (
              <DeadlinesPopover
                isOpen={showHomeCalendar}
                deadlines={annoDeadlinesList}
                onClose={() => setShowHomeCalendar(false)}
                anchorRef={homeCalendarRef}
              />
            )}
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0073E6] hover:bg-[#4A9AF0] text-white text-xs font-medium whitespace-nowrap transition-all shadow-xs cursor-pointer"
          >
            {showAddForm ? <Cancel01Icon size={14} /> : <Add01Icon size={14} />}
            <span>{showAddForm ? 'Cancel' : 'Add Event'}</span>
          </button>
        </div>
      </div>

      {showAddForm ? (
        <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-border-subtle space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase">Date</label>
              <input
                type="date"
                value={newMilestone.date}
                onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                className="w-full mt-0.5 px-2.5 py-1.5 bg-surface-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase">Event Title</label>
              <input
                type="text"
                placeholder="e.g. CIE 1 Exam or Submission"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                className="w-full mt-0.5 px-2.5 py-1.5 bg-surface-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Details or notes..."
              value={newMilestone.description}
              onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
              className="flex-1 px-2.5 py-1.5 bg-surface-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleAddMilestone}
              className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors border border-primary cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      ) : combinedTimeline.length > 0 ? (
        <div className="mt-3 space-y-2">
          {combinedTimeline.map((item, i) => (
            <TimelineCard
              key={item.id || i}
              item={item}
              index={i}
              onDelete={handleDeleteMilestone}
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 p-5 rounded-xl bg-slate-50/70 border border-dashed border-border-subtle flex flex-col items-center justify-center text-center">
          <Calendar03Icon size={22} className="text-text-secondary/70 mb-1.5" />
          <p className="text-xs font-bold text-text-primary">No Upcoming Deadlines</p>
          <p className="text-[11px] text-text-secondary mt-0.5 max-w-xs text-pretty">Track key academic deadlines, lab submissions, and tests.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-border-subtle text-xs font-semibold text-text-primary transition-[transform,background-color] duration-150 ease-out active:scale-[0.96] shadow-2xs cursor-pointer"
          >
            <Add01Icon size={14} className="text-primary" />
            <span>Add Milestone</span>
          </button>
        </div>
      )}
    </section>
  );
});

export default TimelineSection;
