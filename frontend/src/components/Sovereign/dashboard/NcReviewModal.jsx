import React from 'react';
import { CheckmarkCircle01Icon, Cancel01Icon } from 'hugeicons-react';
import { cn } from '../../../lib/utils';
import { QUICK_NC_COMMENTS } from './dashboardUtils';

export const NcReviewModal = React.memo(function NcReviewModal({
  isOpen,
  reviewingReq,
  reviewDecision,
  setReviewDecision,
  reviewComment,
  setReviewComment,
  onSaveDecision,
  onClose,
  isSubmittingReview,
}) {
  if (!isOpen || !reviewingReq) return null;

  return (
    <div className="mt-2.5 p-3.5 rounded-xl bg-[#FBFBFD] border border-[#E5E5EA] space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-xs text-[#1D1D1F]">Record Faculty Decision</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[#8E8E93] hover:text-[#1D1D1F] p-0.5 rounded cursor-pointer"
        >
          <Cancel01Icon size={14} />
        </button>
      </div>

      {/* Decision Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setReviewDecision('APPROVED')}
          className={cn(
            "py-1.5 px-3 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 border",
            reviewDecision === 'APPROVED'
              ? "bg-[#1B7F37] text-white border-[#1B7F37] shadow-xs"
              : "bg-white text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F5F5F7]"
          )}
        >
          <CheckmarkCircle01Icon size={13} />
          <span>Approve Request</span>
        </button>
        <button
          type="button"
          onClick={() => setReviewDecision('REJECTED')}
          className={cn(
            "py-1.5 px-3 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 border",
            reviewDecision === 'REJECTED'
              ? "bg-[#D32F2F] text-white border-[#D32F2F] shadow-xs"
              : "bg-white text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F5F5F7]"
          )}
        >
          <Cancel01Icon size={13} />
          <span>Reject Request</span>
        </button>
      </div>

      {/* Quick Comment Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {QUICK_NC_COMMENTS.map((qc, qidx) => (
          <button
            key={qidx}
            type="button"
            onClick={() => setReviewComment(qc)}
            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-[#E5E5EA] text-[#6E6E73] hover:text-[#1D1D1F] hover:border-[#D2D2D7] transition cursor-pointer"
          >
            {qc}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={reviewComment}
        onChange={(e) => setReviewComment(e.target.value)}
        placeholder="Faculty feedback or reason for student..."
        className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#E5E5EA] rounded-lg text-[#1D1D1F] placeholder:text-[#8E8E93] focus:outline-none focus:border-[#0071E3]"
      />

      <div className="flex justify-end gap-2 pt-0.5">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition rounded-lg cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSaveDecision}
          disabled={isSubmittingReview}
          className="px-3.5 py-1 rounded-lg bg-[#0071E3] hover:bg-[#005BB5] text-white text-xs font-medium transition disabled:opacity-50 shadow-xs cursor-pointer"
        >
          {isSubmittingReview ? 'Saving...' : 'Save Decision'}
        </button>
      </div>
    </div>
  );
});

export default NcReviewModal;
