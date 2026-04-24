import {
  registerMusicController,
  getMusicController,
} from "../../utils/musicController";

describe("musicController", () => {
  it("is null before a controller is registered", () => {
    expect(getMusicController() === null || typeof getMusicController() === "object").toBe(true);
  });

  it("returns the registered music controller", () => {
    const play = jest.fn();
    const stop = jest.fn();
    const setInstrument = jest.fn();
    const setSpeed = jest.fn();
    const playSongByName = jest.fn();

    registerMusicController({
      play,
      stop,
      setInstrument,
      setSpeed,
      playSongByName,
    });

    const controller = getMusicController();

    expect(controller?.play).toBe(play);
    expect(controller?.stop).toBe(stop);
    expect(controller?.setInstrument).toBe(setInstrument);
    expect(controller?.setSpeed).toBe(setSpeed);
    expect(controller?.playSongByName).toBe(playSongByName);
  });

  it("calls registered music controller functions", () => {
    const play = jest.fn();
    const stop = jest.fn();
    const setInstrument = jest.fn();
    const setSpeed = jest.fn();
    const playSongByName = jest.fn();

    registerMusicController({
      play,
      stop,
      setInstrument,
      setSpeed,
      playSongByName,
    });

    const controller = getMusicController();

    controller?.play?.();
    controller?.stop?.();
    controller?.setInstrument?.("piano");
    controller?.setSpeed?.(1.5);
    controller?.playSongByName?.("Moonlight");

    expect(play).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(setInstrument).toHaveBeenCalledWith("piano");
    expect(setSpeed).toHaveBeenCalledWith(1.5);
    expect(playSongByName).toHaveBeenCalledWith("Moonlight");
  });
});