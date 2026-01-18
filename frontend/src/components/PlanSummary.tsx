import { Spinner } from './ui';

interface PlanSummaryProps {
  summary: string;
  title: string;
  isExecuting: boolean;
  onExecute: () => void;
  onRedo: () => void;
  onCancel: () => void;
}

export function PlanSummary({
  summary,
  title,
  isExecuting,
  onExecute,
  onRedo,
  onCancel,
}: PlanSummaryProps) {
  // Simple markdown-to-HTML for basic formatting
  const renderMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="text-lg font-semibold text-white mt-4 mb-2">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={index} className="text-xl font-bold text-white mt-4 mb-2">
              {line.slice(2)}
            </h1>
          );
        }
        // Numbered lists
        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={index} className="flex gap-2 ml-4 my-1">
              <span className="text-indigo-400">{line.match(/^\d+/)?.[0]}.</span>
              <span className="text-gray-300">{line.replace(/^\d+\.\s/, '')}</span>
            </div>
          );
        }
        // Bullet points
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={index} className="flex gap-2 ml-4 my-1">
              <span className="text-indigo-400">•</span>
              <span className="text-gray-300">{line.slice(2)}</span>
            </div>
          );
        }
        // Bold text
        if (line.includes('**')) {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={index} className="text-gray-300 my-1">
              {parts.map((part, i) =>
                i % 2 === 1 ? (
                  <strong key={i} className="text-white font-medium">
                    {part}
                  </strong>
                ) : (
                  part
                )
              )}
            </p>
          );
        }
        // Empty lines
        if (line.trim() === '') {
          return <div key={index} className="h-2" />;
        }
        // Regular text
        return (
          <p key={index} className="text-gray-300 my-1">
            {line}
          </p>
        );
      });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-indigo-900/20">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400 font-medium">Plan Mode</span>
          <span className="text-gray-500">-</span>
          <span className="text-gray-400">Summary</span>
        </div>
        <button
          onClick={onCancel}
          disabled={isExecuting}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Summary Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Implementation Plan
            </h3>
            <div className="prose prose-invert max-w-none">
              {renderMarkdown(summary)}
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-sm text-gray-400">
              This plan will be used to create a task titled{' '}
              <strong className="text-white">"{title}"</strong>. Claude will
              use this context to implement the feature.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 flex justify-between">
        <button
          onClick={onCancel}
          disabled={isExecuting}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <div className="flex gap-3">
          <button
            onClick={onRedo}
            disabled={isExecuting}
            className="px-4 py-2 border border-gray-600 hover:border-gray-500 rounded text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Redo Questions
          </button>
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 rounded text-white font-medium transition-colors flex items-center gap-2"
          >
            {isExecuting ? (
              <>
                <Spinner size="sm" color="white" />
                Creating Task...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Task
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
