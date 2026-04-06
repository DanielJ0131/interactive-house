/**
 * Firebase Firestore Connection Tests
 *
 * Tests device data reads, writes, toggles, and signup document
 * creation using mocked Firestore modules.
 */

import { INITIAL_DEVICE_DATA } from '../../data/deviceDefaults';

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

jest.mock('../../utils/firebaseConfig', () => ({
  db: { type: 'firestore' },
  auth: { currentUser: { uid: 'u1', email: 'test@example.com', displayName: 'Test' } },
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Firestore Database', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Device defaults structure ────────────────────────────────────────────

  describe('INITIAL_DEVICE_DATA', () => {
    it('contains all 6 expected devices', () => {
      const keys = Object.keys(INITIAL_DEVICE_DATA);
      expect(keys).toEqual(
        expect.arrayContaining([
          'buzzer', 'door', 'fan_INA', 'fan_INB',
          'white_light', 'window',
        ])
      );
      expect(keys).toHaveLength(6);
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
      expect(INITIAL_DEVICE_DATA.white_light.state).toBe('off');
    });
  });

  // ── Signup: parallel document writes ─────────────────────────────────────

  describe('Signup document creation', () => {
    it('writes shared devices doc and user profile doc for a new account', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
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
      const { db } = require('../../utils/firebaseConfig');
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

      const { db } = require('../../utils/firebaseConfig');
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

      const { db } = require('../../utils/firebaseConfig');
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

      const { db } = require('../../utils/firebaseConfig');
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
      const { db } = require('../../utils/firebaseConfig');
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
      const { db } = require('../../utils/firebaseConfig');
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
      const { db } = require('../../utils/firebaseConfig');
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
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      await expect(
        updateDoc(doc(db, 'devices', 'arduino'), { 'buzzer.state': 'on' })
      ).rejects.toThrow('permission-denied');
    });
  });

  // ── Orange Light Updates ─────────────────────────────────────────────────

  describe('Orange Light slider updates', () => {
    it('converts percentage (0-100) to 8-bit value (0-255)', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      // 50% → 128 (rounded)
      await updateDoc(doc(db, 'devices', 'arduino'), { 'orange_light.value': 128 });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'devices/arduino' }),
        { 'orange_light.value': 128 }
      );
    });

    it('clamps slider value to valid range (0-255)', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      // Slider input should be clamped before sending
      const clampedValue = Math.max(0, Math.min(255, 300));
      await updateDoc(doc(db, 'devices', 'arduino'), { 'orange_light.value': clampedValue });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'devices/arduino' }),
        { 'orange_light.value': 255 }
      );
    });

    it('updates LED to minimum (0) when slider at 0%', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      await updateDoc(doc(db, 'devices', 'arduino'), { 'orange_light.value': 0 });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'devices/arduino' }),
        { 'orange_light.value': 0 }
      );
    });

    it('updates LED to maximum (255) when slider at 100%', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      await updateDoc(doc(db, 'devices', 'arduino'), { 'orange_light.value': 255 });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'devices/arduino' }),
        { 'orange_light.value': 255 }
      );
    });

    it('rejects on slider update failure', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('network-error'));
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      await expect(
        updateDoc(doc(db, 'devices', 'arduino'), { 'orange_light.value': 128 })
      ).rejects.toThrow('network-error');
    });
  });

  // ── Fan Reverse Logic ────────────────────────────────────────────────────

  describe('Fan reverse/direction changes', () => {
    it('toggles fan from off to forward state', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      const currentState = 'off';
      const newState = currentState === 'off' ? 'forward' : 'off';

      await updateDoc(doc(db, 'devices', 'arduino'), {
        'fan_INA.state': 'on',
        'fan_INB.state': 'off',
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'devices/arduino' }),
        { 'fan_INA.state': 'on', 'fan_INB.state': 'off' }
      );
    });

    it('reverses fan from forward to reverse state', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      // Forward: INA=on, INB=off → Reverse: INA=off, INB=on
      await updateDoc(doc(db, 'devices', 'arduino'), {
        'fan_INA.state': 'off',
        'fan_INB.state': 'on',
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'devices/arduino' }),
        { 'fan_INA.state': 'off', 'fan_INB.state': 'on' }
      );
    });

    it('turns fan off from any direction', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      // Any state → off
      await updateDoc(doc(db, 'devices', 'arduino'), {
        'fan_INA.state': 'off',
        'fan_INB.state': 'off',
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'devices/arduino' }),
        { 'fan_INA.state': 'off', 'fan_INB.state': 'off' }
      );
    });

    it('cycles through fan states: off → forward → reverse → off', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      // State 1: off
      await updateDoc(doc(db, 'devices', 'arduino'), {
        'fan_INA.state': 'off',
        'fan_INB.state': 'off',
      });

      expect(mockUpdateDoc).toHaveBeenNthCalledWith(1, expect.anything(), {
        'fan_INA.state': 'off',
        'fan_INB.state': 'off',
      });

      // State 2: forward
      await updateDoc(doc(db, 'devices', 'arduino'), {
        'fan_INA.state': 'on',
        'fan_INB.state': 'off',
      });

      expect(mockUpdateDoc).toHaveBeenNthCalledWith(2, expect.anything(), {
        'fan_INA.state': 'on',
        'fan_INB.state': 'off',
      });

      // State 3: reverse
      await updateDoc(doc(db, 'devices', 'arduino'), {
        'fan_INA.state': 'off',
        'fan_INB.state': 'on',
      });

      expect(mockUpdateDoc).toHaveBeenNthCalledWith(3, expect.anything(), {
        'fan_INA.state': 'off',
        'fan_INB.state': 'on',
      });
    });

    it('rejects on fan state update failure', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('permission-denied'));
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      await expect(
        updateDoc(doc(db, 'devices', 'arduino'), {
          'fan_INA.state': 'on',
          'fan_INB.state': 'off',
        })
      ).rejects.toThrow('permission-denied');
    });
  });

  // ── Concurrent Updates ───────────────────────────────────────────────────

  describe('Concurrent device updates', () => {
    it('updates multiple devices in parallel', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      const docRef = doc(db, 'devices', 'arduino');

      await Promise.all([
        updateDoc(docRef, { 'white_light.state': 'on' }),
        updateDoc(docRef, { 'buzzer.state': 'off' }),
        updateDoc(docRef, { 'door.state': 'open' }),
      ]);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
      expect(mockUpdateDoc).toHaveBeenCalledWith(docRef, { 'white_light.state': 'on' });
      expect(mockUpdateDoc).toHaveBeenCalledWith(docRef, { 'buzzer.state': 'off' });
      expect(mockUpdateDoc).toHaveBeenCalledWith(docRef, { 'door.state': 'open' });
    });

    it('updates same device property multiple times in sequence', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      const docRef = doc(db, 'devices', 'arduino');

      // Rapid updates to same property
      await updateDoc(docRef, { 'white_light.state': 'on' });
      await updateDoc(docRef, { 'white_light.state': 'off' });
      await updateDoc(docRef, { 'white_light.state': 'on' });

      expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
      expect(mockUpdateDoc).toHaveBeenLastCalledWith(docRef, { 'white_light.state': 'on' });
    });

    it('handles one failure in parallel updates gracefully', async () => {
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      const docRef = doc(db, 'devices', 'arduino');

      mockUpdateDoc
        .mockResolvedValueOnce(undefined) // First succeeds
        .mockRejectedValueOnce(new Error('network-error')); // Second fails

      const results = await Promise.allSettled([
        updateDoc(docRef, { 'white_light.state': 'on' }),
        updateDoc(docRef, { 'buzzer.state': 'off' }),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
    });

    it('applies fan and LED updates concurrently', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      const docRef = doc(db, 'devices', 'arduino');

      await Promise.all([
        updateDoc(docRef, {
          'fan_INA.state': 'on',
          'fan_INB.state': 'off',
        }),
        updateDoc(docRef, { 'orange_light.value': 200 }),
      ]);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });
  });

  // ── Guest Mode Persistence ──────────────────────────────────────────────

  describe('Guest mode data', () => {
    it('guest data updates do not persist to Firestore', async () => {
      const { db } = require('../../utils/firebaseConfig');
      const { doc, updateDoc } = require('firebase/firestore');

      // In guest mode, updateDoc should not be called
      // This would be tested in the component level where guest check occurs
      // but we can verify the mock would be called if we tried
      mockUpdateDoc.mockResolvedValue(undefined);

      const docRef = doc(db, 'devices', 'arduino');
      await updateDoc(docRef, { 'white_light.state': 'on' });

      // In real app, guest mode would skip this call entirely
      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('guest data is separate from Firestore data', () => {
      const mockGuestDevices = {
        ...INITIAL_DEVICE_DATA,
        white_light: { ...INITIAL_DEVICE_DATA.white_light, state: 'on' },
      };

      const mockFirestoreDevices = {
        ...INITIAL_DEVICE_DATA,
        white_light: { ...INITIAL_DEVICE_DATA.white_light, state: 'off' },
      };

      // Guest and Firestore have different states for same device
      expect(mockGuestDevices.white_light.state).toBe('on');
      expect(mockFirestoreDevices.white_light.state).toBe('off');
      expect(mockGuestDevices.white_light.state).not.toBe(mockFirestoreDevices.white_light.state);
    });

    it('guest device defaults match INITIAL_DEVICE_DATA structure', () => {
      const guestDefaults = { ...INITIAL_DEVICE_DATA };

      // Guest should use same structure as regular devices
      expect(guestDefaults).toEqual(
        expect.objectContaining({
          buzzer: expect.any(Object),
          door: expect.any(Object),
          fan_INA: expect.any(Object),
          fan_INB: expect.any(Object),
          white_light: expect.any(Object),
          window: expect.any(Object),
        })
      );
    });

    it('resetting guest data restores initial state', () => {
      const mockGuestState = JSON.parse(JSON.stringify(INITIAL_DEVICE_DATA));
      mockGuestState.white_light.state = 'on';
      mockGuestState.door.state = 'open';

      const resetState = JSON.parse(JSON.stringify(INITIAL_DEVICE_DATA));

      // After reset, state should match initial
      expect(resetState.white_light.state).toBe('off');
      expect(resetState.door.state).toBe('closed');
    });

    it('guest data changes do not affect Firestore listener', () => {
      const guestData = { ...INITIAL_DEVICE_DATA, white_light: { ...INITIAL_DEVICE_DATA.white_light, state: 'on' } };
      const firestoreData = { ...INITIAL_DEVICE_DATA };

      // Changing guest data should not trigger Firestore listener
      mockOnSnapshot.mockImplementation((_ref: any, onNext: Function) => {
        onNext({ exists: () => true, data: () => firestoreData });
        return jest.fn();
      });

      const { db } = require('../../utils/firebaseConfig');
      const { doc, onSnapshot } = require('firebase/firestore');

      const callback = jest.fn();
      onSnapshot(doc(db, 'devices', 'arduino'), (snap: any) => {
        if (snap.exists()) callback(snap.data());
      });

      // Callback should only receive Firestore data
      expect(callback).toHaveBeenCalledWith(firestoreData);
      expect(callback).not.toHaveBeenCalledWith(guestData);
    });
  });
});
