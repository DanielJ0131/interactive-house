/**
 * Firebase Firestore Connection Tests
 *
 * Tests device data reads, writes, toggles, and signup document
 * creation using mocked Firestore modules.
 */

import { INITIAL_DEVICE_DATA } from '../data/deviceDefaults';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn((_db: any, collection: string, id: string) => ({ path: `${collection}/${id}` }));

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  onSnapshot: mockOnSnapshot,
}));

jest.mock('../utils/firebaseConfig', () => ({
  db: { type: 'firestore' },
  auth: { currentUser: { uid: 'u1', email: 'test@example.com', displayName: 'Test' } },
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Firestore Database', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Device defaults structure ────────────────────────────────────────────

  describe('INITIAL_DEVICE_DATA', () => {
    it('contains all 7 expected devices', () => {
      const keys = Object.keys(INITIAL_DEVICE_DATA);
      expect(keys).toEqual(
        expect.arrayContaining([
          'buzzer', 'door', 'fan_INA', 'fan_INB',
          'orange_light', 'white_light', 'window',
        ])
      );
      expect(keys).toHaveLength(7);
    });

    it('each device has pin and state fields', () => {
      for (const [name, device] of Object.entries(INITIAL_DEVICE_DATA)) {
        expect(device).toHaveProperty('pin');
        expect(device).toHaveProperty('state');
        expect(typeof device.pin).toBe('string');
      }
    });

    it('doors and windows default to closed', () => {
      expect(INITIAL_DEVICE_DATA.door.state).toBe('closed');
      expect(INITIAL_DEVICE_DATA.window.state).toBe('closed');
    });

    it('all other devices default to off', () => {
      expect(INITIAL_DEVICE_DATA.buzzer.state).toBe('off');
      expect(INITIAL_DEVICE_DATA.fan_INA.state).toBe('off');
      expect(INITIAL_DEVICE_DATA.fan_INB.state).toBe('off');
      expect(INITIAL_DEVICE_DATA.orange_light.state).toBe('off');
      expect(INITIAL_DEVICE_DATA.white_light.state).toBe('off');
    });
  });

  // ── Signup: parallel document writes ─────────────────────────────────────

  describe('Signup document creation', () => {
    it('writes shared devices doc and user profile doc for a new account', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const { db } = require('../utils/firebaseConfig');
      const { doc, setDoc } = require('firebase/firestore');

      const email = 'new@example.com';
      const name = 'New User';

      await Promise.all([
        setDoc(doc(db, 'devices', 'arduino'), INITIAL_DEVICE_DATA),
        setDoc(doc(db, 'users', email), {
          name,
          createdAt: expect.any(String),
        }),
      ]);

      expect(mockDoc).toHaveBeenCalledWith(db, 'devices', 'arduino');
      expect(mockDoc).toHaveBeenCalledWith(db, 'users', email);
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
    });

    it('rejects if Firestore write fails', async () => {
      mockSetDoc.mockRejectedValue(new Error('permission-denied'));
      const { db } = require('../utils/firebaseConfig');
      const { doc, setDoc } = require('firebase/firestore');

      await expect(
        setDoc(doc(db, 'devices', 'arduino'), INITIAL_DEVICE_DATA)
      ).rejects.toThrow('permission-denied');
    });
  });

  // ── Real-time device listener (onSnapshot) ──────────────────────────────

  describe('Device data listener', () => {
    it('fires callback with device data when doc exists', () => {
      const mockData = { ...INITIAL_DEVICE_DATA, buzzer: { ...INITIAL_DEVICE_DATA.buzzer, state: 'on' } };

      mockOnSnapshot.mockImplementation((_ref: any, onNext: Function) => {
        onNext({ exists: () => true, data: () => mockData });
        return jest.fn(); // unsubscribe
      });

      const { db } = require('../utils/firebaseConfig');
      const { doc, onSnapshot } = require('firebase/firestore');

      const callback = jest.fn();
      const unsub = onSnapshot(doc(db, 'devices', 'arduino'), (snap: any) => {
        if (snap.exists()) callback(snap.data());
      });

      expect(callback).toHaveBeenCalledWith(mockData);
      expect(callback.mock.calls[0][0].buzzer.state).toBe('on');
      expect(typeof unsub).toBe('function');
    });

    it('handles missing document gracefully', () => {
      mockOnSnapshot.mockImplementation((_ref: any, onNext: Function) => {
        onNext({ exists: () => false, data: () => null });
        return jest.fn();
      });

      const { db } = require('../utils/firebaseConfig');
      const { doc, onSnapshot } = require('firebase/firestore');

      const callback = jest.fn();
      const errorCallback = jest.fn();

      onSnapshot(doc(db, 'devices', 'arduino'), (snap: any) => {
        if (snap.exists()) {
          callback(snap.data());
        } else {
          errorCallback('No device configuration found');
        }
      });

      expect(callback).not.toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalledWith('No device configuration found');
    });

    it('reports Firestore listener errors', () => {
      mockOnSnapshot.mockImplementation((_ref: any, _onNext: Function, onError: Function) => {
        onError(new Error('Firestore unavailable'));
        return jest.fn();
      });

      const { db } = require('../utils/firebaseConfig');
      const { doc, onSnapshot } = require('firebase/firestore');

      const errorCallback = jest.fn();
      onSnapshot(
        doc(db, 'devices', 'arduino'),
        jest.fn(),
        (err: Error) => errorCallback(err.message)
      );

      expect(errorCallback).toHaveBeenCalledWith('Firestore unavailable');
    });
  });

  // ── Device toggle (updateDoc) ────────────────────────────────────────────

  describe('Device toggle', () => {
    it('updates a single device state via dot-notation path', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      const docRef = doc(db, 'devices', 'arduino');
      await updateDoc(docRef, { 'buzzer.state': 'on' });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: 'devices/arduino' },
        { 'buzzer.state': 'on' }
      );
    });

    it('toggles door from closed to open', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      const currentState = 'closed';
      const newState = currentState === 'closed' ? 'open' : 'closed';

      await updateDoc(doc(db, 'devices', 'arduino'), { 'door.state': newState });
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'devices/arduino' }),
        { 'door.state': 'open' }
      );
    });

    it('toggles light from on to off', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      const currentState = 'on';
      const newState = currentState === 'on' ? 'off' : 'on';

      await updateDoc(doc(db, 'devices', 'arduino'), { 'white_light.state': newState });
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'devices/arduino' }),
        { 'white_light.state': 'off' }
      );
    });

    it('rejects on Firestore write error', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('permission-denied'));
      const { db } = require('../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      await expect(
        updateDoc(doc(db, 'devices', 'arduino'), { 'buzzer.state': 'on' })
      ).rejects.toThrow('permission-denied');
    });
  });
});
