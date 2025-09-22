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

      // Criar múltiplos osciladores para melodias com efeitos
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

      // Criar tom com filtro passa-baixa
      const createFilteredTone = (frequency: number, startTime: number, duration: number, volume = 0.1, cutoff = 800) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, startTime);
        filter.Q.setValueAtTime(1, startTime);

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, startTime);
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        return { oscillator, gainNode, filter };
      };

      // Criar tom com reverb simulado (delay)
      const createReverbTone = (frequency: number, startTime: number, duration: number, volume = 0.1) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const delay = audioContext.createDelay(0.3);
        const delayGain = audioContext.createGain();

        delay.delayTime.setValueAtTime(0.1, startTime);
        delayGain.gain.setValueAtTime(0.3, startTime);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, startTime);
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        return { oscillator, gainNode, delay, delayGain };
      };

      // Criar tom com distorção sutil usando waveshaper
      const createDistortedTone = (frequency: number, startTime: number, duration: number, volume = 0.1) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const waveshaper = audioContext.createWaveShaper();

        // Curva de distorção sutil
        const samples = 44100;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = (i - samples / 2) / (samples / 2);
          curve[i] = Math.tanh(x * 2) * 0.7; // Distorção suave
        }
        waveshaper.curve = curve;

        oscillator.connect(waveshaper);
        waveshaper.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, startTime);
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        return { oscillator, gainNode, waveshaper };
      };

      const now = audioContext.currentTime;

      switch(soundName) {
        case 'processing':
          // Suspense com progressão menor e filtro passa-baixa
          // Progressão: Am - F - C - G (em tonalidades menores)
          const chordTimes = [0, 0.6, 1.2, 1.8];
          const minorChords = [
            [220, 261, 330], // A menor
            [175, 208, 261], // F menor
            [196, 233, 294], // G menor
            [165, 196, 247]  // D menor
          ];

          minorChords.forEach((chord, chordIndex) => {
            chord.forEach((freq, noteIndex) => {
              const tone = createFilteredTone(
                freq,
                now + chordTimes[chordIndex] + (noteIndex * 0.05),
                0.8,
                0.06,
                400 - (chordIndex * 50) // Filtro diminuindo gradualmente
              );
              tone.oscillator.type = 'sawtooth';
            });
          });
          break;

        case 'correct':
          // Arpejo maior (Dó-Mi-Sol) com reverb
          const arpeggioNotes = [523, 659, 784, 1047]; // Dó, Mi, Sol, Dó oitava
          const arpeggioTimes = [0, 0.12, 0.24, 0.36];

          arpeggioNotes.forEach((freq, index) => {
            const tone = createReverbTone(
              freq,
              now + arpeggioTimes[index],
              0.6,
              0.12
            );
            tone.oscillator.type = 'triangle'; // Tom mais suave e musical
          });
          break;

        case 'incorrect':
          // Dissonância (trítono) com distorção sutil
          console.log('🔊 Tocando som de erro...');

          try {
            // Trítono: Fá# e Dó (intervalo mais dissonante)
            const tritoneNotes = [370, 523]; // Fá# e Dó

            tritoneNotes.forEach((freq, index) => {
              const tone = createDistortedTone(
                freq,
                now + (index * 0.1),
                0.8,
                0.1
              );
              tone.oscillator.type = 'sawtooth';
            });

            // Nota descendente final para reforçar erro
            const finalError = createDistortedTone(277, now + 0.5, 0.6, 0.08);
            finalError.oscillator.type = 'square';
          } catch (errorSound) {
            console.log('🔊 Erro no som distorcido, usando fallback...');
            // Fallback para som simples se a distorção falhar
            const simple1 = createTone(400, now, 0.3, 0.12);
            simple1.oscillator.type = 'square';
            const simple2 = createTone(300, now + 0.2, 0.4, 0.12);
            simple2.oscillator.type = 'square';
          }
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
          // Fanfarra em Dó Maior com brilho (oitavas altas)
          const fanfareNotes = [
            [523, 659, 784], // Acorde Dó Maior
            [587, 740, 880], // Acorde Ré Maior
            [659, 831, 988], // Acorde Mi Maior
            [784, 988, 1175, 1568] // Acorde Sol Maior com oitava alta
          ];
          const fanfareTimes = [0, 0.25, 0.5, 0.75];

          fanfareNotes.forEach((chord, chordIndex) => {
            chord.forEach((freq, noteIndex) => {
              const tone = createReverbTone(
                freq,
                now + fanfareTimes[chordIndex] + (noteIndex * 0.02),
                0.8,
                0.15
              );
              tone.oscillator.type = 'sawtooth'; // Mais brilhante
            });
          });

          // Nota final triunfante em oitava alta
          setTimeout(() => {
            const finalTone = createReverbTone(1047, now + 1.2, 1.5, 0.2);
            finalTone.oscillator.type = 'triangle';
          }, 50);
          break;
      }
    } catch (error) {
      console.log(`🔊 Som ${soundName} (Web Audio API não suportada)`, error);
    }
  }, []);

  return { playSound };
};