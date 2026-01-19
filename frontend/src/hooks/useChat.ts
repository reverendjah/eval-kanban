import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ChatMessage } from '../types/chat';

interface UseChatOptions {
  onChunk?: (content: string) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const queryClient = useQueryClient();
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Fetch chat history
  const {
    data: messages = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['chat', 'history'],
    queryFn: api.chat.getHistory,
  });

  // Handle WebSocket chat events
  const handleChatChunk = useCallback((content: string, isComplete: boolean) => {
    if (isComplete) {
      setIsStreaming(false);
      setStreamingContent('');
      // Refetch to get the saved assistant message
      queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
      options.onComplete?.();
    } else {
      setStreamingContent(prev => prev + content + '\n');
      options.onChunk?.(content);
    }
  }, [queryClient, options]);

  const handleChatError = useCallback((error: string) => {
    setIsStreaming(false);
    setStreamingContent('');
    options.onError?.(error);
  }, [options]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, image }: { content: string; image?: string | null }) => {
      setIsStreaming(true);
      setStreamingContent('');
      return api.chat.sendMessage({ content, image });
    },
    onSuccess: (userMessage) => {
      // Add user message to cache immediately
      queryClient.setQueryData(['chat', 'history'], (old: ChatMessage[] | undefined) => {
        return [...(old || []), userMessage];
      });
    },
    onError: (error: Error) => {
      setIsStreaming(false);
      setStreamingContent('');
      options.onError?.(error.message);
    },
  });

  // Clear history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: api.chat.clearHistory,
    onSuccess: () => {
      queryClient.setQueryData(['chat', 'history'], []);
    },
  });

  const sendMessage = useCallback(async (content: string, image?: string | null) => {
    if (!content.trim() && !image) return;
    await sendMessageMutation.mutateAsync({ content, image });
  }, [sendMessageMutation]);

  const clearHistory = useCallback(async () => {
    await clearHistoryMutation.mutateAsync();
  }, [clearHistoryMutation]);

  return {
    messages,
    isLoading,
    error,
    streamingContent,
    isStreaming,
    isSending: sendMessageMutation.isPending,
    sendMessage,
    clearHistory,
    refetch,
    // Expose handlers for WebSocket integration
    handleChatChunk,
    handleChatError,
  };
}
