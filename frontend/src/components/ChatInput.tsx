import { useState, useRef, useCallback, KeyboardEvent, ClipboardEvent } from 'react';
import clsx from 'clsx';

interface ChatInputProps {
  onSend: (content: string, image?: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export function ChatInput({ onSend, disabled, placeholder = 'Type a message...' }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!content.trim() && !image) return;
    onSend(content, image);
    setContent('');
    setImage(null);
    setImageError(null);
  }, [content, image, onSend]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handlePaste = useCallback(async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        if (file.size > MAX_IMAGE_SIZE) {
          setImageError('Image too large (max 5MB)');
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix to get just the base64
          const base64Data = base64.split(',')[1];
          setImage(base64Data);
          setImageError(null);
        };
        reader.onerror = () => {
          setImageError('Failed to read image');
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }, []);

  const removeImage = useCallback(() => {
    setImage(null);
    setImageError(null);
  }, []);

  return (
    <div className="border-t border-gray-700 p-3">
      {/* Image preview */}
      {image && (
        <div className="mb-2 relative inline-block">
          <img
            src={`data:image/png;base64,${image}`}
            alt="Attached"
            className="max-h-20 rounded border border-gray-600"
          />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Error message */}
      {imageError && (
        <div className="mb-2 text-red-400 text-xs">
          {imageError}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={clsx(
            'flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm resize-none',
            'border border-gray-600 focus:border-blue-500 focus:outline-none',
            'placeholder-gray-500',
            'min-h-[40px] max-h-[120px]',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{
            height: 'auto',
            overflowY: content.split('\n').length > 4 ? 'auto' : 'hidden',
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!content.trim() && !image)}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            disabled || (!content.trim() && !image)
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {/* Hint */}
      <div className="mt-1 text-xs text-gray-500">
        Press Enter to send, Shift+Enter for new line. Ctrl+V to paste image.
      </div>
    </div>
  );
}
