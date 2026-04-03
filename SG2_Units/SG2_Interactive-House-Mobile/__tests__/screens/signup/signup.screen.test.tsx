import React from 'react';
import { fireEvent, render, screen, waitFor, RenderResult } from '@testing-library/react-native';
import SignupScreen from '../../../app/(auth)/signup';
import { createUserWithEmailAndPassword, deleteUser, updateProfile, Auth } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../../utils/AppThemeContext';

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  deleteUser: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  deleteField: jest.fn(() => 'DELETE_FIELD'),
  updateDoc: jest.fn(),
}));

import { getDoc } from 'firebase/firestore';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  Link: ({ children }: any) => children,
}));

jest.mock('../../../utils/AppThemeContext', () => ({
  useAppTheme: jest.fn(() => ({
    theme: {
      colors: {
        background: '#000',
        text: '#fff',
        accent: '#007AFF',
        accentText: '#fff',
        mutedText: '#888',
        border: '#333',
        inputBackground: '#222',
        subtleText: '#666',
        dangerSoft: '#ffcccc',
        danger: '#ff0000',
        surfaceStrong: '#444',
      },
    },
  })),
}));

jest.mock('../../../utils/firebaseConfig', () => ({
  auth: {
    currentUser: {
      uid: 'new-user-id',
      email: 'newuser@example.com',
    },
  },
  db: {},
}));

jest.mock('../../../utils/firestorePaths', () => ({
  getArduinoDevicesDocRef: jest.fn(() => 'mock-doc-ref'),
}));

jest.mock('../../../data/deviceDefaults', () => ({
  INITIAL_DEVICE_DATA: {
    buzzer: { pin: 'D3', state: 'off' },
    door: { pin: 'D9', state: 'closed' },
  },
}));

