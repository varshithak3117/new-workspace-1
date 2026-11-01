/**
 * SmartSlope Voice Alert Engine
 * Features Kannada (ಕನ್ನಡ) & English Web SpeechSynthesis TTS with Audio Diagnostics and Subtitle Fallback
 */

class SmartSlopeVoice {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.enabled = true;
    this.currentLanguage = localStorage.getItem('smartslope_lang') || 'kn'; // 'kn' or 'en'
    this.voiceRate = 0.95; // slightly slower for rural clarity
    this.voicePitch = 1.0;
    this.kannadaVoice = null;
    this.englishVoice = null;
    this.isSupported = !!this.synth;
    this.hasKannadaTTS = false;
    this.speakingQueue = [];
    this.isSpeaking = false;

    this.initVoices();
  }

  initVoices() {
    if (!this.isSupported) {
      console.warn("SmartSlope: SpeechSynthesis not supported in this browser.");
      return;
    }

    const loadVoices = () => {
      const voices = this.synth.getVoices();
      
      // Look for Kannada voice (kn-IN or kn)
      this.kannadaVoice = voices.find(v => v.lang.startsWith('kn') || v.name.toLowerCase().includes('kannada'));
      this.hasKannadaTTS = !!this.kannadaVoice;

      // Look for Indian English or standard English voice
      this.englishVoice = voices.find(v => v.lang === 'en-IN') || 
                          voices.find(v => v.lang.startsWith('en')) || 
                          voices[0];

      if (this.hasKannadaTTS) {
        console.log("SmartSlope: Native Kannada voice loaded:", this.kannadaVoice.name);
      } else {
        console.log("SmartSlope: Kannada voice not natively found. Text banner & Indian English phonetic fallback enabled.");
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  setLanguage(lang) {
    this.currentLanguage = lang;
    localStorage.setItem('smartslope_lang', lang);
    console.log("SmartSlope: Language set to", lang);
  }

  toggleVoice(enable) {
    if (enable !== undefined) {
      this.enabled = enable;
    } else {
      this.enabled = !this.enabled;
    }
    localStorage.setItem('smartslope_voice_enabled', this.enabled ? '1' : '0');
    return this.enabled;
  }

  /**
   * Speak an alert in the active language, with visual subtitles and fallback
   * @param {Object} alertOptions - { kannadaText, englishText, severity }
   */
  speakAlert(alertOptions) {
    const { kannadaText, englishText, severity = 'info' } = alertOptions;

    // Show visual banner notification on screen always
    this.showSubtitleBanner(this.currentLanguage === 'kn' ? kannadaText : englishText, severity);

    if (!this.enabled || !this.isSupported) return;

    let textToSpeak = "";
    let voiceToUse = null;
    let langCode = "en-IN";

    if (this.currentLanguage === 'kn') {
      if (this.hasKannadaTTS && this.kannadaVoice) {
        textToSpeak = kannadaText;
        voiceToUse = this.kannadaVoice;
        langCode = "kn-IN";
      } else {
        // Fallback: If no Kannada TTS engine installed on the OS/browser,
        // we speak in English with an Indian accent so the farmer still hears the audible warning!
        textToSpeak = englishText || kannadaText;
        voiceToUse = this.englishVoice;
        langCode = "en-IN";
      }
    } else {
      textToSpeak = englishText;
      voiceToUse = this.englishVoice;
      langCode = "en-IN";
    }

    if (!textToSpeak) return;

    try {
      // Cancel previous speech if critical to avoid lag
      if (severity === 'critical') {
        this.synth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (voiceToUse) utterance.voice = voiceToUse;
      utterance.lang = langCode;
      utterance.rate = this.voiceRate;
      utterance.pitch = this.voicePitch;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.updateAudioIndicator(true);
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.updateAudioIndicator(false);
      };

      utterance.onerror = (e) => {
        console.warn("Speech error:", e);
        this.isSpeaking = false;
        this.updateAudioIndicator(false);
      };

      this.synth.speak(utterance);
    } catch (e) {
      console.error("SmartSlope Voice execution failed:", e);
    }
  }

  /**
   * Test speech alert with standard sample phrases
   */
  testAlert() {
    if (this.currentLanguage === 'kn') {
      this.speakAlert({
        kannadaText: "ಸ್ಮಾರ್ಟ್‌ಸ್ಲೋಪ್ ಪರೀಕ್ಷಾರ್ಥ ಧ್ವನಿ ಎಚ್ಚರಿಕೆ. ನಿಮ್ಮ ಅಡಿಕೆ ತೋಟದ ಇಳಿಜಾರು ನೀರಾವರಿ ವ್ಯವಸ್ಥೆ ಉತ್ತಮವಾಗಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿದೆ.",
        englishText: "SmartSlope voice test. Your sloping arecanut plantation irrigation system is operational.",
        severity: 'info'
      });
    } else {
      this.speakAlert({
        kannadaText: "ಸ್ಮಾರ್ಟ್‌ಸ್ಲೋಪ್ ಪರೀಕ್ಷಾರ್ಥ ಧ್ವನಿ ಎಚ್ಚರಿಕೆ.",
        englishText: "SmartSlope test alert. Your sloping arecanut plantation irrigation system is active and running normally.",
        severity: 'info'
      });
    }
  }

  /**
   * Specific alerts requested in the prompt
   */
  speakLowMoisture(landName, zoneName, moisture) {
    this.speakAlert({
      kannadaText: `${landName}, ${zoneName} ರಲ್ಲಿ ಮಣ್ಣಿನ ತೇವಾಂಶ ಕಡಿಮೆಯಾಗಿದೆ.`,
      englishText: `Low soil moisture in ${landName}, ${zoneName}. Irrigation is required.`,
      severity: 'warning'
    });
  }

  speakRunoffDetected(landName, zoneName) {
    this.speakAlert({
      kannadaText: `${landName} ರಲ್ಲಿ ನೀರು ಹರಿದುಹೋಗುವಿಕೆ ಪತ್ತೆಯಾಗಿದೆ. ನೀರಾವರಿಯನ್ನು ನಿಲ್ಲಿಸಲಾಗಿದೆ.`,
      englishText: `Runoff detected in ${landName}. Irrigation has been paused to protect topsoil.`,
      severity: 'critical'
    });
  }

  speakRainForecast(landName, rainProb) {
    this.speakAlert({
      kannadaText: `ಮಳೆ ಮುನ್ಸೂಚನೆ ಇದೆ. ನೀರಾವರಿ ಅಗತ್ಯವನ್ನು ಪರಿಶೀಲಿಸಿ.`,
      englishText: `Rain is forecast for ${landName}. Consider delaying irrigation to conserve water.`,
      severity: 'info'
    });
  }

  showSubtitleBanner(text, severity = 'info') {
    let banner = document.getElementById('voice-subtitle-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'voice-subtitle-banner';
      banner.className = 'voice-banner';
      document.body.appendChild(banner);
    }

    const icon = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : '📢';
    banner.innerHTML = `
      <div class="voice-banner-content ${severity}">
        <span class="voice-icon">${icon}</span>
        <div class="voice-text">
          <span class="voice-tag">${this.currentLanguage === 'kn' ? 'ಧ್ವನಿ ಎಚ್ಚರಿಕೆ (Voice Alert)' : 'Voice Alert'}</span>
          <p class="voice-msg">${text}</p>
        </div>
        <button class="voice-banner-close" onclick="this.parentElement.parentElement.classList.remove('active')">&times;</button>
      </div>
    `;

    banner.classList.add('active');

    // Auto dismiss after 6 seconds
    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      banner.classList.remove('active');
    }, 6000);
  }

  updateAudioIndicator(active) {
    const el = document.getElementById('audio-indicator-btn');
    if (el) {
      if (active) {
        el.classList.add('speaking');
      } else {
        el.classList.remove('speaking');
      }
    }
  }
}

// Global instance
window.smartSlopeVoice = new SmartSlopeVoice();
