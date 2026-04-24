import {
  registerEmergencyController,
  getEmergencyController,
} from "../../utils/emergencyController";

describe("emergencyController", () => {
  it("returns the registered controller", () => {
    const startCall = jest.fn();

    registerEmergencyController({ startCall });

    const controller = getEmergencyController();

    expect(controller.startCall).toBe(startCall);
  });

  it("keeps previously registered functions when adding new properties", () => {
    const startCall = jest.fn();

    registerEmergencyController({ startCall });
    registerEmergencyController({});

    const controller = getEmergencyController();

    expect(controller.startCall).toBe(startCall);
  });

  it("calls the registered startCall function", () => {
    const startCall = jest.fn();

    registerEmergencyController({ startCall });

    getEmergencyController().startCall?.();

    expect(startCall).toHaveBeenCalledTimes(1);
  });

  it("returns same instance (singleton behavior)", () => {
    const controller1 = getEmergencyController();
    const controller2 = getEmergencyController();

    expect(controller1).toBe(controller2);
  });
});