import { DeviceKey } from "../data/deviceDefaults";

type HubController = {
  toggleDevice?: (id: DeviceKey) => Promise<void>;
  setSlider?: (id: DeviceKey, value: number) => void;
  buzzerPress?: (id: DeviceKey, pressed: boolean) => void;
  toggleDirection?: (id: DeviceKey) => void;
  scrollDown?: () => void;
};

const controller: HubController = {}

export function registerHubController(c: HubController): void {
  Object.assign(controller, c)
}
export function hubController(): HubController {
    return controller
}