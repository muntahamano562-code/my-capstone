import { render, screen } from '@testing-library/react';

function Smoke() {
  return (
    <main>
      <h1>Smoke Test</h1>
      <button type="button">Click me</button>
    </main>
  );
}

describe('smoke test', () => {
  it('renders a heading and button', () => {
    render(<Smoke />);
    expect(screen.getByRole('heading', { name: 'Smoke Test' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });
});
