import { useState, useEffect } from 'react';
import { PlanQuestion } from '../types/plan';
import { Spinner } from './ui';

interface PlanModeQAProps {
  questions: PlanQuestion[];
  activeQuestionIndex: number;
  pendingAnswers: Record<number, string[]>;
  totalQuestionsAnswered: number;
  isLoading: boolean;
  onAnswerChange: (questionIndex: number, answers: string[]) => void;
  onGoToQuestion: (index: number) => void;
  onSubmitAll: () => void;
  onCancel: () => void;
}

export function PlanModeQA({
  questions,
  activeQuestionIndex,
  pendingAnswers,
  totalQuestionsAnswered,
  isLoading,
  onAnswerChange,
  onGoToQuestion,
  onSubmitAll,
  onCancel,
}: PlanModeQAProps) {
  const [otherTexts, setOtherTexts] = useState<Record<number, string>>({});
  const [useOthers, setUseOthers] = useState<Record<number, boolean>>({});

  const activeQuestion = questions[activeQuestionIndex];

  // Check if a question has an answer
  const hasAnswer = (questionIndex: number) => {
    const answers = pendingAnswers[questionIndex];
    return answers && answers.length > 0;
  };

  // Check if all questions are answered
  const allAnswered = questions.every((q) => hasAnswer(q.index));

  // Get current answers for active question
  const currentAnswers = activeQuestion
    ? pendingAnswers[activeQuestion.index] || []
    : [];

  // Handle option selection for active question
  const handleOptionChange = (label: string) => {
    if (!activeQuestion) return;

    let newAnswers: string[];
    if (activeQuestion.multi_select) {
      newAnswers = currentAnswers.includes(label)
        ? currentAnswers.filter((a) => a !== label)
        : [...currentAnswers.filter((a) => !a.startsWith('Other:')), label];
    } else {
      newAnswers = [label];
      setUseOthers((prev) => ({ ...prev, [activeQuestion.index]: false }));
    }
    onAnswerChange(activeQuestion.index, newAnswers);
  };

  // Handle "Other" checkbox change
  const handleOtherChange = (checked: boolean) => {
    if (!activeQuestion) return;
    setUseOthers((prev) => ({ ...prev, [activeQuestion.index]: checked }));

    if (checked) {
      const otherValue = otherTexts[activeQuestion.index] || '';
      if (activeQuestion.multi_select) {
        // Add other to existing answers
        const filteredAnswers = currentAnswers.filter((a) => !a.startsWith('Other:'));
        if (otherValue.trim()) {
          onAnswerChange(activeQuestion.index, [...filteredAnswers, `Other: ${otherValue.trim()}`]);
        }
      } else {
        // Replace all answers with other
        if (otherValue.trim()) {
          onAnswerChange(activeQuestion.index, [`Other: ${otherValue.trim()}`]);
        } else {
          onAnswerChange(activeQuestion.index, []);
        }
      }
    } else {
      // Remove "Other:" answers
      const filteredAnswers = currentAnswers.filter((a) => !a.startsWith('Other:'));
      onAnswerChange(activeQuestion.index, filteredAnswers);
    }
  };

  // Handle other text input change
  const handleOtherTextChange = (value: string) => {
    if (!activeQuestion) return;
    setOtherTexts((prev) => ({ ...prev, [activeQuestion.index]: value }));

    if (useOthers[activeQuestion.index]) {
      if (activeQuestion.multi_select) {
        const filteredAnswers = currentAnswers.filter((a) => !a.startsWith('Other:'));
        if (value.trim()) {
          onAnswerChange(activeQuestion.index, [...filteredAnswers, `Other: ${value.trim()}`]);
        } else {
          onAnswerChange(activeQuestion.index, filteredAnswers);
        }
      } else {
        if (value.trim()) {
          onAnswerChange(activeQuestion.index, [`Other: ${value.trim()}`]);
        } else {
          onAnswerChange(activeQuestion.index, []);
        }
      }
    }
  };

  // Sync useOthers state when switching questions
  useEffect(() => {
    if (activeQuestion) {
      const hasOtherAnswer = currentAnswers.some((a) => a.startsWith('Other:'));
      setUseOthers((prev) => ({ ...prev, [activeQuestion.index]: hasOtherAnswer }));
      if (hasOtherAnswer) {
        const otherAnswer = currentAnswers.find((a) => a.startsWith('Other:'));
        if (otherAnswer) {
          setOtherTexts((prev) => ({
            ...prev,
            [activeQuestion.index]: otherAnswer.replace('Other: ', ''),
          }));
        }
      }
    }
  }, [activeQuestionIndex]);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Spinner size="lg" />
        <p className="text-gray-400 mt-4">Claude is thinking...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with question tabs */}
      <div className="border-b border-gray-700 bg-indigo-900/20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400 font-medium">Plan Mode</span>
            <span className="text-gray-500">-</span>
            <span className="text-gray-400">Interviewing</span>
            {totalQuestionsAnswered > 0 && (
              <span className="text-xs text-gray-500">
                ({totalQuestionsAnswered} answered so far)
              </span>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Question Tabs */}
        {questions.length > 1 && (
          <div className="flex gap-2 px-4 pb-3">
            {questions.map((q, idx) => {
              const isActive = idx === activeQuestionIndex;
              const isAnswered = hasAnswer(q.index);
              return (
                <button
                  key={q.index}
                  onClick={() => onGoToQuestion(idx)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : isAnswered
                      ? 'bg-green-900/30 text-green-400 border border-green-700'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span className="truncate max-w-24">{q.header}</span>
                  {isAnswered && !isActive && (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Spinner size="lg" />
            <p className="text-gray-400">Claude is thinking...</p>
          </div>
        ) : activeQuestion ? (
          <div className="max-w-2xl mx-auto">
            {/* Question Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-indigo-400 uppercase tracking-wide">
                  {activeQuestion.header}
                </span>
                <span className="text-xs text-gray-500">
                  Question {activeQuestionIndex + 1} of {questions.length}
                </span>
                {activeQuestion.multi_select && (
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                    Multiple choice
                  </span>
                )}
              </div>
              <h3 className="text-lg text-white">{activeQuestion.question}</h3>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {activeQuestion.options.map((option, index) => {
                const isSelected = currentAnswers.includes(option.label);
                return (
                  <label
                    key={index}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-900/30'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <input
                      type={activeQuestion.multi_select ? 'checkbox' : 'radio'}
                      name={`answer-${activeQuestion.index}`}
                      checked={isSelected}
                      onChange={() => handleOptionChange(option.label)}
                      className="mt-1 w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <span className="text-white font-medium">{option.label}</span>
                      {option.description && (
                        <p className="text-sm text-gray-400 mt-1">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}

              {/* Other option */}
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  useOthers[activeQuestion.index]
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                }`}
              >
                <input
                  type={activeQuestion.multi_select ? 'checkbox' : 'radio'}
                  name={`answer-${activeQuestion.index}`}
                  checked={useOthers[activeQuestion.index] || false}
                  onChange={(e) => handleOtherChange(e.target.checked)}
                  className="mt-1 w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-white font-medium">Other</span>
                  {useOthers[activeQuestion.index] && (
                    <input
                      type="text"
                      value={otherTexts[activeQuestion.index] || ''}
                      onChange={(e) => handleOtherTextChange(e.target.value)}
                      placeholder="Type your answer..."
                      className="mt-2 w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer with navigation */}
      {!isLoading && questions.length > 0 && (
        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => onGoToQuestion(activeQuestionIndex - 1)}
              disabled={activeQuestionIndex === 0}
              className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <button
              onClick={() => onGoToQuestion(activeQuestionIndex + 1)}
              disabled={activeQuestionIndex === questions.length - 1}
              className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmitAll}
              disabled={!allAnswered}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-white font-medium transition-colors flex items-center gap-2"
            >
              {allAnswered ? (
                <>
                  Submit All
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              ) : (
                <>
                  Answer all questions
                  <span className="text-xs bg-gray-600 px-1.5 py-0.5 rounded">
                    {questions.filter((q) => hasAnswer(q.index)).length}/{questions.length}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
