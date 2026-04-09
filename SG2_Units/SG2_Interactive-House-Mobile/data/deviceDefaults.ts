export interface DeviceState {
  state?: string | null;
  value?: string | null;
  pin: string;
}

export interface DeviceData {
  buzzer: DeviceState;
  door: DeviceState;
  fan_INA: DeviceState;
  fan_INB: DeviceState;
  white_light: DeviceState;
  window: DeviceState;
}

export const INITIAL_DEVICE_DATA: DeviceData = {
  buzzer: {
    state: "off",
    value: "0",
    pin: "3"
  },
  door: {
    state: "closed",
    value: null,
    pin: "9"
  },
  fan_INA: {
    state: "off",
    value: null,
    pin: "7"
  },
  fan_INB: {
    state: "off",
    value: null,
    pin: "6"
  },
  white_light: {
    state: "off",
    value: null,
    pin: "13"
  },
  window: {
    state: "closed",
    value: null,
    pin: "10"
  }
};

export type DeviceKey = keyof DeviceData;