import { useState, useRef, useEffect } from 'react';
import { CreateTaskInput, CreateTaskSchema } from '../types/task';
import { usePlanMode } from '../hooks/usePlanMode';
import { PlanModeQA } from './PlanModeQA';
import { PlanSummary } from './PlanSummary';
import { ClaudeOutputLine } from './ClaudeOutputLine';
import { Spinner } from './ui';

type ModalPhase = 'form' | 'qa' | 'summary';

// Streaming output component with auto-scroll and debug logs
function StreamingOutput({ claudeOutput, debugLogs }: { claudeOutput: string[]; debugLogs: string[] }) {
  const outputRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [claudeOutput.length]);

  useEffect(() => {
    if (debugRef.current) {
      debugRef.current.scrollTop = debugRef.current.scrollHeight;
    }
  }, [debugLogs.length]);

  return (
    <div className="flex-1 flex flex-col p-6">
      {/* Status header */}
      <div className="flex items-center gap-3 mb-4">
        <Spinner size="md" />
        <div>
          <p className="text-white font-medium">Claude is analyzing your request...</p>
          <p className="text-gray-500 text-sm">
            {claudeOutput.length > 0
              ? `Processing... (${claudeOutput.length} events received)`
              : 'Starting up...'}
          </p>
        </div>
      </div>

      {/* Progress bar animation */}
      <div className="mb-4">
        <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full animate-pulse"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Debug logs section */}
      <div className="mb-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2 text-yellow-500 text-xs font-medium">
          <span>Debug Logs</span>
        </div>
        <div
          ref={debugRef}
          className="max-h-[150px] overflow-auto font-mono text-xs text-yellow-300/80"
        >
          {debugLogs.length === 0 ? (
            <p className="text-yellow-600">No events yet...</p>
          ) : (
            debugLogs.map((log, i) => (
              <div key={i}>{log}</div>
            ))
          )}
        </div>
      </div>

      {/* Streaming output with auto-scroll */}
      <div
        ref={outputRef}
        className="flex-1 bg-gray-900 rounded-lg p-4 overflow-auto max-h-[200px]"
      >
        {claudeOutput.length === 0 ? (
          <p className="text-gray-600 text-sm italic">Waiting for Claude output...</p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 text-gray-500 text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live output</span>
            </div>
            {claudeOutput.map((line, i) => (
              <ClaudeOutputLine key={i} line={line} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => void;
  isLoading?: boolean;
}

export function CreateTaskModal({ isOpen, onClose, onSubmit, isLoading }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [planModeEnabled, setPlanModeEnabled] = useState(true);
  const [askQuestionsEnabled, setAskQuestionsEnabled] = useState(false);

  const planMode = usePlanMode({
    onTaskCreated: () => {
      handleReset();
      onClose();
    },
  });

  // Determine current phase based on plan mode state
  const getPhase = (): ModalPhase => {
    if (planMode.phase === 'questioning') return 'qa';
    if (planMode.phase === 'summary') return 'summary';
    return 'form';
  };

  const phase = getPhase();

  if (!isOpen) return null;

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setError(null);
    setAskQuestionsEnabled(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = CreateTaskSchema.safeParse({ title, description: description || undefined });
    if (!result.success) {
      setError(result.error.errors[0]?.message || 'Invalid input');
      return;
    }

    if (planModeEnabled) {
      // Start plan mode
      planMode.startPlanning(title, description || title, askQuestionsEnabled);
    } else {
      // Direct creation (current behavior)
      onSubmit(result.data);
      handleReset();
    }
  };

  const handleClose = () => {
    if (phase !== 'form') {
      planMode.cancel();
    }
    handleReset();
    onClose();
  };

  const handleExecutePlan = () => {
    planMode.execute(title, description || undefined);
  };

  // Determine modal size based on phase
  const modalSizeClass = phase === 'form'
    ? 'max-w-md'
    : 'max-w-3xl h-[80vh]';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`bg-[#1e293b] rounded-lg shadow-xl w-full ${modalSizeClass} flex flex-col overflow-hidden`}>
        {phase === 'form' && (
          <>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">New Task</h2>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Task title..."
                    autoFocus
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                    Description (prompt for Claude)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Describe the task for Claude..."
                  />
                </div>

                {/* Plan Mode Checkbox */}
                <div className="mb-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={planModeEnabled}
                      onChange={(e) => setPlanModeEnabled(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      Plan Mode
                    </span>
                    <span className="text-xs text-gray-500">
                      (Claude plans before executing)
                    </span>
                  </label>
                </div>

                {/* Ask Questions Checkbox - only visible when Plan Mode is enabled */}
                {planModeEnabled && (
                  <div className="mb-4 ml-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={askQuestionsEnabled}
                        onChange={(e) => setAskQuestionsEnabled(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                        Ask Clarifying Questions
                      </span>
                      <span className="text-xs text-gray-500">
                        (interactive interview)
                      </span>
                    </label>
                  </div>
                )}

                {error && (
                  <p className="text-red-400 text-sm mb-4">{error}</p>
                )}

                {planMode.error && (
                  <p className="text-red-400 text-sm mb-4">{planMode.error}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    disabled={isLoading || planMode.isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || planMode.isLoading}
                    className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                      planModeEnabled
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {planMode.isLoading ? (
                      <>
                        <Spinner size="sm" color="white" />
                        Starting...
                      </>
                    ) : isLoading ? (
                      'Creating...'
                    ) : planModeEnabled ? (
                      'Start Planning'
                    ) : (
                      'Create Task'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {phase === 'qa' && planMode.currentQuestions.length > 0 && !planMode.isLoading && (
          <PlanModeQA
            questions={planMode.currentQuestions}
            activeQuestionIndex={planMode.activeQuestionIndex}
            pendingAnswers={planMode.pendingAnswers}
            totalQuestionsAnswered={planMode.questionCount - planMode.currentQuestions.length}
            isLoading={planMode.isLoading}
            onAnswerChange={planMode.setQuestionAnswer}
            onGoToQuestion={planMode.goToQuestion}
            onSubmitAll={planMode.submitAllAnswers}
            onCancel={handleClose}
          />
        )}

        {phase === 'qa' && planMode.isLoading && (
          <StreamingOutput claudeOutput={planMode.claudeOutput} debugLogs={planMode.debugLogs} />
        )}

        {phase === 'summary' && planMode.summary && (
          <PlanSummary
            summary={planMode.summary}
            title={title}
            isExecuting={planMode.phase === 'executing' || planMode.isLoading}
            onExecute={handleExecutePlan}
            onRedo={planMode.redo}
            onCancel={handleClose}
          />
        )}

        {planMode.phase === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <div className="text-red-400 text-center">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">Something went wrong</p>
              <p className="text-sm text-gray-400 mt-1">{planMode.error}</p>
            </div>

            {/* Show progress info if questions were answered */}
            {planMode.questionCount > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                <p className="text-green-400 text-sm">
                  {planMode.questionCount} questions answered will be preserved
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              {/* Show Resume button if there's history to preserve */}
              {planMode.questionCount > 0 && (
                <button
                  onClick={() => planMode.resume()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                >
                  Continue from where I stopped
                </button>
              )}

              <button
                onClick={() => planMode.startPlanning(title, description || title, askQuestionsEnabled)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
