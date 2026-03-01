// utils/deviceLogic.ts

export type DeviceType = 'light' | 'window' | 'door' | 'coffee_machine' | string;

export type Device = {
  id: string;
  type: DeviceType;
  state: string; // 'on'|'off'|'open'|'closed' etc
  label?: string;
};

export type IconDetails = {
  name: string;
  color: string;
};

/**
 * Returns the icon name + color based on device type/state.
 * Coffee machine uses brewing progress to decide active color.
 */
export function getDeviceIconDetails(
  type: DeviceType,
  state: string,
  brewingProgress: number = 0
): IconDetails {
  const isBrewing = brewingProgress > 0;
  const isActive = ['on', 'open'].includes(state) || isBrewing;

  switch (type) {
    case 'light':
      return {
        name: isActive ? 'lightbulb' : 'lightbulb-outline',
        color: isActive ? '#fbbf24' : '#64748b',
      };

    case 'window':
      return {
        name: isActive ? 'window-open-variant' : 'window-closed-variant',
        color: isActive ? '#0ea5e9' : '#64748b',
      };

    case 'door':
      return {
        name: isActive ? 'door-open' : 'door-closed',
        color: isActive ? '#0ea5e9' : '#64748b',
      };

    case 'coffee_machine':
      return {
        name: 'coffee',
        color: isBrewing ? '#a855f7' : '#64748b',
      };

    default:
      return { name: 'help-circle-outline', color: '#64748b' };
  }
}

/**
 * Toggles a single device:
 * - light/coffee_machine: on <-> off
 * - door/window: open <-> closed
 */
export function toggleDeviceState(device: Device): Device {
  const isOnOff = ['light', 'coffee_machine'].includes(device.type);

  const newState = isOnOff
    ? device.state === 'on'
      ? 'off'
      : 'on'
    : device.state === 'open'
      ? 'closed'
      : 'open';

  return { ...device, state: newState };
}

/**
 * Returns a new rooms array where a specific device state is toggled.
 * This keeps the update immutable (no in-place mutation).
 */
export function toggleDeviceInRooms(
  rooms: Array<{ id: string; devices: Device[] }>,
  roomId: string,
  deviceId: string
) {
  return rooms.map((room) => {
    if (room.id !== roomId) return room;

    return {
      ...room,
      devices: room.devices.map((d) => (d.id === deviceId ? toggleDeviceState(d) : d)),
    };
  });
}
