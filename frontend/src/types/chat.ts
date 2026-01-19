import { z } from 'zod';

export const ChatRoleSchema = z.enum(['user', 'assistant']);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  project_path: z.string(),
  role: ChatRoleSchema,
  content: z.string(),
  image_data: z.string().nullable().optional(),
  created_at: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatHistoryResponseSchema = z.object({
  messages: z.array(ChatMessageSchema),
});

export type ChatHistoryResponse = z.infer<typeof ChatHistoryResponseSchema>;

export const SendMessageRequestSchema = z.object({
  content: z.string().min(1),
  image: z.string().nullable().optional(),
});

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const SendMessageResponseSchema = z.object({
  user_message: ChatMessageSchema,
});

export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;

export const ClearHistoryResponseSchema = z.object({
  deleted_count: z.number(),
});

export type ClearHistoryResponse = z.infer<typeof ClearHistoryResponseSchema>;
