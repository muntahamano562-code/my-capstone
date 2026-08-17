import { useRef, useState, useEffect } from 'react';
import './AIChat.css';

// Static, well-known GitHub language colors used only for chip accents.
// These are NOT statistics — they are purely decorative and never imply usage share.
const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Scala: '#c22d40',
  Elixir: '#6e4a7e',
  Lua: '#000080',
};

const languageColor = (lang) => LANGUAGE_COLORS[lang] || '#94a3b8';

// Example prompts used by the first-run empty state. They drive the existing
// chat flow, so clicking one behaves exactly like typing and sending.
const EXAMPLE_PROMPTS = [
  'Analyze the GitHub user torvalds',
  'Explain what JavaScript closures are',
  'Review my frontend skills',
  'Suggest a project for me',
];

// Return a user-safe error message. Never surfaces raw JSON, stack traces,
// or internal/secret details. Normalizes "Unhandled Error" phrasing.
function safeErrorMessage(message) {
  if (message == null) {
    return 'Something went wrong while reaching the assistant. Please try again.';
  }
  let text = typeof message === 'string' ? message : null;
  if (text == null) {
    try {
      text = JSON.stringify(message);
    } catch {
      text = '';
    }
  }
  const trimmed = (text || '').trim();
  if (!trimmed || /unhandled/i.test(trimmed) || /^{|^\[/.test(trimmed)) {
    return 'Something went wrong while reaching the assistant. Please try again.';
  }
  return trimmed;
}

// Normalize low-level failures (network, HTTP status, stream throw) into a
// single safe, user-facing shape. Never includes secrets or raw payloads.
function classifyError(err, status) {
  if (status === 429) {
    return {
      type: 'rate-limit',
      message: "You're sending requests too quickly. Please wait a moment and try again.",
    };
  }
  if (typeof status === 'number' && status >= 400) {
    return {
      type: 'api',
      message: 'The assistant service returned an error. Please try again.',
    };
  }
  const name = err && err.name;
  const msg = (err && err.message) || '';
  if (name === 'TypeError' || /fetch|network|connect|failed to fetch/i.test(msg)) {
    return {
      type: 'network',
      message: "Unable to connect right now. Check your connection and try again.",
    };
  }
  return {
    type: 'generic',
    message: safeErrorMessage(msg) || 'Something went wrong while reaching the assistant. Please try again.',
  };
}

function ChatMessage({ message }) {
  const isAssistant = message.role === 'assistant';

  return (
    <article
      className={`chat-message chat-message-${isAssistant ? 'assistant' : 'user'}`}
      aria-label={isAssistant ? 'Assistant message' : 'User message'}
    >
      <div className="chat-message__meta">
        <span className="chat-message__label">{isAssistant ? 'Assistant' : 'You'}</span>
      </div>
      {message.content ? (
        <div className="chat-message__bubble">{message.content}</div>
      ) : null}
    </article>
  );
}

// Polished pending/skeleton state shown while the assistant is preparing its
// first token. Avoids layout shift and clearly signals "working".
function PendingSkeleton() {
  return (
    <article
      className="chat-message chat-message-assistant chat-message-pending"
      aria-label="Assistant is preparing a response"
      aria-busy="true"
    >
      <div className="chat-message__meta">
        <span className="chat-message__label">Assistant</span>
      </div>
      <div className="chat-message__bubble chat-skeleton" aria-hidden="true">
        <span className="chat-skeleton__line" style={{ width: '92%' }} />
        <span className="chat-skeleton__line" style={{ width: '78%' }} />
        <span className="chat-skeleton__line" style={{ width: '55%' }} />
      </div>
    </article>
  );
}

function ChatInput({ value, onChange, onSend, disabled }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  const isEmpty = value.trim().length === 0;

  return (
    <div className="chat-input-panel">
      <label htmlFor="assistant-message-input" className="sr-only">
        Write a message to your career assistant
      </label>
      <textarea
        id="assistant-message-input"
        className="chat-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your next learning move..."
        aria-label="Message to AI Career Assistant"
        rows="3"
        disabled={disabled}
      />
      <button
        type="button"
        className="chat-send-button"
        onClick={onSend}
        disabled={disabled || isEmpty}
        aria-label="Send message"
      >
        Send
      </button>
      {isEmpty ? (
        <p className="chat-input-hint" role="status">
          Type a message to ask your career assistant.
        </p>
      ) : null}
    </div>
  );
}

export function ToolCallCard({ toolCall, onRetry, retrying }) {
  if (!toolCall) return null;

  const { status, input, output } = toolCall;

  if (status === 'streaming') {
    return (
      <article className="tool-card tool-card--streaming" aria-label="Preparing GitHub analysis">
        <div className="tool-card__header">
          <span className="tool-card__spinner" aria-hidden="true" />
          <span className="tool-card__title">Preparing GitHub analysis…</span>
        </div>
        <div className="tool-card__progress" aria-hidden="true">
          <div className="tool-card__progress-bar" />
        </div>
      </article>
    );
  }

  if (status === 'input-available') {
    const username = input && input.username ? input.username : '—';
    return (
      <article className="tool-card tool-card--input" aria-label="GitHub analysis input">
        <div className="tool-card__header">
          <span className="tool-card__icon" aria-hidden="true">🔍</span>
          <span className="tool-card__title">Analyzing GitHub</span>
        </div>
        <div className="tool-card__body">
          <div className="tool-card__input-row">
            <span className="tool-card__input-label">Username</span>
            <span className="tool-card__input-value">{username}</span>
          </div>
        </div>
      </article>
    );
  }

  if (status === 'available' && output) {
    const o = output || {};
    const username =
      typeof o.username === 'string' && o.username.trim() ? o.username : 'Unknown user';
    const publicRepos = typeof o.publicRepos === 'number' ? o.publicRepos : null;
    const followers = typeof o.followers === 'number' ? o.followers : null;
    const totalStars = typeof o.totalStars === 'number' ? o.totalStars : null;
    const rawScore = Number(o.activityScore);
    const score = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, Math.round(rawScore)))
      : 0;
    const activityLevel = score < 40 ? 'Low' : score < 70 ? 'Medium' : 'High';
    const topLanguages = Array.isArray(o.topLanguages)
      ? o.topLanguages.filter((lang) => typeof lang === 'string' && lang.trim())
      : [];
    const careerSummary =
      typeof o.careerSummary === 'string' && o.careerSummary.trim() ? o.careerSummary : null;
    const recommendedFocus = Array.isArray(o.recommendedFocus)
      ? o.recommendedFocus.filter((item) => typeof item === 'string' && item.trim())
      : [];

    const statValue = (value) => (value === null || value === undefined ? '—' : value);

    const overviewStats = [
      { key: 'repos', label: 'Repositories', value: statValue(publicRepos), icon: '📦' },
      { key: 'stars', label: 'Stars', value: statValue(totalStars), icon: '⭐' },
      { key: 'followers', label: 'Followers', value: statValue(followers), icon: '👥' },
      { key: 'activity', label: 'Activity', value: score, icon: '⚡' },
    ];

    return (
      <article
        className="tool-card tool-card--result"
        aria-label={`GitHub analysis result for ${username}`}
      >
        <header className="tool-card__header">
          <span className="tool-card__avatar" aria-hidden="true">🐙</span>
          <span className="tool-card__heading">
            <span className="tool-card__title">GitHub Analysis</span>
            <span className="tool-card__username">@{username}</span>
          </span>
          <span className={`tool-card__badge tool-card__badge--${activityLevel.toLowerCase()}`}>
            {activityLevel} activity
          </span>
        </header>

        <div className="tool-card__body">
          <ul className="tool-card__stats">
            {overviewStats.map((stat) => (
              <li key={stat.key} className="tool-stat">
                <span className="tool-stat__icon" aria-hidden="true">{stat.icon}</span>
                <span className="tool-stat__value">{stat.value}</span>
                <span className="tool-stat__label">{stat.label}</span>
              </li>
            ))}
          </ul>

          <section className="tool-card__section" aria-label="Activity score">
            <div className="tool-card__section-head">
              <span className="tool-card__section-label">Activity score</span>
              <span className={`tool-level tool-level--${activityLevel.toLowerCase()}`}>
                {activityLevel}
              </span>
            </div>
            <div className="tool-score">
              <div
                className="tool-score__track"
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Activity score ${score} out of 100, level ${activityLevel}`}
              >
                <div className="tool-score__fill" style={{ width: `${score}%` }} />
              </div>
              <span className="tool-score__value">{score}/100</span>
            </div>
          </section>

          {topLanguages.length > 0 ? (
            <section className="tool-card__section" aria-label="Top languages">
              <span className="tool-card__section-label">Top languages</span>
              <ul className="tool-chips">
                {topLanguages.map((lang, index) => (
                  <li key={`${lang}-${index}`} className="tool-chip">
                    <span
                      className="tool-chip__dot"
                      style={{ background: languageColor(lang) }}
                      aria-hidden="true"
                    />
                    {lang}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {careerSummary ? (
            <section
              className="tool-card__section tool-card__section--highlight"
              aria-label="Career summary and strengths"
            >
              <span className="tool-card__section-label tool-card__section-label--icon">
                💡 Career summary &amp; strengths
              </span>
              <p className="tool-summary">{careerSummary}</p>
            </section>
          ) : null}

          {recommendedFocus.length > 0 ? (
            <section className="tool-card__section" aria-label="Recommended focus">
              <span className="tool-card__section-label tool-card__section-label--icon">
                🎯 Recommended focus
              </span>
              <ul className="tool-focus">
                {recommendedFocus.map((item, index) => (
                  <li key={index} className="tool-focus__item">{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    );
  }

  if (status === 'error') {
    return (
      <article className="tool-card tool-card--error" role="alert" aria-label="GitHub analysis failed">
        <div className="tool-card__header">
          <span className="tool-card__icon" aria-hidden="true">⚠️</span>
          <span className="tool-card__title">Analysis failed</span>
        </div>
        <div className="tool-card__body">
          <p className="tool-error__message">
            We couldn't retrieve the GitHub profile right now.
          </p>
          {typeof onRetry === 'function' ? (
            <button
              type="button"
              className="tool-error__retry"
              onClick={onRetry}
              disabled={retrying}
            >
              {retrying ? 'Retrying…' : 'Try again'}
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  return null;
}

function ErrorCard({ error, onRetry, retrying }) {
  if (!error) return null;

  const icon = error.type === 'rate-limit' ? '⏳' : '⚠️';
  const title =
    error.type === 'network'
      ? 'Connection problem'
      : error.type === 'rate-limit'
        ? 'Slow down a moment'
        : 'Response interrupted';

  return (
    <article
      className={`chat-error-card chat-error-card--${error.type}`}
      role="alert"
      aria-label={title}
    >
      <div className="chat-error-card__icon" aria-hidden="true">{icon}</div>
      <div className="chat-error-card__body">
        <p className="chat-error-card__title">{title}</p>
        <p className="chat-error-card__message">{error.message}</p>
        <button
          type="button"
          className="chat-error-card__retry"
          onClick={onRetry}
          disabled={retrying}
          aria-label="Try again"
        >
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      </div>
    </article>
  );
}

function AIChat() {
  const [messages, setMessages] = useState([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(null); // { type, message, assistantId }
  const [stopped, setStopped] = useState(false);
  const [toolCall, setToolCall] = useState(null);
  const [lastQuestion, setLastQuestion] = useState('');

  const userMessageCounter = useRef(0);
  const assistantMessageCounter = useRef(0);
  const abortControllerRef = useRef(null);
  const chatAreaRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showJump, setShowJump] = useState(false);

  // Refs kept in sync with state so retry handlers read fresh values.
  const messagesRef = useRef(messages);
  const streamErrorRef = useRef(streamError);
  const isStreamingRef = useRef(isStreaming);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    streamErrorRef.current = streamError;
  }, [streamError]);
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const sendMessage = async (rawQuestion, options = {}) => {
    const { isRetry = false } = options;
    const question = (rawQuestion || '').trim();

    // B guard: never send empty/whitespace-only input.
    if (!question) {
      return;
    }
    // Prevent duplicate simultaneous generations/retries.
    if (isStreamingRef.current) {
      return;
    }

    // Build the conversation snapshot to send. On retry we reuse the existing
    // user message and drop any dangling partial assistant message so the
    // conversation is never duplicated.
    let snapshot;
    if (isRetry) {
      const failedId = streamErrorRef.current ? streamErrorRef.current.assistantId : null;
      snapshot = messagesRef.current.filter((m) => m.id !== failedId);
    } else {
      const newUserMessage = {
        id: `user-${userMessageCounter.current++}`,
        role: 'user',
        content: question,
      };
      snapshot = [...messagesRef.current, newUserMessage];
      setLastQuestion(question);
    }

    setMessages(snapshot);
    setDraftMessage('');
    setStreamError(null);
    setStopped(false);
    setToolCall(null);
    setIsThinking(true);
    setIsStreaming(true);
    isStreamingRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let assistantId = null;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: snapshot.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setStreamError({
          ...classifyError(new Error(payload.error || 'Request failed'), res.status),
          assistantId: null,
        });
        return;
      }

      // Create a placeholder assistant message that will be updated as chunks arrive.
      assistantId = `assistant-${assistantMessageCounter.current++}`;
      setMessages((current) => [...current, { id: assistantId, role: 'assistant', content: '' }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let firstChunkArrived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value, { stream: true });
        buf += chunkStr;

        // normalize CRLF and split on double-newline event boundaries
        buf = buf.replace(/\r\n/g, '\n');
        const parts = buf.split('\n\n');
        buf = parts.pop();

        for (const part of parts) {
          const line = part.trim();
          if (!line) continue;
          // Extract the first data: ... line robustly (handles CRLF and extra fields)
          const m = line.match(/data:\s*(.*)/s);
          if (!m) continue;
          const payloadText = m[1];
          let payload = null;
          try {
            payload = JSON.parse(payloadText);
          } catch (err) {
            // ignore malformed pieces
            console.warn('SSE JSON parse failed for payloadText:', payloadText, err);
            continue;
          }

          if (payload.type === 'chunk') {
            if (!firstChunkArrived) {
              firstChunkArrived = true;
              setIsThinking(false);
            }
            setMessages((current) =>
              current.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: (msg.content || '') + payload.text }
                  : msg,
              ),
            );
          } else if (payload.type === 'tool-input-start') {
            setIsThinking(false);
            setToolCall({
              toolName: payload.toolName,
              toolCallId: payload.toolCallId,
              status: 'streaming',
              partialInput: '',
              input: null,
              output: null,
              error: null,
            });
          } else if (payload.type === 'tool-input-delta') {
            setToolCall((prev) =>
              prev
                ? { ...prev, partialInput: (prev.partialInput || '') + (payload.delta || '') }
                : prev,
            );
          } else if (payload.type === 'tool-call') {
            setToolCall((prev) => ({
              ...(prev || { toolName: payload.toolName, toolCallId: payload.toolCallId }),
              status: 'input-available',
              input: payload.input,
            }));
          } else if (payload.type === 'tool-result') {
            setToolCall((prev) => ({ ...(prev || {}), status: 'available', output: payload.output }));
          } else if (payload.type === 'tool-error') {
            setToolCall((prev) => ({
              ...(prev || { toolName: payload.toolName }),
              status: 'error',
              error: payload.error,
            }));
          } else if (payload.type === 'done') {
            setIsStreaming(false);
          } else if (payload.type === 'error') {
            throw new Error(safeErrorMessage(payload.message) || 'Stream error');
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // user cancelled — show a calm note, not an alarming error
        setStopped(true);
        return;
      }
      const classified = classifyError(err, null);
      // Mid-stream: keep whatever content already arrived, surface a retry card.
      if (assistantId) {
        setStreamError({
          type: 'mid-stream',
          message: 'Something went wrong while generating this response.',
          assistantId,
        });
      } else {
        setStreamError({ ...classified, assistantId: null });
      }
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
      isStreamingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    // attach scroll listener
    const el = chatAreaRef.current;
    if (!el) return undefined;

    const onScroll = () => {
      const threshold = 80; // px
      const atBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) <= threshold;
      setIsAtBottom(atBottom);
      setShowJump(!atBottom);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // auto-scroll when at bottom
    const el = chatAreaRef.current;
    if (!el) return;
    if (isAtBottom) {
      // scroll to bottom smoothly when new content arrives
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isAtBottom, toolCall, streamError]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetry = () => {
    if (isStreamingRef.current || !lastQuestion) return;
    sendMessage(lastQuestion, { isRetry: true });
  };

  const jumpToLatest = () => {
    const el = chatAreaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const showSkeleton = !streamError && isThinking && !toolCall;

  return (
    <section className="ai-chat-screen">
      <header className="ai-chat-header">
        <div>
          <p className="ai-chat-eyebrow">Career Intelligence</p>
          <h1>AI Career Assistant</h1>
          <p className="ai-chat-summary">
            Get personalized career guidance based on your profile and current goals.
          </p>
        </div>
      </header>

      <section className="ai-chat-panel" aria-label="AI Career Assistant chat">
        <div
          ref={chatAreaRef}
          className="chat-area"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {messages.length === 0 && (
            <section className="chat-empty-state" aria-label="Welcome to your AI Career Assistant">
              <h2 className="chat-empty-state__title">What do you want to work on?</h2>
              <p className="chat-empty-state__subtitle">
                Ask about your next learning move, analyze a GitHub profile, or get a tailored
                project suggestion. Try one of these:
              </p>
              <div className="chat-empty-state__examples">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="example-prompt-button"
                    onClick={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {showSkeleton && <PendingSkeleton />}

          <ToolCallCard toolCall={toolCall} onRetry={handleRetry} retrying={isStreaming} />

          {stopped && !streamError && (
            <div className="chat-stopped-note" role="status">
              Generation stopped.
            </div>
          )}

          <ErrorCard error={streamError} onRetry={handleRetry} retrying={isStreaming} />
        </div>

        <div className="chat-input-wrap">
          <ChatInput
            value={draftMessage}
            onChange={setDraftMessage}
            onSend={() => sendMessage(draftMessage)}
            disabled={isStreaming}
          />
          <div className="chat-controls">
            {isStreaming ? (
              <button
                type="button"
                className="chat-stop-button"
                onClick={handleStop}
                aria-label="Stop generation"
              >
                Stop
              </button>
            ) : null}
            {showJump && (
              <button
                type="button"
                className="chat-jump-button"
                onClick={jumpToLatest}
                aria-label="Jump to latest"
              >
                Jump to latest
              </button>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

export default AIChat;
