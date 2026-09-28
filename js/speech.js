(function () {
  const CCT = (window.CCT = window.CCT || {});
  const synth = window.speechSynthesis;
  let timer = null;
  let token = 0;
  let onEndCb = null;

  function settings() {
    return CCT.storage.get().settings;
  }

  function pickVoice() {
    if (!synth) return null;
    const uri = settings().voiceUri;
    const voices = synth.getVoices();
    if (uri) {
      const match = voices.find(function (v) {
        return v.voiceURI === uri;
      });
      if (match) return match;
    }
    const en = voices.filter(function (v) {
      return /^en(-|_)/i.test(v.lang);
    });
    const preferred = en.find(function (v) {
      return /natural|aria|jenny|samantha|google us/i.test(v.name);
    });
    return preferred || en[0] || voices[0] || null;
  }

  if (synth) {
    synth.addEventListener("voiceschanged", function () {
      pickVoice();
    });
  }

  function parseChoice(text) {
    const t = String(text || "")
      .trim()
      .toUpperCase()
      .replace(/OPTION|ANSWER|LETTER|CHOICE/gi, "")
      .trim();
    if (/^(A|B|C|D)$/.test(t)) return t;
    const words = {
      A: ["A", "AY", "HEY"],
      B: ["B", "BEE", "BE"],
      C: ["C", "SEE", "SEA"],
      D: ["D", "DEE", "THE"],
    };
    const cleaned = t.replace(/[^A-Z\s]/g, " ");
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1] || cleaned;
    let key;
    Object.keys(words).forEach(function (letter) {
      if (words[letter].indexOf(last) >= 0) key = letter;
    });
    if (key) return key;
    if (t.indexOf(" A") >= 0 || t.startsWith("A ")) return "A";
    if (t.indexOf(" B") >= 0 || t.startsWith("B ")) return "B";
    if (t.indexOf(" C") >= 0 || t.startsWith("C ")) return "C";
    if (t.indexOf(" D") >= 0 || t.startsWith("D ")) return "D";
    return null;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  let recActive = false;

  CCT.speech = {
    supported: !!synth,
    recognitionSupported: !!SR,
    parseChoice: parseChoice,
    listVoices: function () {
      if (!synth) return [];
      return synth.getVoices().filter(function (v) {
        return /^en(-|_)/i.test(v.lang);
      });
    },
    stop: function () {
      token += 1;
      onEndCb = null;
      if (timer) clearTimeout(timer);
      if (synth) synth.cancel();
      if (rec && recActive) {
        try {
          rec.stop();
        } catch (e) {
          /* ignore */
        }
      }
    },
    speak: function (text, opts) {
      opts = opts || {};
      if (!synth || !text) {
        if (opts.onEnd) opts.onEnd();
        return;
      }
      const myToken = ++token;
      onEndCb = opts.onEnd || null;
      if (timer) clearTimeout(timer);
      synth.cancel();
      timer = setTimeout(function () {
        if (myToken !== token) return;
        const utter = new SpeechSynthesisUtterance(String(text).slice(0, 4000));
        const voice = pickVoice();
        if (voice) utter.voice = voice;
        const rate = Number(settings().speechRate) || 1;
        utter.rate = Math.min(2, Math.max(0.8, rate));
        utter.pitch = 1;
        utter.lang = "en-US";
        utter.onend = function () {
          if (myToken !== token) return;
          const cb = onEndCb;
          onEndCb = null;
          if (cb) cb();
        };
        utter.onerror = function () {
          if (myToken !== token) return;
          const cb = onEndCb;
          onEndCb = null;
          if (cb) cb();
        };
        synth.speak(utter);
      }, 60);
    },
    startListening: function (handlers) {
      handlers = handlers || {};
      if (!SR) {
        if (handlers.onError) handlers.onError("Speech recognition not supported in this browser.");
        return;
      }
      if (recActive) return;
      rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      rec.onresult = function (event) {
        const heard = event.results[0][0].transcript;
        const choice = parseChoice(heard);
        if (handlers.onResult) handlers.onResult(choice, heard);
      };
      rec.onerror = function (event) {
        recActive = false;
        if (handlers.onError) handlers.onError(event.error || "listen-failed");
      };
      rec.onend = function () {
        recActive = false;
        if (handlers.onEnd) handlers.onEnd();
      };
      recActive = true;
      try {
        rec.start();
      } catch (e) {
        recActive = false;
        if (handlers.onError) handlers.onError(String(e.message || e));
      }
    },
    stopListening: function () {
      if (rec && recActive) {
        try {
          rec.stop();
        } catch (e) {
          /* ignore */
        }
      }
      recActive = false;
    },
    isListening: function () {
      return recActive;
    },
  };
})();
