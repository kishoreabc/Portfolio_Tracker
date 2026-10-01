'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AIInsightsResponse } from '@/types/insights';
import type { PortfolioInput } from '@/lib/ai/pipeline';
import {
  type PipelineState,
  type AgentActivityEvent,
  INITIAL_AGENTS,
} from '@/types/agent-activity';

const LOCAL_STORAGE_KEY = 'portfolio_ai_insights_data';

export function useAiInsights() {
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const [pipelineState, setPipelineState] = useState<PipelineState>({
    runId: '',
    status: 'idle',
    agents: JSON.parse(JSON.stringify(INITIAL_AGENTS)),
  });

  // Restore saved insights from localStorage on initial mount / navigation
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.health) {
          setInsights(parsed);
          setCached(true);
          return;
        }
      }

      // If localStorage is empty, try fetching from server cache endpoint
      fetch('/api/insights')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.insights) {
            setInsights(data.insights);
            setCached(true);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.insights));
            } catch {}
          }
        })
        .catch(() => {});
    } catch (err) {
      console.warn('[useAiInsights] Failed to read from localStorage:', err);
    }
  }, []);

  const handleIncomingEvent = useCallback((event: AgentActivityEvent) => {
    setPipelineState((prev) => {
      const agent = prev.agents[event.agentId];
      if (!agent) return prev;

      const updatedActivities = [...agent.activities, event];
      const isCompleted = event.type === 'agent_completed';
      const isFailed = event.type === 'agent_failed';

      const updatedAgent = {
        ...agent,
        status: isCompleted ? 'completed' : isFailed ? 'failed' : 'running',
        currentStage: event.title,
        currentActivity: event.description || event.tool || event.title,
        activities: updatedActivities,
        structuredData: event.structuredData
          ? { ...agent.structuredData, ...event.structuredData }
          : agent.structuredData,
        startedAt: agent.startedAt || event.timestamp,
        completedAt: isCompleted ? event.timestamp : agent.completedAt,
      };

      return {
        ...prev,
        activeAgent: isCompleted ? prev.activeAgent : event.agentId,
        agents: {
          ...prev.agents,
          [event.agentId]: updatedAgent,
        },
      };
    });
  }, []);

  const fetchInsights = async (
    payload: PortfolioInput,
    force = true,
    mode: 'quick' | 'deep' | 'auto' = 'auto'
  ) => {
    setIsLoading(true);
    setError(null);
    setInsights(null);
    setCached(false);

    const initialRunId = `run_${Date.now()}`;
    setPipelineState({
      runId: initialRunId,
      status: 'running',
      startedAt: new Date().toISOString(),
      agents: JSON.parse(JSON.stringify(INITIAL_AGENTS)),
    });

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, force, mode }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error ?? `Server error ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';

      // Handle Server-Sent Events (SSE) Streaming
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalInsights: AIInsightsResponse | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const jsonStr = trimmed.replace(/^data:\s*/, '');
            try {
              const data = JSON.parse(jsonStr);

              if (data.type === 'agent_event' && data.event) {
                handleIncomingEvent(data.event);
              } else if (data.type === 'pipeline_completed' && data.insights) {
                finalInsights = data.insights;
                setInsights(data.insights);
                setCached(data.cached ?? false);
                setPipelineState((prev) => ({
                  ...prev,
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                }));

                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.insights));
                } catch {}
              } else if (data.type === 'pipeline_failed') {
                throw new Error(data.error || 'Pipeline execution failed');
              }
            } catch (jsonErr) {
              console.warn('[useAiInsights] Failed to parse SSE event chunk:', jsonErr);
            }
          }
        }

        if (!finalInsights) {
          throw new Error('Pipeline stream closed before report was assembled');
        }
      } else {
        // Fallback for regular JSON response (e.g. cached response)
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setInsights(data.insights);
        setCached(data.cached ?? false);
        setPipelineState((prev) => ({
          ...prev,
          status: 'completed',
          completedAt: new Date().toISOString(),
        }));

        if (data.insights) {
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.insights));
          } catch {}
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setPipelineState((prev) => ({
        ...prev,
        status: 'failed',
        error: msg,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const resetInsights = () => {
    setInsights(null);
    setError(null);
    setCached(false);
    setPipelineState({
      runId: '',
      status: 'idle',
      agents: JSON.parse(JSON.stringify(INITIAL_AGENTS)),
    });
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
  };

  return {
    insights,
    isLoading,
    error,
    cached,
    pipelineState,
    fetchInsights,
    resetInsights,
  };
}
