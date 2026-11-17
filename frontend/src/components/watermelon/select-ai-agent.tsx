'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import {
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  ChatGptIcon,
  ClaudeIcon,
  GoogleGeminiIcon,
  BotIcon,
} from 'hugeicons-react';

export interface AIAgent {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface SelectAIAgentProps {
  agents?: AIAgent[];
  onSendMessage?: (message: string, agentId: string) => void;
  className?: string;
}

const DEFAULT_AGENTS: AIAgent[] = [
  {
    id: 'caxiee',
    name: 'Caxiee',
    icon: <BotIcon size={20} />,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: <GoogleGeminiIcon size={20} />,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: <ChatGptIcon size={20} />,
  },
  {
    id: 'claude',
    name: 'Claude',
    icon: <ClaudeIcon size={20} />,
  },
];

export const SelectAIAgent: React.FC<SelectAIAgentProps> = ({
  agents = DEFAULT_AGENTS,
  onSendMessage,
  className = '',
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AIAgent>(agents[0]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [appType, setAppType] = useState<'All Syllabus' | 'Active Notes'>('All Syllabus');

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage?.(message.trim(), selectedAgent.id);
    setMessage('');
  };

  return (
    <div className={`flex w-full flex-col items-center justify-center p-2 antialiased select-none ${className}`}>
      {/* Wider and thinner container */}
      <div className="relative z-40 w-full max-w-3xl sm:max-w-4xl">
        <LayoutGroup>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  mass: 0.8,
                }}
                className="absolute -top-14 left-0 z-50 flex w-fit origin-bottom-left gap-1 rounded-full border-[1.6px] border-[#E8E7ED] bg-white/95 p-1.5 backdrop-blur-xl shadow-lg dark:border-white/10 dark:bg-neutral-900/95"
              >
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      setSelectedAgent(agent);
                      setIsMenuOpen(false);
                    }}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 cursor-pointer ${
                      selectedAgent.id === agent.id
                        ? 'border-[1.8px] border-[#E9E8EB] bg-white text-[#0071E3] shadow-xs dark:border-white/20 dark:bg-white/20 dark:text-white'
                        : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10'
                    }`}
                    title={agent.name}
                  >
                    <div className="scale-100">{agent.icon}</div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            layout
            className="rounded-[24px] sm:rounded-[28px] border border-[#E8E7EF]/80 bg-neutral-100/90 p-3 sm:px-4 sm:py-3 shadow-xs transition-all dark:border-white/10 dark:bg-neutral-900"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <motion.button
                type="button"
                layoutId={`agent-${selectedAgent.id}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-black/5 dark:border-white/10 text-neutral-800 hover:scale-105 active:scale-95 transition-transform dark:text-neutral-100 shadow-2xs"
                title={`Agent: ${selectedAgent.name}`}
              >
                {selectedAgent.icon}
              </motion.button>

              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Ask any academic question across your syllabus..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="w-full border-none bg-transparent text-sm sm:text-base font-medium text-black outline-none placeholder:text-[#9E9E9E] dark:text-white dark:placeholder:text-neutral-500"
                />
              </div>
            </div>

            <div className="mt-2.5 flex w-full items-center justify-between pt-1">
              <motion.button
                type="button"
                onClick={() =>
                  setAppType((t) =>
                    t === 'All Syllabus' ? 'Active Notes' : 'All Syllabus',
                  )
                }
                className="flex items-center gap-1.5 overflow-hidden rounded-full border border-[#E8E7EF] bg-white px-3 py-1 shadow-2xs transition-all hover:bg-neutral-50 active:scale-95 sm:px-4 sm:py-1.5 dark:border-white/5 dark:bg-neutral-800 dark:hover:bg-neutral-800/50 cursor-pointer"
              >
                <div className="relative h-4 sm:h-5 overflow-hidden">
                  <AnimatedText
                    text={appType}
                    className="text-xs font-semibold whitespace-nowrap text-[#535256] sm:text-sm dark:text-neutral-300"
                  />
                </div>

                <div className="flex flex-col -space-y-1 text-[#BDBCC3] dark:text-neutral-500">
                  <ArrowUp01Icon size={11} />
                  <ArrowDown01Icon size={11} />
                </div>
              </motion.button>

              <button
                type="button"
                title="Send prompt"
                onClick={handleSend}
                disabled={!message.trim()}
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all cursor-pointer shadow-xs ${
                  message.trim()
                    ? 'bg-neutral-900 text-white hover:scale-105 active:scale-95 dark:bg-white dark:text-black'
                    : 'bg-black/5 dark:bg-white/10 text-neutral-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <ArrowRight01Icon size={16} />
              </button>
            </div>
          </motion.div>
        </LayoutGroup>
      </div>
    </div>
  );
};

function AnimatedText({
  text,
  className,
  delayStep = 0.014,
}: {
  text: string;
  className?: string;
  delayStep?: number;
}) {
  const chars = text.split('');

  return (
    <span className={className} style={{ display: 'inline-flex' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={text} style={{ display: 'inline-flex' }}>
          {chars.map((char, i) => (
            <motion.span
              key={i}
              initial={{
                y: 8,
                opacity: 0,
                scale: 0.6,
                filter: 'blur(2px)',
              }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
                filter: 'blur(0px)',
              }}
              exit={{
                y: -8,
                opacity: 0,
                scale: 0.6,
                filter: 'blur(2px)',
              }}
              transition={{
                type: 'spring',
                stiffness: 240,
                damping: 16,
                mass: 1.2,
                delay: i * delayStep,
              }}
              style={{
                display: 'inline-block',
                whiteSpace: char === ' ' ? 'pre' : undefined,
                willChange: 'transform',
              }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default SelectAIAgent;
