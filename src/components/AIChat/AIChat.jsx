import { useRef, useState } from 'react';
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
  const userMessageCounter = useRef(0);
  const assistantMessageCounter = useRef(0);

  const buildAssistantResponse = (question) => {
    const normalized = question.toLowerCase();

    if (normalized.includes('learn')) {
      return 'Based on your profile, you could strengthen your portfolio with a data-driven project that demonstrates business analysis and stakeholder communication.';
    }

    if (normalized.includes('skill') || normalized.includes('review')) {
      return 'Your current strengths look like a good foundation. I would prioritize improving technical communication, stakeholder storytelling, and one hands-on portfolio artifact.';
    }

    if (normalized.includes('project')) {
      return 'A strong next project would be a dashboard that turns customer feedback into a clear action plan for a product or operations team.';
    }

    return 'I recommend starting with a short skills gap review, then choosing one visible project that demonstrates measurable outcomes for your target role.';
  };

  const sendMessage = (question) => {
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
    setIsThinking(true);

    window.setTimeout(() => {
      const response = {
        id: `assistant-${assistantMessageCounter.current++}`,
        role: 'assistant',
        content: buildAssistantResponse(trimmedQuestion),
      };

      setMessages((currentMessages) => [...currentMessages, response]);
      setIsThinking(false);
    }, 450);
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
        <div className="chat-area" aria-live="polite" aria-relevant="additions text">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isThinking && (
            <article className="chat-message chat-message-assistant chat-message-thinking" aria-label="Assistant is thinking">
              <div className="chat-message__meta">
                <span className="chat-message__label">Assistant</span>
              </div>
              <div className="chat-message__bubble">
                <span aria-label="Thinking">Thinking...</span>
              </div>
            </article>
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

        <ChatInput
          value={draftMessage}
          onChange={setDraftMessage}
          onSend={() => sendMessage(draftMessage)}
          disabled={isThinking}
        />
      </section>
    </section>
  );
}

export default AIChat;
