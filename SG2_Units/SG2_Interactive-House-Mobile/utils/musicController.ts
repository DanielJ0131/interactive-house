type MusicController = {
  play?: () => void;
  stop?: () => void;
  setInstrument?: (inst: any) => void;
  setSpeed?: (speed: number) => void;
  playSongByName?: (name: string) => void;
};

let controller: MusicController | null = null;

export const registerMusicController = (c: MusicController) => {
  controller = c;
};

export const getMusicController = (): MusicController | null => {
  return controller;
};