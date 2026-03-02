import {
  getDeviceIconDetails,
  toggleDeviceState,
  toggleDeviceInRooms,
  Device,
} from '../utils/deviceLogic';

describe('deviceLogic', () => {
  test('toggleDeviceState toggles light on/off', () => {
    const d: Device = { id: '1', type: 'light', state: 'off' };
    expect(toggleDeviceState(d).state).toBe('on');
    expect(toggleDeviceState({ ...d, state: 'on' }).state).toBe('off');
  });

  test('toggleDeviceState toggles door open/closed', () => {
    const d: Device = { id: '1', type: 'door', state: 'closed' };
    expect(toggleDeviceState(d).state).toBe('open');
    expect(toggleDeviceState({ ...d, state: 'open' }).state).toBe('closed');
  });

  test('getDeviceIconDetails returns active light icon when on', () => {
    const icon = getDeviceIconDetails('light', 'on', 0);
    expect(icon.name).toBe('lightbulb');
    expect(icon.color).toBe('#fbbf24');
  });

  test('getDeviceIconDetails returns coffee active color when brewing', () => {
    const icon = getDeviceIconDetails('coffee_machine', 'off', 10);
    expect(icon.name).toBe('coffee');
    expect(icon.color).toBe('#a855f7');
  });

  test('toggleDeviceInRooms only updates the targeted device', () => {
    const rooms: Array<{ id: string; devices: Device[] }> = [
      { id: 'kitchen', devices: [{ id: 'a', type: 'light', state: 'off' }] },
      { id: 'hall', devices: [{ id: 'b', type: 'door', state: 'closed' }] },
    ];

    const updated = toggleDeviceInRooms(rooms, 'kitchen', 'a');

    expect(updated[0].devices[0].state).toBe('on');       // toggled
    expect(updated[1].devices[0].state).toBe('closed');  // unchanged
  });
});
