import { useState, useEffect, useRef, useCallback } from 'react';

export type ServerStatus = 'checking' | 'ready' | 'error';

export interface ServerHealth {
  frontend: ServerStatus;
  backend: ServerStatus;
}

const POLL_INTERVAL = 2000;
const REQUEST_TIMEOUT = 3000;

async function checkServer(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    // no-cors mode always returns opaque response, so we can't check status
    // but if fetch completes without throwing, server is reachable
    return true;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

export function useServerHealth(
  frontendUrl: string | null,
  backendUrl: string | null
): ServerHealth {
  const [health, setHealth] = useState<ServerHealth>({
    frontend: 'checking',
    backend: 'checking',
  });

  const intervalRef = useRef<number | null>(null);

  const checkHealth = useCallback(async () => {
    if (!frontendUrl || !backendUrl) {
      return;
    }

    const [frontendOk, backendOk] = await Promise.all([
      checkServer(frontendUrl),
      checkServer(backendUrl),
    ]);

    setHealth({
      frontend: frontendOk ? 'ready' : 'error',
      backend: backendOk ? 'ready' : 'error',
    });
  }, [frontendUrl, backendUrl]);

  useEffect(() => {
    if (!frontendUrl || !backendUrl) {
      setHealth({ frontend: 'checking', backend: 'checking' });
      return;
    }

    // Initial check
    checkHealth();

    // Start polling
    intervalRef.current = window.setInterval(checkHealth, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [frontendUrl, backendUrl, checkHealth]);

  return health;
}
