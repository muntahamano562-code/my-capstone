import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AIChat from '../components/AIChat/AIChat.jsx';

const encoder = new TextEncoder();

// Build a real SSE Response whose body is a ReadableStream emitting the same
// `data: {json}\n\n` event format the actual /api/chat handler produces, so the
// client-side stream parser is genuinely exercised.
function sseResponse(events, delay = 10) {
  const stream = new ReadableStream({
    async start(controller) {
      for (const ev of events) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const inputLabel = 'Message to AI Career Assistant';
const sendButton = () => screen.getByRole('button', { name: /Send/i });

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('AIChat — ChatMessage', () => {
  it('renders a user message with its visible content (Test 1)', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(sseResponse([{ type: 'chunk', text: 'Hi' }, { type: 'done' }])),
    );
    render(<AIChat />);

    fireEvent.change(screen.getByLabelText(inputLabel), {
      target: { value: 'Hello there' },
    });
    fireEvent.click(sendButton());

    const userMessage = await screen.findByRole('article', { name: 'User message' });
    expect(within(userMessage).getByText('Hello there')).toBeInTheDocument();
  });

  it('renders an assistant message with its visible content (Test 2)', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(
        sseResponse([
          { type: 'chunk', text: 'React ' },
          { type: 'chunk', text: 'hooks ' },
          { type: 'chunk', text: 'rule' },
          { type: 'done' },
        ]),
      ),
    );
    render(<AIChat />);

    fireEvent.change(screen.getByLabelText(inputLabel), {
      target: { value: 'Tell me about React' },
    });
    fireEvent.click(sendButton());

    const assistantMessage = await screen.findByRole('article', { name: 'Assistant message' });
    expect(await within(assistantMessage).findByText('React hooks rule')).toBeInTheDocument();
  });
});

describe('AIChat — pending/streaming/error states', () => {
  it('exposes a pending thinking state to assistive technology (Test 3)', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(sseResponse([{ type: 'chunk', text: 'ok' }, { type: 'done' }], 60)),
    );
    render(<AIChat />);

    fireEvent.change(screen.getByLabelText(inputLabel), { target: { value: 'Hi' } });
    fireEvent.click(sendButton());

    const pending = await screen.findByRole('article', {
      name: 'Assistant is preparing a response',
    });
    expect(pending).toHaveAttribute('aria-busy', 'true');

    // Allow the stream to finish so the component settles.
    await screen.findByRole('article', { name: 'Assistant message' });
  });

  it('streams multiple chunks and concatenates assistant text (Test 6)', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(
        sseResponse([
          { type: 'chunk', text: 'One ' },
          { type: 'chunk', text: 'two ' },
          { type: 'chunk', text: 'three' },
          { type: 'done' },
        ]),
      ),
    );
    render(<AIChat />);

    fireEvent.change(screen.getByLabelText(inputLabel), { target: { value: 'Go' } });
    fireEvent.click(sendButton());

    const assistantMessage = await screen.findByRole('article', { name: 'Assistant message' });
    expect(await within(assistantMessage).findByText('One two three')).toBeInTheDocument();
  });

  it('keeps Send disabled when empty and sends on input (Test 4)', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(sseResponse([{ type: 'chunk', text: 'x' }, { type: 'done' }])),
    );
    global.fetch = fetchMock;
    render(<AIChat />);

    const input = screen.getByLabelText(inputLabel);
    const send = sendButton();

    expect(send).toBeDisabled();

    fireEvent.change(input, { target: { value: 'My question' } });
    expect(send).toBeEnabled();

    fireEvent.click(send);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/chat');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    await screen.findByText('My question');
  });

  it('renders ErrorCard with message and accessible Retry for a network error (Test 5)', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('fetch failed')));
    global.fetch = fetchMock;
    render(<AIChat />);

    fireEvent.change(screen.getByLabelText(inputLabel), { target: { value: 'Hello' } });
    fireEvent.click(sendButton());

    const errorCard = await screen.findByRole('alert');
    expect(within(errorCard).getByText(/Unable to connect/i)).toBeInTheDocument();

    const retry = within(errorCard).getByRole('button', { name: 'Try again' });
    expect(retry).toBeInTheDocument();

    fireEvent.click(retry);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('surfaces an error UI with accessible Retry when the server errors (Test 7)', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse(500, { error: 'Server down' })),
    );
    global.fetch = fetchMock;
    render(<AIChat />);

    fireEvent.change(screen.getByLabelText(inputLabel), { target: { value: 'Hello' } });
    fireEvent.click(sendButton());

    const errorCard = await screen.findByRole('alert');
    expect(
      within(errorCard).getByText(/assistant service returned an error/i),
    ).toBeInTheDocument();
    expect(
      within(errorCard).getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
  });
});
