import {
  registerHubController,
  hubController,
} from "../../utils/hubController";

describe("hubController", () => {
  it("returns the registered hub controller functions", () => {
    const toggleDevice = jest.fn();
    const setSlider = jest.fn();
    const buzzerPress = jest.fn();
    const toggleDirection = jest.fn();
    const scrollDown = jest.fn();

    registerHubController({
      toggleDevice,
      setSlider,
      buzzerPress,
      toggleDirection,
      scrollDown,
    });

    const controller = hubController();

    expect(controller.toggleDevice).toBe(toggleDevice);
    expect(controller.setSlider).toBe(setSlider);
    expect(controller.buzzerPress).toBe(buzzerPress);
    expect(controller.toggleDirection).toBe(toggleDirection);
    expect(controller.scrollDown).toBe(scrollDown);
  });

  it("merges newly registered properties into the same controller object", () => {
    const toggleDevice = jest.fn();
    const scrollDown = jest.fn();

    registerHubController({ toggleDevice });
    registerHubController({ scrollDown });

    const controller = hubController();

    expect(controller.toggleDevice).toBe(toggleDevice);
    expect(controller.scrollDown).toBe(scrollDown);
  });

  it("calls registered functions with expected arguments", async () => {
    const toggleDevice = jest.fn().mockResolvedValue(undefined);
    const setSlider = jest.fn();
    const buzzerPress = jest.fn();
    const toggleDirection = jest.fn();

    registerHubController({
      toggleDevice,
      setSlider,
      buzzerPress,
      toggleDirection,
    });

    await hubController().toggleDevice?.("lamp" as any);
    hubController().setSlider?.("speaker" as any, 75);
    hubController().buzzerPress?.("alarm" as any, true);
    hubController().toggleDirection?.("blind" as any);

    expect(toggleDevice).toHaveBeenCalledWith("lamp");
    expect(setSlider).toHaveBeenCalledWith("speaker", 75);
    expect(buzzerPress).toHaveBeenCalledWith("alarm", true);
    expect(toggleDirection).toHaveBeenCalledWith("blind");
  });
});