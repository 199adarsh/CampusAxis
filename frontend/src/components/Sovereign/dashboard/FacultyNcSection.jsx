import React from 'react';
import {
  CheckmarkBadge01Icon,
  Refresh01Icon,
  Search01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  File01Icon,
} from 'hugeicons-react';
import { cn } from '../../../lib/utils';
import { formatName, getInitials } from './dashboardUtils';
import NcReviewModal from './NcReviewModal';

export const FacultyNcCard = React.memo(function FacultyNcCard({
  req,
  reviewingReq,
  reviewDecision,
  setReviewDecision,
  reviewComment,
  setReviewComment,
  onStartReview,
  onCloseReview,
  onSaveDecision,
  isSubmittingReview,
  onViewProof,
  getNcProofUrl,
}) {
  const courseDisplay = Array.from(new Set((req.missedSubjects || []).map(m => m?.subjectName || m?.name || m).filter(Boolean))).join(' · ');
  const isApproved = req.status === 'APPROVED';
  const isRejected = req.status === 'REJECTED';
  const isPending = req.status === 'PENDING';
  const isReviewingThis = reviewingReq && reviewingReq.id === req.id;

  return (
    <div className="p-4 rounded-xl border border-[#E5E5EA] bg-white text-xs space-y-3 hover:border-[#D2D2D7] transition shadow-xs">
      {/* Student Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[10px] font-semibold text-[#1D1D1F] shrink-0">
            {getInitials(req.studentName)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-[#1D1D1F] truncate">{formatName(req.studentName)}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F5F5F7] text-[#6E6E73] border border-[#E5E5EA]">
                {req.studentPrn}
              </span>
            </div>
            <p className="text-[11px] text-[#6E6E73] truncate mt-0.5">
              {courseDisplay || 'Course Absence'}
            </p>
          </div>
        </div>
        <span className={cn(
          "px-2.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0",
          isApproved ? 'bg-[#EAF9EE] text-[#1B7F37] border-[#C6EFD2]' :
            isRejected ? 'bg-[#FDF2F2] text-[#D32F2F] border-[#F8C8C8]' :
              'bg-[#FFF8E6] text-[#B25E00] border-[#FFE29A]'
        )}>
          {isApproved ? 'Approved' : isRejected ? 'Declined' : 'Pending Review'}
        </span>
      </div>

      {/* Request Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-1 border-t border-[#E5E5EA]/60">
        <div className="md:col-span-8 space-y-1">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="font-medium text-[#1D1D1F]">{req.reason}</span>
            <span className="text-[#D2D2D7]">•</span>
            <span className="text-[#6E6E73] font-mono text-[11px]">{(req.absentDates || []).join(', ')}</span>
          </div>
          {req.description && (
            <p className="text-[11px] text-[#6E6E73] italic">"{req.description}"</p>
          )}
          {req.reviewComment && (
            <p className="text-[10px] text-[#6E6E73] flex items-center gap-1.5 pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B7F37] shrink-0" />
              <span>
                <strong className="font-medium text-[#1D1D1F]">{req.reviewedBy || 'Faculty'}:</strong> "{req.reviewComment}"
              </span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="md:col-span-4 flex items-center justify-start md:justify-end gap-2 shrink-0 self-center">
          {req.proofFileName && (
            <button
              type="button"
              onClick={() => onViewProof(getNcProofUrl(req), req.proofFileName)}
              className="text-[#1D1D1F] hover:text-[#0071E3] font-medium inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] transition cursor-pointer"
            >
              <File01Icon size={13} />
              <span>Proof</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onStartReview(req)}
            className={cn(
              "px-3 py-1 rounded-lg font-medium text-[11px] transition cursor-pointer",
              isPending
                ? "bg-[#0071E3] hover:bg-[#005BB5] text-white shadow-xs"
                : "bg-white hover:bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] border border-[#E5E5EA]"
            )}
          >
            {isPending ? 'Review' : 'Update'}
          </button>
        </div>
      </div>

      {/* Inline Review Drawer */}
      {isReviewingThis && (
        <NcReviewModal
          isOpen={true}
          reviewingReq={reviewingReq}
          reviewDecision={reviewDecision}
          setReviewDecision={setReviewDecision}
          reviewComment={reviewComment}
          setReviewComment={setReviewComment}
          onSaveDecision={onSaveDecision}
          onClose={onCloseReview}
          isSubmittingReview={isSubmittingReview}
        />
      )}
    </div>
  );
});

