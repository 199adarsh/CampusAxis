'use client';

import React, { useMemo } from 'react';
import PromptBar, {
  type PromptBarProps,
  type PromptBarSource,
  type PromptBarModel,
  type PromptBarCommand,
  type PromptBarSendDetail,
} from '../PromptBar/PromptBar';
import { Book02Icon, BookOpen01Icon, Attachment01Icon } from 'hugeicons-react';

export type RobotEmotion = 'reading' | 'thinking';

export function EyeLED({
  emotion,
  isBlinking,
  offsetX,
}: {
  emotion: RobotEmotion;
  isBlinking: boolean;
  offsetX: number;
}) {
  return <div className="w-2 h-1 rounded-xs bg-emerald-400" />;
}

export function RobotBeta({
  className = '',
}: {
  emotion?: RobotEmotion;
  textLength?: number;
  isListening?: boolean;
  className?: string;
}) {
  return null;
}

export interface AiMascotInputProps {
  onSubmit?: (data: { prompt: string; agentId?: string; effort?: string }) => void;
  onSend?: () => void;
  onClear?: () => void;
  isProcessing?: boolean;
  isLoading?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  // Scope controls
  selectedSubject?: string;
  setSelectedSubject?: (val: string) => void;
  selectedUnit?: string;
  setSelectedUnit?: (val: string) => void;
  selectedUnits?: string[];
  setSelectedUnits?: (units: string[]) => void;
  availableUnits?: (number | string)[];
  allKnownSubjects?: Array<{ id: string; name: string; code?: string }>;
  subjectBucketList?: Array<{
    id: string;
    name: string;
    code?: string;
    notesCount: number;
    units: number[];
  }>;
  isInvalidSubject?: boolean;
  hasCompiledOkf?: boolean;
  compiledCount?: number;
  pendingCount?: number;
  subjectNotesCount?: number;
  onAttachFiles?: () => void;
  attachedFilesCount?: number;
  width?: number;
}

const DEFAULT_AI_MODELS: PromptBarModel[] = [
  { key: 'caxiee', name: 'Caxiee AI', tag: 'Campus' },
  { key: 'gemini', name: 'Gemini 1.5', tag: 'Deep' },
  { key: 'chatgpt', name: 'ChatGPT', tag: 'Fast' },
  { key: 'claude', name: 'Claude', tag: 'Logic' },
];

const DEFAULT_COMMANDS: PromptBarCommand[] = [
  { key: 'summarize', name: '/summarize', description: 'Digest the syllabus/notes' },
  { key: 'explain', name: '/explain', description: 'Plain-language conceptual breakdown' },
  { key: 'exam', name: '/exam', description: 'Generate high-probability exam questions' },
  { key: 'flashcards', name: '/flashcards', description: 'Create key revision bullet points' },
];

export function AiMascotInput({
  onSubmit,
  onSend,
  disabled = false,
  isProcessing = false,
  isLoading = false,
  placeholder = 'Ask anything across your enrolled syllabus...',
  className = '',
  selectedSubject = 'all',
  setSelectedSubject,
  selectedUnits = ['all'],
  setSelectedUnits,
  allKnownSubjects = [],
  subjectBucketList = [],
  onAttachFiles,
  width = 860,
}: AiMascotInputProps) {
  const sources: PromptBarSource[] = useMemo(() => {
    const list: PromptBarSource[] = [
      {
        key: 'all-subjects',
        name: 'All Enrolled Subjects',
        description: 'Search across whole syllabus',
        icon: <BookOpen01Icon size={15} />,
      },
    ];

    if (Array.isArray(allKnownSubjects)) {
      allKnownSubjects.filter(Boolean).forEach((s) => {
        const id = typeof s === 'string' ? s : s.id || s.code || s.name || 'sub';
        const name = typeof s === 'string' ? s : s.name || s.code || 'Subject';
        const desc = typeof s === 'string' ? '' : s.code ? `Course: ${s.code}` : 'Subject notes';
        list.push({
          key: id,
          name,
          description: desc,
          icon: <Book02Icon size={15} />,
        });
      });
    }

    if (onAttachFiles) {
      list.push({
        key: 'attach-device',
        name: 'Attach documents',
        description: 'Multi-file RAG upload',
        icon: <Attachment01Icon size={15} />,
        attach: true,
      });
    }

    return list;
  }, [allKnownSubjects, onAttachFiles]);

  const handlePromptSend = (text: string, detail: PromptBarSendDetail) => {
    if (!text.trim()) return;
    if (onSubmit) {
      onSubmit({ prompt: text.trim(), agentId: detail.model?.key, effort: detail.effort });
    } else if (onSend) {
      onSend();
    }
  };

  return (
    <div className={`w-full flex justify-center items-center ${className}`}>
      <PromptBar
        placeholder={placeholder}
        sources={sources}
        commands={DEFAULT_COMMANDS}
        models={[]}
        efforts={['Low', 'Medium', 'High', 'Extra', 'Max']}
        defaultEffort="High"
        busy={isProcessing || isLoading || disabled}
        onSend={handlePromptSend}
        onAttach={onAttachFiles}
        width={width}
        radius={22}
        className="w-full"
        subjectBucketList={subjectBucketList}
        selectedSubject={selectedSubject}
        onSelectSubject={setSelectedSubject}
        selectedUnits={selectedUnits}
        onSelectUnits={setSelectedUnits}
      />
    </div>
  );
}

export default AiMascotInput;
