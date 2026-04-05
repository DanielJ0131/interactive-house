type EmergencyController = {
  startCall?: () => void;
};

const controller: EmergencyController = {};

export function registerEmergencyController(c: EmergencyController) {
  Object.assign(controller, c);
}

export function getEmergencyController(): EmergencyController {
  return controller;
}