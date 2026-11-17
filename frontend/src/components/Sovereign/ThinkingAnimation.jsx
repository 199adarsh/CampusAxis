'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SparklesIcon, Layers01Icon, Book02Icon, File01Icon } from 'hugeicons-react';

const THINKING_STEPS = [
  'Deconstructing academic question & intent...',
  'Scanning vector index across syllabus notes...',
  'Extracting relevant passages & grounding citations...',
  'Synthesizing final verified academic answer...',
];

export const ThinkingAnimation = ({
  activeSubject,
  selectedUnits = ['all'],
  attachedFiles = [],
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 100) / 10);
    }, 100);

    const stepTimer = setInterval(() => {
      setStepIndex((prev) => (prev < THINKING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);

    return () => {
      clearInterval(timer);
      clearInterval(stepTimer);
    };
  }, []);

  const unitsText =
    selectedUnits.length > 0 && !selectedUnits.includes('all')
      ? selectedUnits.join(', ')
      : 'All Units';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/90 dark:bg-[#1C1C1E]/90 p-4 shadow-sm backdrop-blur-md"
    >
      {/* Top subtle shimmer progress line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-transparent via-[#0071E3] to-transparent w-1/3"
          animate={{ x: ['-100%', '350%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="flex items-start gap-3">
        {/* Animated Reasoning Beacon */}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#3898FF]">
          <SparklesIcon size={16} />
          {/* Gentle breathing ring */}
          <span className="absolute inset-0 rounded-xl border border-[#0071E3]/30 animate-ping opacity-25" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                Reasoning & Retrieving
              </span>
              {/* Audio/waveform equalizer bars */}
              <div className="flex items-center gap-[2.5px] h-3.5">
                {[0, 1, 2, 3].map((bar) => (
                  <motion.span
                    key={bar}
                    className="w-[2px] rounded-full bg-[#0071E3]"
                    animate={{ height: ['4px', '14px', '6px'] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: bar * 0.15,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Elapsed Timer */}
            <span className="font-mono text-[11px] text-[#8E8E93] dark:text-[#6E6E73]">
              {elapsed.toFixed(1)}s
            </span>
          </div>

          {/* Stepped Text Transition */}
          <div className="h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={stepIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="text-xs text-[#6E6E73] dark:text-[#AEAEB2] truncate"
              >
                {THINKING_STEPS[stepIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Grounding Context Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
            {activeSubject && (
              <span className="inline-flex items-center gap-1 rounded-md bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                <Book02Icon size={11} className="text-[#0071E3]" />
                <span className="truncate max-w-[150px]">{activeSubject.name}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded-md bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              <Layers01Icon size={11} className="text-emerald-500" />
              <span>Scope: {unitsText}</span>
            </span>

            {attachedFiles.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#3898FF] px-2 py-0.5 text-[10px] font-medium">
                <File01Icon size={11} />
                <span>{attachedFiles.length} files attached</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ThinkingAnimation;
