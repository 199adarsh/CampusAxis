import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SlidersVerticalIcon, LockKeyIcon, CheckmarkCircle02Icon } from 'hugeicons-react';

export const AI_LENGTH_MODES = [
    { id: 'min', label: 'Min', wordRange: '80-100', desc: 'Quick summary (80-100 words)', requiresPasscode: false },
    { id: 'high', label: 'High', wordRange: '100-120', desc: 'Balanced response (100-120 words)', requiresPasscode: false },
    { id: 'max', label: 'Max', wordRange: '150-180', desc: 'Detailed explanation (150-180 words)', requiresPasscode: true },
    { id: 'ultra', label: 'Ultra', wordRange: '220-250', desc: 'Comprehensive depth (220-250 words)', requiresPasscode: true },
];

const PASSCODE = 'Caxis2211';
const UNLOCK_SESSION_KEY = 'eduvault_ai_tier_unlocked';

export const isAiTierUnlocked = () => {
    try {
        return sessionStorage.getItem(UNLOCK_SESSION_KEY) === 'true';
    } catch {
        return false;
    }
};

export const setAiTierUnlocked = (unlocked = true) => {
    try {
        if (unlocked) {
            sessionStorage.setItem(UNLOCK_SESSION_KEY, 'true');
        } else {
            sessionStorage.removeItem(UNLOCK_SESSION_KEY);
        }
    } catch { /* ignore */ }
};

export const getSavedAiMode = () => {
    try {
        const saved = sessionStorage.getItem('eduvault_ai_length_mode');
        if (saved && AI_LENGTH_MODES.some(m => m.id === saved)) {
            // Verify unlock status if saved mode is max or ultra
            if ((saved === 'max' || saved === 'ultra') && !isAiTierUnlocked()) {
                return 'high';
            }
            return saved;
        }
    } catch { /* ignore */ }
    return 'high'; // default to high mode (100-120 words)
};

export const saveAiMode = (modeId) => {
    try {
        sessionStorage.setItem('eduvault_ai_length_mode', modeId);
    } catch { /* ignore */ }
};

export const AiLengthSlider = ({ currentMode, onModeChange, className }) => {
    const [showPasscodeModal, setShowPasscodeModal] = useState(false);
    const [targetMode, setTargetMode] = useState(null);
    const [passcode, setPasscode] = useState('');
    const isUnlocked = isAiTierUnlocked();

    const handleSelect = (mode) => {
        if (mode.requiresPasscode && !isUnlocked) {
            setTargetMode(mode);
            setShowPasscodeModal(true);
            return;
        }
        onModeChange(mode.id);
        saveAiMode(mode.id);
    };

    const handleUnlockSubmit = (e) => {
        e.preventDefault();
        if (passcode.trim() === PASSCODE) {
            setAiTierUnlocked(true);
            toast.success('Max & Ultra modes unlocked for this session!');
            if (targetMode) {
                onModeChange(targetMode.id);
                saveAiMode(targetMode.id);
            }
            setShowPasscodeModal(false);
            setPasscode('');
        } else {
            toast.error('Incorrect passcode. Please try again.');
        }
    };

    return (
        <div className={cn("relative flex items-center gap-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] p-0.5 rounded-full border border-black/5 dark:border-white/5", className)}>
            <div className="flex items-center px-1.5 py-0.5 text-[10px] font-medium text-[#8E8E93] select-none">
                <SlidersVerticalIcon size={11} className="mr-1" />
                <span className="hidden sm:inline">Tokens:</span>
            </div>

            {AI_LENGTH_MODES.map((mode) => {
                const isActive = currentMode === mode.id;
                const isLocked = mode.requiresPasscode && !isUnlocked;

                return (
                    <button
                        key={mode.id}
                        type="button"
                        onClick={() => handleSelect(mode)}
                        title={`${mode.label}: ${mode.desc} ${isLocked ? '(Passcode required)' : ''}`}
                        className={cn(
                            "px-2 py-0.5 text-[10.5px] font-medium rounded-full transition-all duration-150 flex items-center gap-0.5 cursor-pointer select-none",
                            isActive
                                ? "bg-white dark:bg-[#1C1C1E] text-[#0071E3] font-semibold shadow-2xs"
                                : "text-[#6E6E73] dark:text-[#AEAEB2] hover:text-[#1D1D1F] dark:hover:text-white"
                        )}
                    >
                        <span>{mode.label}</span>
                        {isLocked ? (
                            <LockKeyIcon size={9} className="opacity-70 text-amber-500" />
                        ) : (
                            <span className="text-[9px] opacity-60">({mode.wordRange.split('-')[1]})</span>
                        )}
                    </button>
                );
            })}

            {/* Passcode Modal Dialog */}
            {showPasscodeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-5 max-w-xs w-full shadow-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <LockKeyIcon size={16} />
                            </div>
                            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                                Unlock {targetMode?.label} Mode
                            </h3>
                        </div>
                        <p className="text-xs text-[#6E6E73] dark:text-[#AEAEB2] mb-3 leading-relaxed">
                            {targetMode?.desc}. Enter the passcode to enable extended generation for this session.
                        </p>

                        <form onSubmit={handleUnlockSubmit} className="space-y-3">
                            <input
                                type="password"
                                autoFocus
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                placeholder="Enter passcode"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D2D2D7] dark:border-[#38383A] bg-transparent text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                            />
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setShowPasscodeModal(false); setPasscode(''); }}
                                    className="px-3 py-1 text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1 text-xs font-medium rounded-lg bg-[#0071E3] hover:bg-[#0077ED] text-white transition-colors cursor-pointer shadow-xs"
                                >
                                    Unlock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
