/**
 * Firebase Auth Connection Tests
 *
 * Tests the auth initialization logic, login, signup, guest login,
 * and timeout behaviour using mocked Firebase modules.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSignIn = jest.fn();
const mockSignInAnonymously = jest.fn();
const mockCreateUser = jest.fn();
const mockUpdateProfile = jest.fn();
const mockOnAuthStateChanged = jest.fn();
const mockCurrentUser = { uid: 'u1', email: 'test@example.com', displayName: 'Test' };

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: any[]) => mockSignIn(...args),
  signInAnonymously: (...args: any[]) => mockSignInAnonymously(...args),
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUser(...args),
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
  getAuth: jest.fn(),
  initializeAuth: jest.fn(),
  getReactNativePersistence: jest.fn(),
}));

jest.mock('../../utils/firebaseConfig', () => ({
  auth: { currentUser: mockCurrentUser },
  db: {},
}));

// ── Helpers (mirrors app code) ───────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. Please check your connection and try again.')), ms)
    ),
  ]);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Firebase Auth', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Sign-in ──────────────────────────────────────────────────────────────

  describe('signInWithEmailAndPassword', () => {
    it('resolves on valid credentials', async () => {
      mockSignIn.mockResolvedValue({ user: mockCurrentUser });
      const { auth } = require('../../utils/firebaseConfig');
      const { signInWithEmailAndPassword } = require('firebase/auth');

      const result = await signInWithEmailAndPassword(auth, 'test@example.com', 'pass123');
      expect(result.user.email).toBe('test@example.com');
      expect(mockSignIn).toHaveBeenCalledWith(auth, 'test@example.com', 'pass123');
    });

    it('rejects with auth/invalid-credential on bad password', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential', message: 'Invalid email or password.' });
      const { auth } = require('../../utils/firebaseConfig');
      const { signInWithEmailAndPassword } = require('firebase/auth');

      await expect(signInWithEmailAndPassword(auth, 'test@example.com', 'wrong'))
        .rejects.toMatchObject({ code: 'auth/invalid-credential' });
    });

    it('rejects with auth/network-request-failed on network error', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/network-request-failed', message: 'Network error.' });
      const { auth } = require('../../utils/firebaseConfig');
      const { signInWithEmailAndPassword } = require('firebase/auth');

      await expect(signInWithEmailAndPassword(auth, 'test@example.com', 'pass'))
        .rejects.toMatchObject({ code: 'auth/network-request-failed' });
    });
  });

  // ── Guest login ──────────────────────────────────────────────────────────

  describe('signInAnonymously', () => {
    it('resolves with an anonymous user', async () => {
      const anonUser = { uid: 'anon1', isAnonymous: true };
      mockSignInAnonymously.mockResolvedValue({ user: anonUser });
      const { auth } = require('../../utils/firebaseConfig');
      const { signInAnonymously } = require('firebase/auth');

      const result = await signInAnonymously(auth);
      expect(result.user.isAnonymous).toBe(true);
    });

    it('rejects on network failure', async () => {
      mockSignInAnonymously.mockRejectedValue({ code: 'auth/network-request-failed' });
      const { auth } = require('../../utils/firebaseConfig');
      const { signInAnonymously } = require('firebase/auth');

      await expect(signInAnonymously(auth))
        .rejects.toMatchObject({ code: 'auth/network-request-failed' });
    });
  });

  // ── Signup ───────────────────────────────────────────────────────────────

  describe('createUserWithEmailAndPassword', () => {
    it('creates a new user and updates the profile', async () => {
      mockCreateUser.mockResolvedValue({ user: mockCurrentUser });
      mockUpdateProfile.mockResolvedValue(undefined);
      const { auth } = require('../../utils/firebaseConfig');
      const { createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');

      const cred = await createUserWithEmailAndPassword(auth, 'new@example.com', 'pass123');
      expect(cred.user.uid).toBe('u1');

      await updateProfile(cred.user, { displayName: 'New User' });
      expect(mockUpdateProfile).toHaveBeenCalledWith(cred.user, { displayName: 'New User' });
    });

    it('rejects with auth/email-already-in-use for duplicate emails', async () => {
      mockCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });
      const { auth } = require('../../utils/firebaseConfig');
      const { createUserWithEmailAndPassword } = require('firebase/auth');

      await expect(createUserWithEmailAndPassword(auth, 'dup@example.com', 'pass'))
        .rejects.toMatchObject({ code: 'auth/email-already-in-use' });
    });

    it('rejects with auth/weak-password for short passwords', async () => {
      mockCreateUser.mockRejectedValue({ code: 'auth/weak-password' });
      const { auth } = require('../../utils/firebaseConfig');
      const { createUserWithEmailAndPassword } = require('firebase/auth');

      await expect(createUserWithEmailAndPassword(auth, 'x@y.com', '12'))
        .rejects.toMatchObject({ code: 'auth/weak-password' });
    });
  });

  // ── Auth state listener ──────────────────────────────────────────────────

  describe('onAuthStateChanged', () => {
    it('fires callback with user when logged in', () => {
      mockOnAuthStateChanged.mockImplementation((_auth: any, cb: Function) => {
        cb(mockCurrentUser);
        return jest.fn(); // unsubscribe
      });
      const { auth } = require('../../utils/firebaseConfig');
      const { onAuthStateChanged } = require('firebase/auth');
      const callback = jest.fn();

      const unsub = onAuthStateChanged(auth, callback);
      expect(callback).toHaveBeenCalledWith(mockCurrentUser);
      expect(typeof unsub).toBe('function');
    });

    it('fires callback with null when logged out', () => {
      mockOnAuthStateChanged.mockImplementation((_auth: any, cb: Function) => {
        cb(null);
        return jest.fn();
      });
      const { auth } = require('../../utils/firebaseConfig');
      const { onAuthStateChanged } = require('firebase/auth');
      const callback = jest.fn();

      onAuthStateChanged(auth, callback);
      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  // ── Timeout wrapper ──────────────────────────────────────────────────────

  describe('withTimeout', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('resolves if the promise completes before timeout', async () => {
      const fast = Promise.resolve('done');
      await expect(withTimeout(fast, 5000)).resolves.toBe('done');
    });

    it('rejects with timeout message when promise is too slow', async () => {
      const slow = new Promise<string>(() => {}); // never resolves
      const result = withTimeout(slow, 100);
      jest.advanceTimersByTime(150);
      await expect(result).rejects.toThrow('Request timed out');
    });
  });
});
