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

const initialMessages = [
  {
    id: 'assistant-welcome',
    role: 'assistant',
    content:
      "Hi, I'm your AI Career Assistant. I can help you plan your next learning step, review your current skills, and suggest practical projects based on your profile.",
  },
];

const suggestedPrompts = [
  'What should I learn next?',
  'Review my skills',
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

function ChatMessage({ message }) {
  const isAssistant = message.role === 'assistant';

  return (
    <article className={`chat-message chat-message-${isAssistant ? 'assistant' : 'user'}`} aria-label={isAssistant ? 'Assistant message' : 'User message'}>
      <div className="chat-message__meta">
        <span className="chat-message__label">{isAssistant ? 'Assistant' : 'You'}</span>
      </div>
      {message.content ? (
        <div className="chat-message__bubble">{message.content}</div>
      ) : null}
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
        disabled={disabled || value.trim().length === 0}
        aria-label="Send message"
      >
        Send
      </button>
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

function AIChat() {
  const [messages, setMessages] = useState(initialMessages);
  const [draftMessage, setDraftMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const userMessageCounter = useRef(0);
  const assistantMessageCounter = useRef(0);
  const abortControllerRef = useRef(null);
  const chatAreaRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showJump, setShowJump] = useState(false);
  const [toolCall, setToolCall] = useState(null);
  const [lastQuestion, setLastQuestion] = useState('');

  const sendMessage = async (question) => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    const newUserMessage = {
      id: `user-${userMessageCounter.current++}`,
      role: 'user',
      content: trimmedQuestion,
    };

    setMessages((currentMessages) => [...currentMessages, newUserMessage]);
    setDraftMessage('');
    setErrorMessage('');
    setToolCall(null);
    setLastQuestion(trimmedQuestion);
    setIsThinking(true);
    setIsStreaming(true);
    // Start streaming from the server using Fetch + ReadableStream parsing for SSE-style events
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // track assistant placeholder content for logging and cleanup
    let assistantId = null;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newUserMessage].map((m) => ({ role: m.role, content: m.content })) }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Assistant returned an error');
      }

      // Create a placeholder assistant message that will be updated as chunks arrive
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
            setMessages((current) => current.map((m) => (m.id === assistantId ? { ...m, content: (m.content || '') + payload.text } : m)));
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
            setToolCall((prev) => (prev ? { ...prev, partialInput: (prev.partialInput || '') + (payload.delta || '') } : prev));
          } else if (payload.type === 'tool-call') {
            setToolCall((prev) => ({
              ...(prev || { toolName: payload.toolName, toolCallId: payload.toolCallId }),
              status: 'input-available',
              input: payload.input,
            }));
          } else if (payload.type === 'tool-result') {
            setToolCall((prev) => ({ ...(prev || {}), status: 'available', output: payload.output }));
          } else if (payload.type === 'tool-error') {
            setToolCall((prev) => ({ ...(prev || { toolName: payload.toolName }), status: 'error', error: payload.error }));
          } else if (payload.type === 'done') {
            setIsStreaming(false);
          } else if (payload.type === 'error') {
            throw new Error(safeErrorMessage(payload.message) || 'Stream error');
          }
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        // user cancelled — do not show an alarming error
        setErrorMessage('Generation stopped.');
      } else {
        setErrorMessage(safeErrorMessage(err.message) || 'Unable to contact assistant.');
        // if we created a placeholder assistant bubble, replace its content with a friendly message
        if (assistantId) {
          setMessages((current) => current.map((m) => (m.id === assistantId ? { ...m, content: 'I am having trouble reaching the assistant right now. Please try again in a moment.' } : m)));
        } else {
          setMessages((current) => [
            ...current,
            { id: `assistant-${assistantMessageCounter.current++}`, role: 'assistant', content: 'I am having trouble reaching the assistant right now. Please try again in a moment.' },
          ]);
        }
      }
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
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
  }, [messages, isAtBottom]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetry = () => {
    if (!lastQuestion || isStreaming) return;
    sendMessage(lastQuestion);
  };

  const jumpToLatest = () => {
    const el = chatAreaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

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
        <div ref={chatAreaRef} className="chat-area" aria-live="polite" aria-relevant="additions text">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          <ToolCallCard
            toolCall={toolCall}
            onRetry={handleRetry}
            retrying={isStreaming}
          />

          {!errorMessage && isThinking && (
            <article className="chat-message chat-message-assistant chat-message-thinking" aria-label="Assistant is thinking">
              <div className="chat-message__meta">
                <span className="chat-message__label">Assistant</span>
              </div>
              <div className="chat-message__bubble">
                <span aria-label="Thinking">Thinking...</span>
              </div>
            </article>
          )}

          {errorMessage && (
            <div className="chat-error" role="alert">
              {errorMessage}
            </div>
          )}

          {messages.length === 1 && (
            <section className="suggested-prompts" aria-label="Suggested career assistant prompts">
              <div className="suggested-prompts__header">
                <span>Suggested prompts</span>
              </div>
              <div className="suggested-prompts__list">
                {suggestedPrompts.map((prompt) => (
                  <button key={prompt} type="button" className="suggestion-button" onClick={() => sendMessage(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          )}
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
              <button type="button" className="chat-stop-button" onClick={handleStop} aria-label="Stop generation">
                Stop
              </button>
            ) : null}
            {showJump && (
              <button type="button" className="chat-jump-button" onClick={jumpToLatest} aria-label="Jump to latest">
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
