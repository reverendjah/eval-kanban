import { useCallback } from 'react';
import clsx from 'clsx';
import { useChat } from '../hooks/useChat';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { Spinner } from './ui';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onChatChunk: (handler: (content: string, isComplete: boolean) => void) => void;
  onChatError: (handler: (error: string) => void) => void;
}

export function ChatSidebar({ isOpen, onToggle, onChatChunk, onChatError }: ChatSidebarProps) {
  const chat = useChat({
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Register WebSocket handlers
  onChatChunk(chat.handleChatChunk);
  onChatError(chat.handleChatError);

  const handleSend = useCallback((content: string, image?: string | null) => {
    chat.sendMessage(content, image);
  }, [chat]);

  const handleClearHistory = useCallback(() => {
    if (confirm('Clear all chat history?')) {
      chat.clearHistory();
    }
  }, [chat]);

  return (
    <>
      {/* Toggle button (visible when closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed right-4 top-20 z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Open Chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed right-0 top-0 h-full bg-[#1e293b] border-l border-gray-700 shadow-xl z-50',
          'flex flex-col transition-all duration-300',
          isOpen ? 'w-96' : 'w-0 overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 className="text-white font-semibold">Claude Chat</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Read-only</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Clear history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={onToggle}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {chat.isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner />
          </div>
        ) : chat.error ? (
          <div className="flex-1 flex items-center justify-center text-red-400 p-4 text-center">
            <div>
              <p>Failed to load chat history</p>
              <button
                onClick={() => chat.refetch()}
                className="mt-2 text-sm text-blue-400 hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <>
            <ChatMessages
              messages={chat.messages}
              streamingContent={chat.streamingContent}
              isStreaming={chat.isStreaming}
            />
            <ChatInput
              onSend={handleSend}
              disabled={chat.isSending || chat.isStreaming}
              placeholder={chat.isStreaming ? 'Claude is typing...' : 'Ask Claude anything...'}
            />
          </>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
