// Sound Effects Manager
export const SoundEffects = {
  playBidSound: () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscNode = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscNode.frequency.setValueAtTime(800, audioContext.currentTime);
    oscNode.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscNode.start(audioContext.currentTime);
    oscNode.stop(audioContext.currentTime + 0.1);
  },

  playSellSound: () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523, 659, 784]; // C5, E5, G5
    
    notes.forEach((freq, idx) => {
      const oscNode = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscNode.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscNode.frequency.setValueAtTime(freq, audioContext.currentTime + idx * 0.05);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + idx * 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + idx * 0.05 + 0.15);
      
      oscNode.start(audioContext.currentTime + idx * 0.05);
      oscNode.stop(audioContext.currentTime + idx * 0.05 + 0.15);
    });
  },

  playUnsoldSound: () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscNode = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscNode.frequency.setValueAtTime(400, audioContext.currentTime);
    oscNode.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscNode.start(audioContext.currentTime);
    oscNode.stop(audioContext.currentTime + 0.3);
  },

  playTimerBeep: () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscNode = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscNode.frequency.setValueAtTime(1000, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    
    oscNode.start(audioContext.currentTime);
    oscNode.stop(audioContext.currentTime + 0.05);
  }
};
