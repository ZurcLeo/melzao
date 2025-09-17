import { useCallback } from 'react';

export const useSounds = () => {
  const playSound = useCallback(async (soundName: string) => {
    console.log(`🔊 Tentando tocar som: ${soundName}`);
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log(`🎵 AudioContext state: ${audioContext.state}`);

      // Ativar contexto de áudio se necessário (requisito do navegador)
      if (audioContext.state === 'suspended') {
        console.log('🔓 Resumindo AudioContext...');
        await audioContext.resume();
      }

      // Criar múltiplos osciladores para melodias
      const createTone = (frequency: number, startTime: number, duration: number, volume = 0.1) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, startTime);
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        return { oscillator, gainNode };
      };

      const now = audioContext.currentTime;

      switch(soundName) {
        case 'processing':
          // Som de tensão - pulsação repetitiva
          for(let i = 0; i < 4; i++) {
            const tone = createTone(220 - (i * 10), now + (i * 0.5), 0.3, 0.08);
            tone.oscillator.type = 'sawtooth';
          }
          break;

        case 'correct':
          // Melodia ascendente alegre - Dó, Mi, Sol, Dó
          createTone(523, now, 0.2, 0.15); // Dó
          createTone(659, now + 0.15, 0.2, 0.15); // Mi
          createTone(784, now + 0.3, 0.2, 0.15); // Sol
          createTone(1047, now + 0.45, 0.4, 0.2); // Dó oitava
          break;

        case 'incorrect':
          // Som descendente triste
          const incorrect1 = createTone(400, now, 0.3, 0.12);
          incorrect1.oscillator.type = 'square';
          const incorrect2 = createTone(300, now + 0.2, 0.4, 0.12);
          incorrect2.oscillator.type = 'square';
          break;

        case 'gameStart':
          // Fanfarra de início
          createTone(523, now, 0.15, 0.12); // Dó
          createTone(659, now + 0.1, 0.15, 0.12); // Mi
          createTone(784, now + 0.2, 0.15, 0.12); // Sol
          createTone(1047, now + 0.3, 0.3, 0.15); // Dó oitava
          break;

        case 'timeWarning':
          // Som de alerta para tempo acabando
          for(let i = 0; i < 3; i++) {
            const tone = createTone(800, now + (i * 0.3), 0.1, 0.1);
            tone.oscillator.type = 'square';
          }
          break;

        case 'elimination':
          // Som dramático de eliminação
          const elim1 = createTone(200, now, 0.5, 0.15);
          elim1.oscillator.type = 'sawtooth';
          const elim2 = createTone(150, now + 0.3, 0.7, 0.15);
          elim2.oscillator.type = 'sawtooth';
          break;

        case 'victory':
          // Melodia de vitória épica
          createTone(523, now, 0.2, 0.15); // Dó
          createTone(659, now + 0.15, 0.2, 0.15); // Mi
          createTone(784, now + 0.3, 0.2, 0.15); // Sol
          createTone(1047, now + 0.45, 0.2, 0.15); // Dó
          createTone(1319, now + 0.6, 0.4, 0.2); // Mi oitava
          break;
      }
    } catch (error) {
      console.log(`🔊 Som ${soundName} (Web Audio API não suportada)`, error);
    }
  }, []);

  return { playSound };
};