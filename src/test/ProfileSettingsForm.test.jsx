import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProfileSettingsForm from '../components/ProfileSettingsForm.jsx';

const username = () => screen.getByLabelText('Username');
const email = () => screen.getByLabelText('Email');
const password = () => screen.getByLabelText('Password');
const submit = () => screen.getByRole('button', { name: 'Save Profile' });

describe('ProfileSettingsForm — validation (invalid)', () => {
  it('blocks submission and shows validation messages for invalid input', () => {
    render(<ProfileSettingsForm />);

    // Submit must be disabled while the form is invalid (empty on load).
    expect(submit()).toBeDisabled();

    // Username too short.
    fireEvent.change(username(), { target: { value: 'ab' } });
    fireEvent.blur(username());
    expect(screen.getByText('Username must be at least 4 characters')).toBeInTheDocument();

    // Email invalid.
    fireEvent.change(email(), { target: { value: 'not-an-email' } });
    fireEvent.blur(email());
    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();

    // Password too short.
    fireEvent.change(password(), { target: { value: 'short' } });
    fireEvent.blur(password());
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();

    // Still invalid -> submit remains disabled and no success message.
    expect(submit()).toBeDisabled();
    expect(screen.queryByText('Profile updated successfully.')).not.toBeInTheDocument();
  });
});

describe('ProfileSettingsForm — valid submission', () => {
  it('shows the success status and resets the form on valid submit', () => {
    render(<ProfileSettingsForm />);

    fireEvent.change(username(), { target: { value: 'john_doe' } });
    fireEvent.change(email(), { target: { value: 'john@example.com' } });
    fireEvent.change(password(), { target: { value: 'password123' } });

    expect(submit()).toBeEnabled();

    fireEvent.click(submit());

    const success = screen.getByRole('status');
    expect(within(success).getByText('Profile updated successfully.')).toBeInTheDocument();

    // Form should be reset: inputs cleared and validation messages gone.
    expect(username()).toHaveValue('');
    expect(email()).toHaveValue('');
    expect(password()).toHaveValue('');
    expect(screen.queryByText('Username must be at least 4 characters')).not.toBeInTheDocument();
  });
});
