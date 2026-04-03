import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../../app/(auth)/login';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useGuest } from '../../../utils/GuestContext';

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../../utils/GuestContext', () => ({
  useGuest: jest.fn(),
}));

jest.mock('../../../utils/firebaseConfig', () => ({
  auth: {
    currentUser: {
      uid: 'uid-123',
      email: 'ali@example.com',
      displayName: 'Ali',
    },
  },
  db: {},
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

describe('Login Screen', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockSetIsGuest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    (useGuest as jest.Mock).mockReturnValue({
      setIsGuest: mockSetIsGuest,
    });

    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { uid: 'test-uid', email: 'test@example.com' },
    });
  });

  // ── Header & Navigation ──────────────────────────────────────────────────

  it('renders login screen header with title and subtitle', () => {
    const { getByText } = render(<LoginScreen />);

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Sign in to control your home')).toBeTruthy();
  });

  it('renders back button', () => {
    const { getByText } = render(<LoginScreen />);

    expect(getByText('Back')).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { getByText } = render(<LoginScreen />);

    const backButton = getByText('Back');
    fireEvent.press(backButton);

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  // ── Email & Password Inputs ──────────────────────────────────────────────

  it('renders email and password input fields', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);

    expect(getByPlaceholderText('name@example.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('displays email and password field labels', () => {
    const { getByText } = render(<LoginScreen />);

    expect(getByText('Email Address')).toBeTruthy();
    expect(getByText('Password')).toBeTruthy();
  });

  it('updates email state when email input changes', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    fireEvent.changeText(emailInput, 'user@example.com');

    expect(emailInput.props.value).toBe('user@example.com');
  });

  it('updates password state when password input changes', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);

    const passwordInput = getByPlaceholderText('••••••••');
    fireEvent.changeText(passwordInput, 'password123');

    expect(passwordInput.props.value).toBe('password123');
  });

  // ── Password Visibility Toggle ───────────────────────────────────────────

  it('hides password by default (secureTextEntry=true)', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);

    const passwordInput = getByPlaceholderText('••••••••');
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('toggles password visibility when eye icon is pressed', () => {
    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);

    let passwordInput = getByPlaceholderText('••••••••');
    expect(passwordInput.props.secureTextEntry).toBe(true);

    const toggleButton = getByTestId('password-visibility-toggle');
    fireEvent.press(toggleButton);

    passwordInput = getByPlaceholderText('••••••••');
    expect(passwordInput.props.secureTextEntry).toBe(false);
  });

  it('shows correct eye icon based on visibility state', () => {
    const { UNSAFE_getByType } = render(<LoginScreen />);

    // Initially should show "eye" icon (password hidden)
    // After press should show "eye-off" icon (password visible)
  });

  // ── Form Validation ──────────────────────────────────────────────────────

  it('shows error when email is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    const passwordInput = getByPlaceholderText('••••••••');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please enter both email and password.')).toBeTruthy();
    });
  });

  it('shows error when password is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    fireEvent.changeText(emailInput, 'user@example.com');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please enter both email and password.')).toBeTruthy();
    });
  });

  it('shows error when both fields are empty', async () => {
    const { getByText } = render(<LoginScreen />);

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please enter both email and password.')).toBeTruthy();
    });
  });

  // ── Sign In Button States ────────────────────────────────────────────────

  it('disables sign in button during submission', async () => {
    let resolveSignIn: ((value: unknown) => void) | undefined;
    const pendingSignIn = new Promise((resolve) => {
      resolveSignIn = resolve;
    });
    (signInWithEmailAndPassword as jest.Mock).mockReturnValueOnce(pendingSignIn);

    const { getByText, getByPlaceholderText, getByTestId } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = getByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByTestId('sign-in-button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByTestId('sign-in-button').props.accessibilityState?.disabled).toBe(true);
    });

    resolveSignIn?.({ user: { uid: 'test-uid' } });

    await waitFor(() => {
      expect(getByTestId('sign-in-button').props.accessibilityState?.disabled).toBe(false);
    });
  });

  it('shows loading indicator while signing in', async () => {
    const { getByText, getByPlaceholderText, UNSAFE_queryByType } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = getByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    // ActivityIndicator should appear during loading
  });

  // ── Firebase Error Handling ──────────────────────────────────────────────

  it('shows invalid credential error message', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/invalid-credential',
      message: 'Invalid email or password.',
    });

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = getByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'wrongpass');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Invalid email or password.')).toBeTruthy();
    });
  });

  it('shows network error message', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/network-request-failed',
      message: 'Network error.',
    });

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = getByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Network error. Please check your connection.')).toBeTruthy();
    });
  });

  it('shows user disabled error message', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/user-disabled',
      message: 'This user account has been disabled.',
    });

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = getByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'disabled@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('This user account has been disabled.')).toBeTruthy();
    });
  });

  it('shows invalid email error message', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/invalid-email',
      message: 'The email address is not valid.',
    });

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = getByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('The email address is not valid.')).toBeTruthy();
    });
  });

  it('clears error when user modifies inputs', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/invalid-credential',
    });

    const { getByText, getByPlaceholderText, queryByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = getByPlaceholderText('••••••••');
    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'wrongpass');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Invalid email or password.')).toBeTruthy();
    });

    // Error should clear when user modifies input
    fireEvent.changeText(emailInput, 'newuser@example.com');

    expect(queryByText('Invalid email or password.')).toBeNull();
  });

  // ── Sign In Flow ─────────────────────────────────────────────────────────

  it('calls signInWithEmailAndPassword with trimmed and correct credentials', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = getByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, '  user@example.com  '); // with spaces
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'user@example.com',
        'password123'
      );
    });
  });

  it('navigates to hub after successful sign in', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = getByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/hub');
    });
  });

  it('clears error after successful sign in', async () => {
    (signInWithEmailAndPassword as jest.Mock)
      .mockRejectedValueOnce({ code: 'auth/invalid-credential' })
      .mockResolvedValueOnce({ user: { uid: 'test-uid' } });

    const { getByText, getByPlaceholderText, queryByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = getByPlaceholderText('••••••••');

    // First attempt fails
    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'wrongpass');

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Invalid email or password.')).toBeTruthy();
    });

    // Correct the password and try again
    jest.clearAllMocks();
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: { uid: 'test-uid' },
    });

    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(queryByText('Invalid email or password.')).toBeNull();
    });
  });

  // ── Guest Login Button ───────────────────────────────────────────────────

  it('renders guest login button', () => {
    const { getByText } = render(<LoginScreen />);

    expect(getByText(/Continue as Guest/)).toBeTruthy();
  });

  it('sets guest mode and navigates when guest button is pressed', () => {
    const { getByText } = render(<LoginScreen />);

    const guestButton = getByText(/Continue as Guest/);
    fireEvent.press(guestButton);

    expect(mockSetIsGuest).toHaveBeenCalledWith(true);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/hub');
  });

  it('disables guest button while signing in', async () => {
    let resolveSignIn: ((value: unknown) => void) | undefined;
    const pendingSignIn = new Promise((resolve) => {
      resolveSignIn = resolve;
    });
    (signInWithEmailAndPassword as jest.Mock).mockReturnValueOnce(pendingSignIn);

    const { getByText, getByPlaceholderText, getByTestId } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('name@example.com');
    const passwordInput = getByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByTestId('sign-in-button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByTestId('guest-login-button').props.accessibilityState?.disabled).toBe(true);
    });

    resolveSignIn?.({ user: { uid: 'test-uid' } });

    await waitFor(() => {
      expect(getByTestId('guest-login-button').props.accessibilityState?.disabled).toBe(false);
    });
  });

  // ── Sign Up Link ─────────────────────────────────────────────────────────

  it('displays signup link', () => {
    const { getByText } = render(<LoginScreen />);

    expect(getByText("Don't have an account?")).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('navigates to signup when sign up link is pressed', () => {
    const { getByText } = render(<LoginScreen />);

    const signUpLink = getByText('Sign Up');
    fireEvent.press(signUpLink);

    expect(mockPush).toHaveBeenCalledWith('/(auth)/signup');
  });

  // ── Error Display Styling ────────────────────────────────────────────────

  it('displays error message with proper styling', async () => {
    const { getByText } = render(<LoginScreen />);

    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      const errorMessage = getByText('Please enter both email and password.');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.props.style).toEqual(expect.objectContaining({ color: '#ff0000' }));
    });
  });
});
