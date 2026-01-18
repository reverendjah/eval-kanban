import { describe, it, expect } from 'vitest';
import { helloWorld } from './hello';

describe('helloWorld', () => {
  it('returns "Hello, World!"', () => {
    expect(helloWorld()).toBe('Hello, World!');
  });
});
