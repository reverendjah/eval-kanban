import { describe, it, expect } from 'vitest';
import {
  DiffChangeType,
  DiffFileSchema,
  DiffResponseSchema,
  PreviewStatus,
  PreviewInfoSchema,
} from './review';

describe('Review Types', () => {
  describe('DiffChangeType', () => {
    it('should accept valid change types', () => {
      expect(DiffChangeType.parse('added')).toBe('added');
      expect(DiffChangeType.parse('modified')).toBe('modified');
      expect(DiffChangeType.parse('deleted')).toBe('deleted');
      expect(DiffChangeType.parse('renamed')).toBe('renamed');
    });

    it('should reject invalid change types', () => {
      expect(() => DiffChangeType.parse('invalid')).toThrow();
    });
  });

  describe('DiffFileSchema', () => {
    it('should validate a valid diff file', () => {
      const validFile = {
        path: 'src/main.rs',
        change_type: 'modified',
        additions: 10,
        deletions: 3,
        content: '@@ -1,3 +1,10 @@\n fn main() {}',
      };
      expect(() => DiffFileSchema.parse(validFile)).not.toThrow();
    });

    it('should reject missing fields', () => {
      expect(() => DiffFileSchema.parse({ path: 'test.ts' })).toThrow();
    });
  });

  describe('DiffResponseSchema', () => {
    it('should validate a valid diff response', () => {
      const validResponse = {
        files: [
          {
            path: 'src/main.rs',
            change_type: 'modified',
            additions: 10,
            deletions: 3,
            content: '@@ -1,3 +1,10 @@\n fn main() {}',
          },
        ],
        total_additions: 10,
        total_deletions: 3,
      };
      expect(() => DiffResponseSchema.parse(validResponse)).not.toThrow();
    });

    it('should validate empty files array', () => {
      const emptyResponse = {
        files: [],
        total_additions: 0,
        total_deletions: 0,
      };
      expect(() => DiffResponseSchema.parse(emptyResponse)).not.toThrow();
    });
  });

  describe('PreviewStatus', () => {
    it('should accept valid statuses', () => {
      expect(PreviewStatus.parse('starting')).toBe('starting');
      expect(PreviewStatus.parse('running')).toBe('running');
      expect(PreviewStatus.parse('stopped')).toBe('stopped');
      expect(PreviewStatus.parse('error')).toBe('error');
    });

    it('should reject invalid statuses', () => {
      expect(() => PreviewStatus.parse('unknown')).toThrow();
    });
  });

  describe('PreviewInfoSchema', () => {
    it('should validate a valid preview info', () => {
      const validInfo = {
        task_id: '550e8400-e29b-41d4-a716-446655440000',
        backend_url: 'http://localhost:9900',
        frontend_url: 'http://localhost:5200',
        backend_port: 9900,
        frontend_port: 5200,
        status: 'running',
      };
      expect(() => PreviewInfoSchema.parse(validInfo)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      expect(() => PreviewInfoSchema.parse({ task_id: 'test' })).toThrow();
    });
  });
});