export const FacultyNcSection = React.memo(function FacultyNcSection({
  ncStats = { total: 0, pending: 0, approved: 0, rejected: 0 },
  ncFilterStatus,
  setNcFilterStatus,
  ncSearchQuery,
  setNcSearchQuery,
  filteredFacultyNc = [],
  facultyNcLoading,
  fetchFacultyNc,
  reviewingReq,
  reviewDecision,
  setReviewDecision,
  reviewComment,
  setReviewComment,
  onStartReview,
  onCloseReview,
  onSaveDecision,
  isSubmittingReview,
  onViewProof,
  getNcProofUrl,
}) {
  return (
    <section className="bg-white rounded-xl p-5 border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4" id="faculty-nc-hub">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#E5E5EA] gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA] flex items-center justify-center shrink-0">
            <CheckmarkBadge01Icon size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-[#1D1D1F]">Student Leave Requests</h2>
            <span className="text-xs text-[#6E6E73]">Review medical and academic absence submissions</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ncStats.pending > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FFF8E6] text-[#B25E00] border border-[#FFE29A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F0A]" />
              <span className="tabular-nums font-semibold">{ncStats.pending}</span> pending
            </span>
          )}
          <button
            onClick={fetchFacultyNc}
            disabled={facultyNcLoading}
            className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] border border-[#E5E5EA] transition cursor-pointer disabled:opacity-50"
            title="Refresh Submissions"
          >
            <Refresh01Icon size={14} className={facultyNcLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
        <div className="inline-flex items-center p-1 rounded-lg bg-[#F5F5F7] border border-[#E5E5EA] overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'All', count: ncStats.total },
            { id: 'PENDING', label: 'Pending', count: ncStats.pending },
            { id: 'APPROVED', label: 'Approved', count: ncStats.approved },
            { id: 'REJECTED', label: 'Rejected', count: ncStats.rejected }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setNcFilterStatus(tab.id)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                ncFilterStatus === tab.id
                  ? "bg-white text-[#1D1D1F] font-semibold shadow-xs"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "text-[10px] tabular-nums px-1.5 py-0.2 rounded-full",
                ncFilterStatus === tab.id
                  ? "bg-[#F5F5F7] text-[#1D1D1F]"
                  : "text-[#8E8E93]"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-52">
          <input
            type="text"
            value={ncSearchQuery}
            onChange={(e) => setNcSearchQuery(e.target.value)}
            placeholder="Search student or PRN..."
            className="w-full text-xs pl-7 pr-7 py-1.5 rounded-lg bg-white border border-[#E5E5EA] text-[#1D1D1F] placeholder:text-[#8E8E93] focus:outline-none focus:border-[#0071E3] transition"
          />
          <Search01Icon size={13} className="text-[#8E8E93] absolute left-2.5 top-1/2 -translate-y-1/2" />
          {ncSearchQuery && (
            <button
              type="button"
              onClick={() => setNcSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#1D1D1F] p-0.5 cursor-pointer"
            >
              <Cancel01Icon size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-2.5 max-h-[500px] overflow-y-auto no-scrollbar">
        {facultyNcLoading ? (
          <div className="py-12 text-center text-xs text-[#6E6E73]">Loading submissions...</div>
        ) : filteredFacultyNc.length === 0 ? (
          <div className="py-10 text-center bg-[#FBFBFD] rounded-xl border border-dashed border-[#E5E5EA] p-6">
            <CheckmarkCircle01Icon size={28} className="text-[#34C759] mx-auto mb-2 opacity-80" />
            <p className="text-xs font-semibold text-[#1D1D1F]">All caught up</p>
            <p className="text-[11px] text-[#6E6E73] mt-0.5 max-w-xs mx-auto">
              {ncSearchQuery ? 'No student requests match your search criteria.' : 'No leave requests under this filter.'}
            </p>
          </div>
        ) : (
          filteredFacultyNc.map((req) => (
            <FacultyNcCard
              key={req.id}
              req={req}
              reviewingReq={reviewingReq}
              reviewDecision={reviewDecision}
              setReviewDecision={setReviewDecision}
              reviewComment={reviewComment}
              setReviewComment={setReviewComment}
              onStartReview={onStartReview}
              onCloseReview={onCloseReview}
              onSaveDecision={onSaveDecision}
              isSubmittingReview={isSubmittingReview}
              onViewProof={onViewProof}
              getNcProofUrl={getNcProofUrl}
            />
          ))
        )}
      </div>
    </section>
  );
});

export default FacultyNcSection;
