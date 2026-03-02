import { Device, DeviceUiDefinition, Zone } from "./types";
// UI works without backend
export const zones: Zone[] = [
    { id: "living", name: "Living Room" },
    { id: "kitchen", name: "Kitchen" },
    { id: "bedroom", name: "Bed Room" },
    { id: "bathroom", name: "Bath Room" },
    { id: "office", name: "Office" },
    { id: "garage", name: "Garage" },
];

export const devices: Device[] = [
    { id: "d1", zoneId: "living", name: "Living Light", type: "light", online: true, state: { power: true, brightness: 70 } },
    { id: "d2", zoneId: "living", name: "TV", type: "tv", online: true, state: { power: false, volume: 15 } },
    { id: "d3", zoneId: "living", name: "Thermometer", type: "thermometer", online: true, state: { temp: 22.5 } },

    { id: "d4", zoneId: "kitchen", name: "Coffee Machine", type: "coffee", online: true, state: { power: false } },
    { id: "d5", zoneId: "kitchen", name: "Kitchen Light", type: "light", online: false, state: { power: false } },
    { id: "d6", zoneId: "kitchen", name: "Microwave", type: "microwave", online: true, state: { power: false } },

    { id: "d7", zoneId: "garage", name: "Garage Door", type: "door", online: true, state: { open: false } },
];

export const deviceUiByDeviceId: Record<string, DeviceUiDefinition> = {
    d1: {
        deviceId: "d1",
        title: "Living Light",
        controls: [
        { id: "power", type: "toggle", label: "Power", command: "setPower" },
        { id: "brightness", type: "slider", label: "Brightness", command: "setBrightness", min: 0, max: 100 },
    ],
},
    d2: {
        deviceId: "d2",
        title: "TV",
    controls: [
        { id: "power", type: "toggle", label: "Power", command: "setPower" },
        { id: "volume", type: "slider", label: "Volume", command: "setVolume", min: 0, max: 100 },
        { id: "mute", type: "button", label: "Mute", command: "mute" },
    ],
 },
    d3: {
        deviceId: "d3",
        title: "Thermometer",
        controls: [{ id: "refresh", type: "button", label: "Refresh", command: "refresh" }],
},
    d4: {
        deviceId: "d4",
        title: "Coffee Machine",
    controls: [
        { id: "power", type: "toggle", label: "Power", command: "setPower" },
        { id: "brew", type: "button", label: "Brew", command: "brew" },
    ],
},
    d5: {
        deviceId: "d5",
        title: "Kitchen Light",
    controls: [{ id: "power", type: "toggle", label: "Power", command: "setPower" }],
},
    d6: {
        deviceId: "d6",
        title: "Microwave",
    controls: [
        { id: "power", type: "toggle", label: "Power", command: "setPower" },
        { id: "start", type: "button", label: "Start", command: "start" },
    ],
},
    d7: {
        deviceId: "d7",
        title: "Garage Door",
    controls: [
        { id: "open", type: "button", label: "Open", command: "openDoor" },
        { id: "close", type: "button", label: "Close", command: "closeDoor" },
    ],
},
};