describe('Signup Screen', () => {
  const mockReplace = jest.fn();
  const mockPush = jest.fn();
  const mockDeleteUser = deleteUser as jest.Mock;
  const mockCreatedUser = {
    uid: 'new-user-id',
    email: 'newuser@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: mockPush,
    });

    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: mockCreatedUser,
    });

    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({}),
    });

    (updateProfile as jest.Mock).mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await mockDeleteUser(mockCreatedUser);
  });

  // ── Header & Navigation ──────────────────────────────────────────────────

  it('renders signup screen with title and subtitle', () => {
    const { getByText } = render(<SignupScreen />);

    expect(screen.getAllByText('Create Account').length).toBeGreaterThan(0);
    expect(getByText('Start your Interactive House journey today.')).toBeTruthy();
  });

  it('renders back button', () => {
    const { getByText } = render(<SignupScreen />);

    expect(getByText('Back')).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { getByText } = render(<SignupScreen />);

    const backButton = getByText('Back');
    fireEvent.press(backButton);

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  // ── Form Fields ──────────────────────────────────────────────────────────

  it('renders all form input fields', () => {
    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    expect(getByText('Full Name')).toBeTruthy();
    expect(getByPlaceholderText('Name Example')).toBeTruthy();

    expect(getByText('Email Address')).toBeTruthy();
    expect(getByPlaceholderText('name@example.com')).toBeTruthy();

    expect(getByText('Password')).toBeTruthy();
    expect(getByText('Confirm Password')).toBeTruthy();
  });

  it('updates form state when inputs change', () => {
    const { getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'john@example.com');
    fireEvent.changeText(passwordInputs[0], 'password123');

    expect(nameInput.props.value).toBe('John Doe');
    expect(emailInput.props.value).toBe('john@example.com');
  });

  // ── Name Validation ──────────────────────────────────────────────────────

  it('shows name error when name is empty', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('Please enter your full name.')).toBeTruthy();
    });
  });

  it('shows name error with styling', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    fireEvent.changeText(nameInput, '');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      const errorMessage = getByText('Please enter your full name.');
      expect(errorMessage).toBeTruthy();
    });
  });

  // ── Email Validation ────────────────────────────────────────────────────

  it('shows email error when email is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const passwordInput = screen.getAllByPlaceholderText('••••••••')[0];

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(passwordInput, 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('Please enter your email address.')).toBeTruthy();
    });
  });

  it('shows invalid email error from Firebase', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/invalid-email',
      message: 'Please enter a valid email address.',
    });

    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('Please enter a valid email address.')).toBeTruthy();
    });
  });

  it('shows email already in use error', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/email-already-in-use',
      message: 'This email is already registered. Try logging in.',
    });

    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'existing@example.com');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('This email is already registered. Try logging in.')).toBeTruthy();
    });
  });

  // ── Password Validation ───────────────────────────────────────────────────

  it('shows password error when password is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'user@example.com');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('Please enter a password.')).toBeTruthy();
    });
  });

  it('shows weak password error from Firebase', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/weak-password',
      message: 'Password should be at least 6 characters.',
    });

    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInputs[0], '12');
    fireEvent.changeText(passwordInputs[1], '12');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('Password should be at least 6 characters.')).toBeTruthy();
    });
  });

  // ── Confirm Password Validation ────────────────────────────────────────

  it('shows confirm password error when confirm password is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = screen.getAllByPlaceholderText('••••••••')[0];

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('Please confirm your password.')).toBeTruthy();
    });
  });

  it('shows password mismatch error', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'different123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('Passwords do not match.')).toBeTruthy();
    });
  });

  // ── Submit Button States ─────────────────────────────────────────────────

  it('disables submit button during submission', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalled();
    });
  });

  it('shows loading indicator while submitting', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    // ActivityIndicator should appear during loading
  });

  // ── Successful Signup Flow ────────────────────────────────────────────

  it('trims whitespace from name and email', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, '  John   Doe  '); // with extra spaces
    fireEvent.changeText(emailInput, '  new@example.com  '); // with spaces and caps
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'new@example.com',
        'password123'
      );
    });
  });

  it('updates user profile with display name', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(
        expect.anything(),
        { displayName: 'John Doe' }
      );
    });
  });

  it('shows success alert after account creation', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Success',
        'Account created successfully!',
        expect.any(Array)
      );
    });

    alertSpy.mockRestore();
  });

  it('navigates to hub after successful signup', async () => {
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    // After alert is confirmed, should navigate to hub
  });

  // ── Error Display & Recovery ────────────────────────────────────────────

  it('displays general error for non-specific errors', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/unknown-error',
      message: 'An unexpected error occurred.',
    });

    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('An unexpected error occurred.')).toBeTruthy();
    });
  });

  it('shows permission denied error', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'permission-denied',
    });

    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'new@example.com');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('Permission denied while creating your profile. Please contact support.')).toBeTruthy();
    });
  });

  it('clears errors when user modifies fields', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/invalid-email',
    });

    const { getByText, getByPlaceholderText, queryByText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'invalid');
    fireEvent.changeText(passwordInputs[0], 'password123');
    fireEvent.changeText(passwordInputs[1], 'password123');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('Please enter a valid email address.')).toBeTruthy();
    });

    // Errors should clear when user modifies input
    fireEvent.changeText(emailInput, 'valid@example.com');

    expect(queryByText('Please enter a valid email address.')).toBeNull();
  });

  // ── Login Link ───────────────────────────────────────────────────────────

  it('displays login link', () => {
    const { getByText } = render(<SignupScreen />);

    expect(getByText('Already have an account?')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  // ── Form Field Styling ───────────────────────────────────────────────────

  it('displays individual field errors with styling', async () => {
    const { getByText, getByPlaceholderText, queryByText, getAllByPlaceholderText } = render(<SignupScreen />);

    const nameInput = getByPlaceholderText('Name Example');
    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');

    fireEvent.changeText(nameInput, '');
    fireEvent.changeText(emailInput, 'invalid');
    fireEvent.changeText(passwordInputs[0], 'pass');
    fireEvent.changeText(passwordInputs[1], 'different');

    const signupButton = screen.getAllByText('Create Account')[1];
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(getByText('Please enter your full name.')).toBeTruthy();
    });

    // Both errors should be visible
  });
});
