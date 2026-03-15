type HubController = {
    toggleDevice?: (id: string) => void
    setSlider?: (id: string, value: number) => void
    buzzerPress?: (id: string, pressed: boolean) => void
    toggleDirection?: (id: string) => void
    scrollDown?: () => void
}

const controller: HubController = {}

export function registerHubController(c: HubController): void {
  Object.assign(controller, c)
}
export function hubController(): HubController {
    return controller
}