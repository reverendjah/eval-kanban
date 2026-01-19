import { describe, it, expect } from 'vitest';
import {
  ChatRoleSchema,
  ChatMessageSchema,
  ChatHistoryResponseSchema,
  SendMessageRequestSchema,
  SendMessageResponseSchema,
  ClearHistoryResponseSchema,
} from './chat';

describe('Chat Types', () => {
  describe('ChatRoleSchema', () => {
    it('should accept valid roles', () => {
      expect(ChatRoleSchema.parse('user')).toBe('user');
      expect(ChatRoleSchema.parse('assistant')).toBe('assistant');
    });

    it('should reject invalid roles', () => {
      expect(() => ChatRoleSchema.parse('admin')).toThrow();
      expect(() => ChatRoleSchema.parse('')).toThrow();
    });
  });

  describe('ChatMessageSchema', () => {
    it('should parse valid message', () => {
      const message = {
        id: '123',
        project_path: '/test/project',
        role: 'user',
        content: 'Hello',
        image_data: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      const result = ChatMessageSchema.parse(message);
      expect(result.id).toBe('123');
      expect(result.role).toBe('user');
      expect(result.content).toBe('Hello');
    });

    it('should parse message with image', () => {
      const message = {
        id: '123',
        project_path: '/test/project',
        role: 'user',
        content: 'Check this',
        image_data: 'base64data',
        created_at: '2024-01-01T00:00:00Z',
      };

      const result = ChatMessageSchema.parse(message);
      expect(result.image_data).toBe('base64data');
    });

    it('should reject message without required fields', () => {
      expect(() => ChatMessageSchema.parse({ id: '123' })).toThrow();
    });
  });

  describe('ChatHistoryResponseSchema', () => {
    it('should parse empty history', () => {
      const result = ChatHistoryResponseSchema.parse({ messages: [] });
      expect(result.messages).toHaveLength(0);
    });

    it('should parse history with messages', () => {
      const history = {
        messages: [
          {
            id: '1',
            project_path: '/test',
            role: 'user',
            content: 'Hi',
            image_data: null,
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            id: '2',
            project_path: '/test',
            role: 'assistant',
            content: 'Hello!',
            image_data: null,
            created_at: '2024-01-01T00:00:01Z',
          },
        ],
      };

      const result = ChatHistoryResponseSchema.parse(history);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[1].role).toBe('assistant');
    });
  });

  describe('SendMessageRequestSchema', () => {
    it('should accept valid request', () => {
      const request = { content: 'Hello', image: null };
      const result = SendMessageRequestSchema.parse(request);
      expect(result.content).toBe('Hello');
    });

    it('should accept request with image', () => {
      const request = { content: 'Check this', image: 'base64data' };
      const result = SendMessageRequestSchema.parse(request);
      expect(result.image).toBe('base64data');
    });

    it('should reject empty content', () => {
      expect(() => SendMessageRequestSchema.parse({ content: '', image: null })).toThrow();
    });
  });

  describe('SendMessageResponseSchema', () => {
    it('should parse valid response', () => {
      const response = {
        user_message: {
          id: '123',
          project_path: '/test',
          role: 'user',
          content: 'Hello',
          image_data: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = SendMessageResponseSchema.parse(response);
      expect(result.user_message.id).toBe('123');
    });
  });

  describe('ClearHistoryResponseSchema', () => {
    it('should parse valid response', () => {
      const response = { deleted_count: 5 };
      const result = ClearHistoryResponseSchema.parse(response);
      expect(result.deleted_count).toBe(5);
    });
  });
});
