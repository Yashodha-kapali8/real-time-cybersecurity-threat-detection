import { useCallback } from "react";

interface SoundOptions {
  volume?: number;
  playbackRate?: number;
}

interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const createAudioContext = (): AudioContext => {
  const audioWindow = window as WindowWithWebkitAudioContext;
  const AudioContextConstructor =
    window.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error("Web Audio API is not supported in this browser.");
  }

  return new AudioContextConstructor();
};

export const useSound = () => {
  const playThreatAlert = useCallback((options: SoundOptions = {}) => {
    const { volume = 0.5, playbackRate = 1 } = options;

    const audioContext = createAudioContext();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(
      1200,
      audioContext.currentTime + 0.1,
    );
    oscillator.frequency.setValueAtTime(
      800,
      audioContext.currentTime + 0.2,
    );

    oscillator.playbackRate.value = playbackRate;

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      volume,
      audioContext.currentTime + 0.01,
    );
    gainNode.gain.linearRampToValueAtTime(
      0,
      audioContext.currentTime + 0.3,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }, []);

  const playNotification = useCallback((options: SoundOptions = {}) => {
    const { volume = 0.3, playbackRate = 1 } = options;

    const audioContext = createAudioContext();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(
      523.25,
      audioContext.currentTime,
    );
    oscillator.frequency.setValueAtTime(
      659.25,
      audioContext.currentTime + 0.1,
    );

    oscillator.playbackRate.value = playbackRate;

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      volume,
      audioContext.currentTime + 0.01,
    );
    gainNode.gain.linearRampToValueAtTime(
      0,
      audioContext.currentTime + 0.2,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }, []);

  const playSuccess = useCallback((options: SoundOptions = {}) => {
    const { volume = 0.3, playbackRate = 1 } = options;

    const audioContext = createAudioContext();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(
      523.25,
      audioContext.currentTime,
    );
    oscillator.frequency.setValueAtTime(
      783.99,
      audioContext.currentTime + 0.1,
    );
    oscillator.frequency.setValueAtTime(
      1046.5,
      audioContext.currentTime + 0.2,
    );

    oscillator.playbackRate.value = playbackRate;

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      volume,
      audioContext.currentTime + 0.01,
    );
    gainNode.gain.linearRampToValueAtTime(
      0,
      audioContext.currentTime + 0.3,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }, []);

  return {
    playThreatAlert,
    playNotification,
    playSuccess,
  };
};