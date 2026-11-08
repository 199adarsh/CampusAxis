import React from 'react';
import { Megaphone01Icon, ArrowRight01Icon } from 'hugeicons-react';

export const AnnouncementCard = React.memo(function AnnouncementCard({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      className="p-3 rounded-lg bg-white border border-[#E2E2E2] hover:border-[#0073E6] hover:shadow-2xs transition-all cursor-pointer group flex items-start gap-3"
    >
      <div className="w-9 h-9 rounded-md bg-[#DEEDFC]/60 border border-[#D9ECFF] flex flex-col items-center justify-center shrink-0 text-[#174073]">
        <span className="text-[9px] uppercase font-bold text-[#0073E6] leading-none">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { month: 'short' }) : 'Oct'}
        </span>
        <span className="text-xs font-bold leading-none mt-0.5 tabular-nums text-[#174073]">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit' }) : '14'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[#DEEDFC] text-[#174073]">
            {item.type || 'Notice'}
          </span>
          {item.deadline && (
            <span className="text-[10px] font-medium text-[#E11D48]">
              Due {new Date(item.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        <h3 className="text-xs font-semibold text-[#383838] font-sans group-hover:text-[#0073E6] transition-colors truncate mt-1">
          {item.title}
        </h3>
      </div>

      <ArrowRight01Icon size={14} className="text-[#727272] group-hover:text-[#0073E6] group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
    </div>
  );
});

export const AnnouncementsSection = React.memo(function AnnouncementsSection({
  announcements = [],
  onNavigateAnnouncements,
}) {
  return (
    <section className="hidden lg:flex flex-col justify-between bg-white rounded-[12px] p-5 border border-[#E2E2E2] shadow-[0_1px_3px_rgba(0,0,0,0.02)] w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#E2E2E2] gap-3 min-w-0 w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[10px] bg-[#DEEDFC] text-[#0073E6] flex items-center justify-center shrink-0">
            <Megaphone01Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[#383838] tracking-tight">
                Campus Announcements
              </h2>
              {announcements && announcements.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#D9ECFF] text-[#0073E6] tabular-nums">
                  {announcements.length}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#727272] truncate mt-0.5">Official circulars &amp; academic notices</p>
          </div>
        </div>
        <button
          onClick={onNavigateAnnouncements}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[#0073E6] bg-white hover:bg-[#DEEDFC]/50 border border-[#D9ECFF] transition-all cursor-pointer shrink-0 shadow-2xs"
        >
          <span>View All</span>
          <ArrowRight01Icon size={13} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-2">
        {announcements && announcements.length > 0 ? (
          announcements.slice(0, 2).map((item, idx) => (
            <AnnouncementCard
              key={item.id || idx}
              item={item}
              onClick={onNavigateAnnouncements}
            />
          ))
        ) : (
          <div className="py-6 text-center text-xs text-[#727272] bg-white border border-[#E2E2E2] rounded-lg">
            No active campus announcements.
          </div>
        )}
      </div>
    </section>
  );
});

export default AnnouncementsSection;
