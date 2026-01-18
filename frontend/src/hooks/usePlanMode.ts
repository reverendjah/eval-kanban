import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { PlanModeState } from '../types/plan';
import { setPlanEventHandlers, clearPlanEventHandlers, PlanQuestion } from './useWebSocket';

interface UsePlanModeOptions {
  onTaskCreated?: (taskId: string) => void;
}

interface ExtendedPlanModeState extends PlanModeState {
  claudeOutput: string[];
  debugLogs: string[];
}

export function usePlanMode(options: UsePlanModeOptions = {}) {
  const [state, setState] = useState<ExtendedPlanModeState>({
    phase: 'idle',
    sessionId: null,
    currentQuestions: [],
    activeQuestionIndex: 0,
    pendingAnswers: {},
    questionCount: 0,
    isLoading: false,
    summary: null,
    error: null,
    claudeOutput: [],
    debugLogs: [],
  });

  // Helper to add debug log with timestamp
  const addDebugLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[PlanMode] ${msg}`);
    setState((prev) => ({
      ...prev,
      debugLogs: [...prev.debugLogs, `[${timestamp}] ${msg}`].slice(-50),
    }));
  }, []);

  const sessionIdRef = useRef<string | null>(null);
  const isStartingRef = useRef(false);

  // Set up event handlers when session starts
  const setupEventHandlers = useCallback((sessionId: string, logFn: (msg: string) => void) => {
    sessionIdRef.current = sessionId;
    logFn(`Event handlers registered for session ${sessionId}`);

    setPlanEventHandlers({
      onPlanQuestions: (sid: string, questions: PlanQuestion[]) => {
        logFn(`WS: plan_questions received (session=${sid.slice(0, 8)}, ${questions.length} questions)`);
        if (sid === sessionIdRef.current) {
          const headers = questions.map(q => q.header).join(', ');
          logFn(`Questions: ${headers}`);
          setState((prev) => ({
            ...prev,
            phase: 'questioning',
            currentQuestions: questions,
            activeQuestionIndex: 0,
            pendingAnswers: {},
            questionCount: prev.questionCount + questions.length,
            isLoading: false,
          }));
        } else {
          logFn(`Ignored: session mismatch (expected=${sessionIdRef.current?.slice(0, 8)})`);
        }
      },
      onPlanSummary: (sid: string, summary: string) => {
        logFn(`WS: plan_summary received (session=${sid.slice(0, 8)})`);
        if (sid === sessionIdRef.current) {
          logFn(`Summary received (${summary.length} chars)`);
          setState((prev) => ({
            ...prev,
            phase: 'summary',
            summary,
            currentQuestions: [],
            pendingAnswers: {},
            isLoading: false,
          }));
        }
      },
      onPlanError: (sid: string, error: string) => {
        logFn(`WS: plan_error received (session=${sid.slice(0, 8)}): ${error}`);
        if (sid === sessionIdRef.current) {
          setState((prev) => ({
            ...prev,
            phase: 'error',
            error,
            isLoading: false,
          }));
        }
      },
      onPlanOutput: (sid: string, content: string) => {
        logFn(`WS: plan_output received (session=${sid.slice(0, 8)}, ${content.length} chars)`);
        if (sid === sessionIdRef.current) {
          setState((prev) => ({
            ...prev,
            claudeOutput: [...prev.claudeOutput, content].slice(-100),
          }));
        }
      },
    });
  }, []);

  // Start planning
  const startPlanning = useCallback(async (title: string, prompt: string, askQuestions: boolean = false) => {
    // Prevent duplicate calls (React StrictMode)
    if (isStartingRef.current) {
      console.log('[PlanMode] Ignoring duplicate startPlanning call');
      return;
    }
    isStartingRef.current = true;

    // Create a local log function that works before state is ready
    const logs: string[] = [];
    const logFn = (msg: string) => {
      const timestamp = new Date().toLocaleTimeString();
      const entry = `[${timestamp}] ${msg}`;
      console.log(`[PlanMode] ${msg}`);
      logs.push(entry);
      setState((prev) => ({
        ...prev,
        debugLogs: [...prev.debugLogs, entry].slice(-50),
      }));
    };

    logFn(`Starting plan: "${title}"`);

    // Generate session_id LOCALLY first
    const sessionId = crypto.randomUUID();
    logFn(`Generated session_id: ${sessionId.slice(0, 8)}...`);

    // Register event handlers BEFORE calling API (fixes race condition!)
    setupEventHandlers(sessionId, logFn);
    logFn('Event handlers ready, now calling API...');

    setState({
      phase: 'questioning',
      sessionId,  // Already have the ID
      currentQuestions: [],
      activeQuestionIndex: 0,
      pendingAnswers: {},
      questionCount: 0,
      isLoading: true,
      summary: null,
      error: null,
      claudeOutput: [],
      debugLogs: logs,
    });

    try {
      logFn(`Calling API: POST /api/plan (askQuestions=${askQuestions})`);
      // Pass session_id to backend so it uses our ID
      await api.plan.start({ title, prompt, session_id: sessionId, ask_questions: askQuestions });
      logFn('API call completed, listening for WebSocket events...');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start planning';
      logFn(`API Error: ${errorMsg}`);
      setState((prev) => ({
        ...prev,
        phase: 'error',
        isLoading: false,
        error: errorMsg,
      }));
    } finally {
      isStartingRef.current = false;
    }
  }, [setupEventHandlers]);

  // Set answer for a specific question (used when navigating tabs)
  const setQuestionAnswer = useCallback((questionIndex: number, answers: string[]) => {
    setState((prev) => ({
      ...prev,
      pendingAnswers: {
        ...prev.pendingAnswers,
        [questionIndex]: answers,
      },
    }));
  }, []);

  // Navigate to a specific question tab
  const goToQuestion = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      activeQuestionIndex: Math.max(0, Math.min(index, prev.currentQuestions.length - 1)),
    }));
  }, []);

  // Check if all questions have answers
  const allQuestionsAnswered = useCallback(() => {
    return state.currentQuestions.every(q => {
      const answers = state.pendingAnswers[q.index];
      return answers && answers.length > 0;
    });
  }, [state.currentQuestions, state.pendingAnswers]);

  // Submit all answers at once
  const submitAllAnswers = useCallback(async () => {
    if (!state.sessionId || state.currentQuestions.length === 0) return;

    // Build answers array from pendingAnswers
    const answersToSubmit = state.currentQuestions.map(q => ({
      question_index: q.index,
      answers: state.pendingAnswers[q.index] || [],
    }));

    addDebugLog(`Submitting ${answersToSubmit.length} answers`);

    setState((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      await api.plan.answer(state.sessionId, {
        answers: answersToSubmit,
      });
      // WebSocket will notify us of the next questions or summary
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to submit answers',
      }));
    }
  }, [state.sessionId, state.currentQuestions, state.pendingAnswers, addDebugLog]);

  // Execute the plan (create task)
  const execute = useCallback(async (title: string, description?: string) => {
    if (!state.sessionId) return;

    setState((prev) => ({
      ...prev,
      phase: 'executing',
      isLoading: true,
    }));

    try {
      const response = await api.plan.execute(state.sessionId, { title, description });

      // Clear event handlers on success
      clearPlanEventHandlers();
      sessionIdRef.current = null;

      setState({
        phase: 'idle',
        sessionId: null,
        currentQuestions: [],
        activeQuestionIndex: 0,
        pendingAnswers: {},
        questionCount: 0,
        isLoading: false,
        summary: null,
        error: null,
        claudeOutput: [],
        debugLogs: [],
      });

      options.onTaskCreated?.(response.task_id);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: 'error',
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to execute plan',
      }));
    }
  }, [state.sessionId, options]);

  // Redo the planning (start over)
  const redo = useCallback(async () => {
    if (!state.sessionId) return;

    setState((prev) => ({
      ...prev,
      phase: 'questioning',
      currentQuestions: [],
      activeQuestionIndex: 0,
      pendingAnswers: {},
      questionCount: 0,
      isLoading: true,
      summary: null,
      error: null,
      claudeOutput: [],
      debugLogs: [...prev.debugLogs, `[${new Date().toLocaleTimeString()}] Redo requested`],
    }));

    try {
      const response = await api.plan.redo(state.sessionId);

      // Create log function for event handlers
      const logFn = (msg: string) => {
        const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
        console.log(`[PlanMode] ${msg}`);
        setState((prev) => ({
          ...prev,
          debugLogs: [...prev.debugLogs, entry].slice(-50),
        }));
      };

      // Update handlers for new session
      setupEventHandlers(response.session_id, logFn);

      setState((prev) => ({
        ...prev,
        sessionId: response.session_id,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: 'error',
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to redo planning',
      }));
    }
  }, [state.sessionId, setupEventHandlers]);

  // Resume planning after error (preserves Q&A history)
  const resume = useCallback(async () => {
    if (!state.sessionId) return;

    addDebugLog('Resume requested - preserving Q&A history');

    setState((prev) => ({
      ...prev,
      phase: 'questioning',
      isLoading: true,
      error: null,
      claudeOutput: [],
      // Keep currentQuestions, pendingAnswers, questionCount - they contain history
    }));

    try {
      await api.plan.resume(state.sessionId);
      addDebugLog('Resume API call completed, waiting for WebSocket events...');
      // Event handlers are already registered, just wait for WebSocket
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: 'error',
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to resume planning',
      }));
    }
  }, [state.sessionId, addDebugLog]);

  // Cancel planning
  const cancel = useCallback(async () => {
    if (state.sessionId) {
      try {
        await api.plan.cancel(state.sessionId);
      } catch {
        // Ignore cancel errors
      }
    }

    // Clear event handlers
    clearPlanEventHandlers();
    sessionIdRef.current = null;

    setState({
      phase: 'idle',
      sessionId: null,
      currentQuestions: [],
      activeQuestionIndex: 0,
      pendingAnswers: {},
      questionCount: 0,
      isLoading: false,
      summary: null,
      error: null,
      claudeOutput: [],
      debugLogs: [],
    });
  }, [state.sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPlanEventHandlers();
      sessionIdRef.current = null;
    };
  }, []);

  return {
    ...state,
    startPlanning,
    setQuestionAnswer,
    goToQuestion,
    allQuestionsAnswered,
    submitAllAnswers,
    execute,
    redo,
    resume,
    cancel,
  };
}
