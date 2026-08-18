import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToolCallCard } from '../components/AIChat/AIChat.jsx';

describe('ToolCallCard — streaming', () => {
  it('shows the preparing/loading state while streaming', () => {
    render(<ToolCallCard toolCall={{ status: 'streaming' }} />);

    const card = screen.getByRole('article', { name: 'Preparing GitHub analysis' });
    expect(within(card).getByText(/Preparing GitHub analysis/i)).toBeInTheDocument();
  });
});

describe('ToolCallCard — input-available', () => {
  it('shows the GitHub analysis input with the username', () => {
    render(
      <ToolCallCard toolCall={{ status: 'input-available', input: { username: 'torvalds' } }} />,
    );

    const card = screen.getByRole('article', { name: 'GitHub analysis input' });
    expect(within(card).getByText('Analyzing GitHub')).toBeInTheDocument();
    expect(within(card).getByText('torvalds')).toBeInTheDocument();
  });
});

describe('ToolCallCard — available (result)', () => {
  it('renders the GitHub analysis result with key user-visible data', () => {
    const output = {
      username: 'torvalds',
      publicRepos: 25,
      followers: 1000,
      topLanguages: ['C', 'Shell', 'Python'],
      totalStars: 500,
      activityScore: 82,
      careerSummary: 'Torvalds has 25 public repositories and a strong open-source footprint.',
      recommendedFocus: ['Increase commit frequency', 'Diversify your stack'],
    };

    render(<ToolCallCard toolCall={{ status: 'available', output }} />);

    const card = screen.getByRole('article', {
      name: /GitHub analysis result for torvalds/i,
    });

    // Header username and activity level.
    expect(within(card).getByText('@torvalds')).toBeInTheDocument();
    expect(within(card).getByText('High')).toBeInTheDocument();

    // Overview stats are present.
    expect(within(card).getByText('Repositories')).toBeInTheDocument();
    expect(within(card).getByText('25')).toBeInTheDocument();
    expect(within(card).getByText('Stars')).toBeInTheDocument();
    expect(within(card).getByText('500')).toBeInTheDocument();

    // Top languages, career summary, and recommended focus.
    expect(within(card).getByText('C')).toBeInTheDocument();
    expect(
      within(card).getByText(/strong open-source footprint/i),
    ).toBeInTheDocument();
    expect(within(card).getByText('Increase commit frequency')).toBeInTheDocument();
  });
});

describe('ToolCallCard — error', () => {
  it('shows the failure state and an accessible Try again action that fires onRetry', () => {
    const onRetry = vi.fn();
    render(<ToolCallCard toolCall={{ status: 'error' }} onRetry={onRetry} />);

    const card = screen.getByRole('alert', { name: 'GitHub analysis failed' });
    expect(within(card).getByText('Analysis failed')).toBeInTheDocument();
    expect(
      within(card).getByText(/couldn't retrieve the GitHub profile/i),
    ).toBeInTheDocument();

    const retry = within(card).getByRole('button', { name: 'Try again' });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
