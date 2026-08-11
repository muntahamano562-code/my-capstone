import { useRef, useState, useEffect } from 'react';
import './AIChat.css';

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

function ChatMessage({ message }) {
  const isAssistant = message.role === 'assistant';

  return (
    <article className={`chat-message chat-message-${isAssistant ? 'assistant' : 'user'}`} aria-label={isAssistant ? 'Assistant message' : 'User message'}>
      <div className="chat-message__meta">
        <span className="chat-message__label">{isAssistant ? 'Assistant' : 'You'}</span>
      </div>
      <div className="chat-message__bubble">
        {message.content}
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
          } else if (payload.type === 'done') {
            setIsStreaming(false);
          } else if (payload.type === 'error') {
            throw new Error(payload.message || 'Stream error');
          }
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        // user cancelled — do not show an alarming error
        setErrorMessage('Generation stopped.');
      } else {
        setErrorMessage(err.message || 'Unable to contact assistant.');
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
