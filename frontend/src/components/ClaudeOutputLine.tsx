import { useMemo } from 'react';

interface ParsedLine {
  type: 'text' | 'tool_use' | 'thinking' | 'system';
  content?: string;
  toolName?: string;
}

function parseClaudeLine(line: string): ParsedLine | null {
  try {
    const json = JSON.parse(line);

    // Format: {"type":"assistant","message":{"content":[...]}}
    if (json.type === 'assistant' && json.message?.content) {
      for (const block of json.message.content) {
        if (block.type === 'text' && block.text) {
          return { type: 'text', content: block.text };
        }
        if (block.type === 'tool_use') {
          return { type: 'tool_use', toolName: block.name };
        }
        if (block.type === 'thinking' && block.thinking) {
          return { type: 'thinking', content: block.thinking };
        }
      }
    }

    // Format: {"type":"content_block_start","content_block":{...}}
    if (json.type === 'content_block_start' && json.content_block) {
      const block = json.content_block;
      if (block.type === 'text' && block.text) {
        return { type: 'text', content: block.text };
      }
      if (block.type === 'tool_use') {
        return { type: 'tool_use', toolName: block.name };
      }
    }

    // Format: {"type":"content_block_delta","delta":{...}}
    if (json.type === 'content_block_delta' && json.delta) {
      if (json.delta.type === 'text_delta' && json.delta.text) {
        return { type: 'text', content: json.delta.text };
      }
      if (json.delta.type === 'thinking_delta' && json.delta.thinking) {
        return { type: 'thinking', content: json.delta.thinking };
      }
    }

    // System messages
    if (json.type === 'system') {
      return { type: 'system', content: json.content || json.message };
    }

    return null;
  } catch {
    // Not JSON - might be plain text output
    if (line.trim() && !line.startsWith('{')) {
      return { type: 'text', content: line };
    }
    // Stderr output
    if (line.startsWith('[stderr]')) {
      return { type: 'system', content: line.replace('[stderr]', '').trim() };
    }
    return null;
  }
}

interface ClaudeOutputLineProps {
  line: string;
}

export function ClaudeOutputLine({ line }: ClaudeOutputLineProps) {
  const parsed = useMemo(() => parseClaudeLine(line), [line]);

  if (!parsed) return null;

  switch (parsed.type) {
    case 'text':
      return (
        <p className="text-gray-300 text-sm mb-1 whitespace-pre-wrap">
          {parsed.content}
        </p>
      );

    case 'tool_use':
      return (
        <div className="flex items-center gap-2 text-indigo-400 text-sm mb-1">
          <span className="animate-pulse">&#128295;</span>
          <span>Using {parsed.toolName}...</span>
        </div>
      );

    case 'thinking':
      return (
        <p className="text-gray-500 text-xs italic mb-1 whitespace-pre-wrap">
          {parsed.content}
        </p>
      );

    case 'system':
      return (
        <p className="text-yellow-600 text-xs mb-1">
          {parsed.content}
        </p>
      );

    default:
      return null;
  }
}
