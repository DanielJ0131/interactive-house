export type Zone = {
    id: string;
    name: string;
};

export type DeviceType = "light" | "tv" | "thermometer" | "door" | "coffee" | "microwave";

export type Device = {
    id: string;
    zoneId: string;
    name: string;
    type: DeviceType;
    online: boolean;
    state: Record<string, unknown>; // e.g. { power: true, brightness: 80 }
};

export type UiControl =
    | { id: string; type: "toggle"; label: string; command: string }
    | { id: string; type: "slider"; label: string; command: string; min: number; max: number }
    | { id: string; type: "button"; label: string; command: string };

export type DeviceUiDefinition = {
    deviceId: string;
    title: string;
    controls: UiControl[];
};
