(function () {
  const CCT = (window.CCT = window.CCT || {});
  let ctx = null;

  /** Hands-free lesson queue player (uses CCT.speech). */
  const player = {
    queue: [],
    index: 0,
    domainFilter: null,
    playing: false,
    onChange: null,
  };

  function context() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, gain) {
    const audio = context();
    if (!audio) return;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, audio.currentTime + start);
    amp.gain.exponentialRampToValueAtTime(gain || 0.05, audio.currentTime + start + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(audio.currentTime + start);
    osc.stop(audio.currentTime + start + dur + 0.02);
  }

  function enabled() {
    return CCT.storage.get().settings.sfx !== false;
  }

  function notify() {
    if (typeof player.onChange === "function") player.onChange();
  }

  function lessonText(lesson) {
    return (
      lesson.title +
      ". " +
      lesson.paragraphs.join(" ") +
      " Lesson complete. Take a breath before the next one."
    );
  }

  function buildQueue(domainId) {
    player.domainFilter = domainId || null;
    const list = domainId
      ? CCT.lessonsByDomain(domainId)
      : CCT.lessonModules.slice();
    player.queue = list;
    player.index = 0;
    notify();
    return player;
  }

  function currentLesson() {
    return player.queue[player.index] || null;
  }

  function playLesson(lesson, opts) {
    opts = opts || {};
    if (!lesson) return;
    player.playing = true;
    notify();
    CCT.speech.speak(lessonText(lesson), {
      onEnd: function () {
        CCT.progress.markLessonComplete(lesson.id);
        player.playing = false;
        notify();
        if (opts.markOnly) return;
        const auto = CCT.storage.get().settings.autoAdvanceListen !== false;
        if (auto && player.index + 1 < player.queue.length) {
          player.index += 1;
          notify();
          playCurrent();
        }
      },
    });
  }

  function playCurrent() {
    const lesson = currentLesson();
    if (!lesson) return;
    playLesson(lesson);
  }

  CCT.audio = {
    correct: function () {
      if (!enabled()) return;
      tone(523.25, 0, 0.12, "sine", 0.04);
      tone(659.25, 0.09, 0.16, "sine", 0.04);
    },
    miss: function () {
      if (!enabled()) return;
      tone(196, 0, 0.18, "triangle", 0.03);
    },
  };

  CCT.player = {
    getState: function () {
      return {
        queue: player.queue,
        index: player.index,
        playing: player.playing,
        domainFilter: player.domainFilter,
        current: currentLesson(),
      };
    },
    setOnChange: function (fn) {
      player.onChange = fn;
    },
    buildQueue: buildQueue,
    playCurrent: playCurrent,
    playLesson: function (lesson) {
      playLesson(lesson, { markOnly: false });
    },
    playLessonOnce: function (lesson) {
      playLesson(lesson, { markOnly: true });
    },
    pause: function () {
      player.playing = false;
      CCT.speech.stop();
      notify();
    },
    next: function () {
      if (player.index + 1 >= player.queue.length) return false;
      CCT.speech.stop();
      player.index += 1;
      player.playing = false;
      notify();
      return true;
    },
    prev: function () {
      if (player.index <= 0) return false;
      CCT.speech.stop();
      player.index -= 1;
      player.playing = false;
      notify();
      return true;
    },
    jump: function (idx) {
      if (idx < 0 || idx >= player.queue.length) return;
      CCT.speech.stop();
      player.index = idx;
      player.playing = false;
      notify();
    },
  };
})();
