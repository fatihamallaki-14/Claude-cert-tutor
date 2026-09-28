(function () {
  const CCT = window.CCT;
  const view = document.getElementById("view");
  const nav = document.querySelector(".nav");

  const ui = {
    view: "home",
    lessonId: null,
    session: null,
    tutorAiText: "",
    tutorAiError: "",
    listenDomain: "",
  };

  let timerId = null;

  function settings() {
    return CCT.storage.get().settings;
  }

  function applyTheme() {
    document.body.classList.toggle("light", settings().theme === "light");
    const color = settings().theme === "light" ? "#f6f4ff" : "#0e0f14";
    document.querySelector('meta[name="theme-color"]').setAttribute("content", color);
  }

  function clearTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function fmt(ms) {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function setNav() {
    nav.querySelectorAll("[data-view]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.view === ui.view);
    });
  }

  function armTimer() {
    clearTimer();
    const session = ui.session;
    if (!session || !session.timed || session.phase === "done" || session.phase === "empty") return;
    const tick = function () {
      const left = Math.max(0, session.deadline - Date.now());
      const clock = document.getElementById("clock");
      if (clock) {
        clock.textContent = fmt(left);
        clock.classList.toggle("urgent", left < 60000);
      }
      if (left <= 0) {
        clearTimer();
        CCT.quiz.expire(session);
        render();
      }
    };
    tick();
    timerId = setInterval(tick, 250);
  }

  function finish(session) {
    if (session.phase === "done" && !session.recorded) {
      session.recorded = true;
      session.result = CCT.progress.record(session);
    }
  }

  function lessonDone(id) {
    const data = CCT.storage.get();
    return !!(data.lessons[id] && data.lessons[id].completed);
  }

  function renderHome() {
    const ready = CCT.progress.readiness();
    const weak = ready.weakDomain;
    const misses = CCT.progress.missedIds().length;
    const next = ready.nextLesson;

    return (
      '<section class="home">' +
      '<p class="eyebrow">Dashboard</p>' +
      "<h2>Your study lane today</h2>" +
      '<div class="score-card">' +
      '<p class="kicker">Exam readiness</p>' +
      '<p class="score-big">' +
      ready.score +
      '<span class="score-of">/100</span></p>' +
      '<p class="level-pill">' +
      CCT.esc(ready.level.name) +
      "</p>" +
      "<p>Coverage " +
      ready.coverageScore +
      " · Accuracy " +
      (ready.accuracyScore || "—") +
      " · Consistency " +
      ready.consistencyScore +
      "</p></div>" +
      '<div class="next-card">' +
      "<h3>Study next</h3>" +
      "<p><strong>" +
      CCT.esc(next.title) +
      "</strong> — " +
      CCT.esc(CCT.tutor.domainName(next.domain)) +
      "</p>" +
      '<div class="actions row">' +
      '<button type="button" class="primary" data-action="open-lesson" data-id="' +
      next.id +
      '">Open lesson</button>' +
      '<button type="button" class="secondary" data-action="listen-lesson" data-id="' +
      next.id +
      '">Listen</button>' +
      "</div></div>" +
      '<div class="actions">' +
      '<button type="button" class="primary" data-action="practice" data-domain="' +
      weak.id +
      '">Practice ' +
      CCT.esc(weak.name) +
      "</button>" +
      '<button type="button" class="secondary" data-action="timed">Timed · 10 Q · 15 min</button>' +
      '<button type="button" class="secondary" data-action="mock">Full mock exam</button>' +
      '<button type="button" class="secondary" data-action="misses"' +
      (misses ? "" : " disabled") +
      ">Review misses" +
      (misses ? " (" + misses + ")" : "") +
      "</button></div>" +
      '<p class="fine">Passing line on the real exam is 720 out of 1000. This app is original practice content, not an official Anthropic exam.</p></section>'
    );
  }

  function renderLearn() {
    if (ui.lessonId) {
      const lesson = CCT.lessonById(ui.lessonId);
      if (!lesson) {
        ui.lessonId = null;
        return renderLearn();
      }
      return (
        '<section><button type="button" class="text-btn" data-action="learn-back">← All lessons</button>' +
        CCT.tutor.lessonHtml(lesson) +
        "</section>"
      );
    }

    const blocks = CCT.domains
      .map(function (domain) {
        const mods = CCT.lessonsByDomain(domain.id);
        const cards = mods
          .map(function (m) {
            const done = lessonDone(m.id);
            return (
              '<div class="lesson-row">' +
              '<button type="button" class="lesson-open" data-action="open-lesson" data-id="' +
              m.id +
              '">' +
              CCT.esc(m.title) +
              (done ? ' <span class="tag done">Done</span>' : "") +
              "</button>" +
              '<button type="button" class="listen-mini" data-action="listen-lesson" data-id="' +
              m.id +
              '">Listen</button></div>'
            );
          })
          .join("");
        return (
          '<div class="domain-block"><h3>' +
          CCT.esc(domain.name) +
          '</h3><div class="stack">' +
          cards +
          "</div></div>"
        );
      })
      .join("");

    return (
      '<section><p class="eyebrow">Learn</p><h2>Five domains · three lessons each</h2>' +
      '<p class="lead">Tap a lesson to read. Every lesson has a Listen button for hands-free reps.</p>' +
      blocks +
      "</section>"
    );
  }

  function renderListen() {
    const st = CCT.player.getState();
    if (!st.queue.length) CCT.player.buildQueue(ui.listenDomain || null);
    const state = CCT.player.getState();
    const cur = state.current;
    const domainOpts = CCT.domains
      .map(function (d) {
        const sel = ui.listenDomain === d.id ? " selected" : "";
        return (
          '<option value="' +
          d.id +
          '"' +
          (ui.listenDomain === d.id ? " selected" : "") +
          ">" +
          CCT.esc(d.name) +
          "</option>"
        );
      })
      .join("");

    return (
      '<section class="listen-gym">' +
      '<p class="eyebrow">Listen · gym mode</p>' +
      "<h2>Hands-free lessons</h2>" +
      '<label class="field">Queue<select id="listen-domain" data-action="listen-filter">' +
      '<option value="">All domains</option>' +
      domainOpts +
      "</select></label>" +
      (cur
        ? '<p class="now-playing"><strong>' +
          CCT.esc(cur.title) +
          "</strong><br>" +
          CCT.esc(CCT.tutor.domainName(cur.domain)) +
          " · " +
          (state.index + 1) +
          " / " +
          state.queue.length +
          "</p>"
        : "<p>No lessons in queue.</p>") +
      '<div class="gym-controls">' +
      '<button type="button" class="gym-btn" data-action="listen-prev" aria-label="Previous">⏮</button>' +
      '<button type="button" class="gym-btn primary-gym" data-action="listen-play" aria-label="Play">' +
      (state.playing ? "⏸" : "▶") +
      "</button>" +
      '<button type="button" class="gym-btn" data-action="listen-next" aria-label="Next">⏭</button>' +
      "</div>" +
      '<p class="fine">Speed is in Settings. Auto-advance moves to the next lesson when speech finishes.</p></section>'
    );
  }

  function renderPracticePicker() {
    const marks = CCT.storage.get().bookmarks.length;
    return (
      '<section><p class="eyebrow">Practice</p><h2>Certification-style drills</h2>' +
      '<p class="lead">Say A, B, C, or D out loud on supported browsers, or tap the large buttons.</p>' +
      '<div class="actions">' +
      '<button type="button" class="primary" data-action="mix">Mixed · 5 questions</button>' +
      '<button type="button" class="secondary" data-action="timed">Timed · 10 · 15 min</button>' +
      '<button type="button" class="secondary" data-action="mock">Full mock · 30 · 90 min</button>' +
      '<button type="button" class="secondary" data-action="bookmarks"' +
      (marks ? "" : " disabled") +
      ">Bookmarks" +
      (marks ? " (" + marks + ")" : "") +
      "</button></div>" +
      '<div class="domain-list">' +
      CCT.domains
        .map(function (d) {
          return (
            '<button type="button" class="domain" data-action="practice" data-domain="' +
            d.id +
            '"><span class="domain-top"><span>' +
            CCT.esc(d.name) +
            "</span></span></button>"
          );
        })
        .join("") +
      "</div></section>"
    );
  }

  function renderQuiz() {
    const session = ui.session;
    if (!session) return renderPracticePicker();
    if (session.phase === "empty") {
      return (
        '<section><h2>Nothing here yet</h2><p class="lead">Bookmark questions or finish a drill to build a review pile.</p>' +
        '<button type="button" class="primary" data-action="practice-home">Back to practice</button></section>'
      );
    }

    finish(session);

    if (session.phase === "done") {
      const result = session.result;
      const pct = Math.round((result.correct / result.total) * 100);
      const weak = CCT.progress.weakest();
      return (
        '<section class="results">' +
        '<p class="eyebrow">' +
        CCT.esc(session.label) +
        "</p><h2>" +
        result.correct +
        " / " +
        result.total +
        "</h2>" +
        '<p class="lead">' +
        pct +
        "%. Next: <strong>" +
        CCT.esc(weak.name) +
        "</strong>.</p>" +
        '<div class="actions"><button type="button" class="primary" data-action="practice" data-domain="' +
        weak.id +
        '">Practice domain</button>' +
        '<button type="button" class="secondary" data-action="practice-home">More practice</button></div></section>'
      );
    }

    const q = CCT.quiz.current(session);
    const n = session.index + 1;
    const total = session.questions.length;
    const bookmarked = CCT.quiz.isBookmarked(q.id);

    const choices = q.choices
      .map(function (choice) {
        let cls = "choice";
        if (session.phase === "review") {
          if (choice.id === q.answer) cls += " good";
          else if (choice.id === session.choice) cls += " bad";
        } else if (choice.id === session.choice) cls += " selected";
        return (
          '<button type="button" class="' +
          cls +
          '" data-action="select" data-id="' +
          choice.id +
          '"' +
          (session.phase === "review" ? " disabled" : "") +
          '><span class="key">' +
          choice.id +
          "</span><span>" +
          CCT.esc(choice.text) +
          "</span></button>"
        );
      })
      .join("");

    const explain = session.phase === "review" ? CCT.tutor.explanationHtml(q, session.choice) : "";
    const voiceRow =
      session.phase === "ask"
        ? '<div class="voice-bar">' +
          '<button type="button" class="secondary" data-action="voice-start">' +
          (CCT.speech.recognitionSupported ? "🎤 Say A, B, C, or D" : "Mic not supported") +
          "</button>" +
          (session.voiceHeard
            ? '<p class="voice-heard">Heard: <strong>' + CCT.esc(session.voiceHeard) + "</strong></p>"
            : "") +
          "</div>"
        : "";

    const action =
      session.phase === "ask"
        ? '<button type="button" class="primary" data-action="check">Check answer</button>'
        : '<button type="button" class="primary" data-action="next">' +
          (n === total ? "See results" : "Next question") +
          "</button>";

    const clock = session.timed
      ? '<span id="clock" class="clock">' + fmt(Math.max(0, session.deadline - Date.now())) + "</span>"
      : "";

    return (
      '<section class="quiz" data-domain="' +
      q.domain +
      '">' +
      '<div class="quiz-top"><p class="eyebrow">' +
      CCT.esc(session.label) +
      " · " +
      n +
      " / " +
      total +
      "</p>" +
      clock +
      "</div>" +
      '<p class="topic">' +
      CCT.esc(CCT.tutor.domainName(q.domain)) +
      " · " +
      CCT.esc(q.concept) +
      "</p>" +
      "<h2>" +
      CCT.esc(q.stem) +
      "</h2>" +
      voiceRow +
      '<div class="choices" id="choices">' +
      choices +
      "</div>" +
      explain +
      '<div class="actions row">' +
      action +
      '<button type="button" class="text-btn" data-action="read-question">Read aloud</button>' +
      '<button type="button" class="text-btn" data-action="toggle-bookmark">' +
      (bookmarked ? "Bookmarked ★" : "Bookmark ☆") +
      "</button></div></section>"
    );
  }

  function renderProgress() {
    const stats = CCT.progress.overall();
    const domains = CCT.progress.domainStats();
    const lessons = CCT.progress.lessonStats();

    const bars = domains
      .map(function (d) {
        const width = d.pct == null ? d.lessonPct : Math.round(d.lessonPct * 0.4 + d.pct * 0.6);
        return (
          "<li><span>" +
          CCT.esc(d.name) +
          '</span><span class="track"><span class="fill" style="width:' +
          width +
          '%"></span></span><span>' +
          (d.pct == null ? d.lessonPct + "% L" : d.pct + "% Q") +
          "</span></li>"
        );
      })
      .join("");

    return (
      '<section><p class="eyebrow">Progress</p><h2>Stored on this device</h2>' +
      "<p class=\"lead\">Lessons " +
      lessons.done +
      " / " +
      lessons.total +
      " · Questions " +
      (stats.pct == null ? "not started" : stats.pct + "% on " + stats.seen + " answers") +
      "</p>" +
      '<ul class="bars">' +
      bars +
      "</ul>" +
      '<button type="button" class="text-btn danger" data-action="reset">Clear question history</button></section>'
    );
  }

  function renderScore() {
    const ready = CCT.progress.readiness();
    const levels = CCT.progress.READINESS_LEVELS.map(function (lv) {
      const on = lv.id === ready.level.id;
      return (
        '<li class="' +
        (on ? "current" : "") +
        '"><span>' +
        CCT.esc(lv.name) +
        '</span><span class="lvl-min">' +
        lv.min +
        "+</span></li>"
      );
    }).join("");

    return (
      '<section><p class="eyebrow">Score</p><h2>Exam readiness</h2>' +
      '<div class="readiness-ring" style="--pct:' +
      ready.score +
      '"><div class="ring-inner"><span class="ring-num">' +
      ready.score +
      "</span></div></div>" +
      '<p class="level-pill center">' +
      CCT.esc(ready.level.name) +
      "</p>" +
      "<ul class=\"metric-list\"><li>Coverage blend · " +
      ready.coverageScore +
      "</li><li>Answer accuracy · " +
      (ready.accuracyScore || "—") +
      "</li><li>Recent consistency · " +
      ready.consistencyScore +
      "</li></ul>" +
      '<h3>Levels</h3><ul class="levels">' +
      levels +
      "</ul>" +
      '<p class="fine">Readiness mixes lesson coverage, question accuracy across domains, and steady recent sessions — not one lucky run.</p></section>'
    );
  }

  function renderTutor() {
    const plan = CCT.tutor.localTutorPlan();
    const conceptRows = plan.concepts
      .map(function (c) {
        return (
          "<li><strong>" +
          CCT.esc(c.concept) +
          "</strong> · " +
          CCT.esc(CCT.tutor.domainName(c.domain)) +
          " · " +
          c.missRate +
          "% miss</li>"
        );
      })
      .join("");

    const lessonBtns = plan.suggestedLessons
      .map(function (l) {
        return (
          '<button type="button" class="secondary" data-action="open-lesson" data-id="' +
          l.id +
          '">' +
          CCT.esc(l.title) +
          "</button>"
        );
      })
      .join(" ");

    return (
      '<section><p class="eyebrow">Tutor</p><h2>Weak-area analysis</h2>' +
      "<p class=\"lead\">" +
      CCT.esc(plan.summary) +
      "</p>" +
      (conceptRows ? "<h3>Concepts to revisit</h3><ul>" + conceptRows + "</ul>" : "<p>No misses logged yet — great time for a mock exam.</p>") +
      '<div class="actions row">' +
      lessonBtns +
      "</div>" +
      '<div class="tutor-ai">' +
      "<h3>AI coach (optional)</h3>" +
      "<p>Add your Anthropic API key in Settings for a personalized tip. Without a key, use the plan above — it is built from your saved progress.</p>" +
      '<button type="button" class="primary" data-action="tutor-ai">Get AI study tip</button>' +
      (ui.tutorAiText ? '<div class="ai-out">' + CCT.esc(ui.tutorAiText) + "</div>" : "") +
      (ui.tutorAiError ? '<p class="error">' + CCT.esc(ui.tutorAiError) + "</p>" : "") +
      "</div></section>"
    );
  }

  function renderSettings() {
    const s = settings();
    const voices = CCT.speech.listVoices();
    const voiceOpts = voices
      .map(function (v) {
        return (
          '<option value="' +
          CCT.esc(v.voiceURI) +
          '"' +
          (s.voiceUri === v.voiceURI ? " selected" : "") +
          ">" +
          CCT.esc(v.name) +
          "</option>"
        );
      })
      .join("");

    return (
      '<section><p class="eyebrow">Settings</p><h2>Audio & display</h2>' +
      '<label class="field">Speech speed (' +
      s.speechRate +
      'x)<input type="range" min="0.8" max="2" step="0.1" value="' +
      s.speechRate +
      '" data-action="set-rate"></label>' +
      '<label class="field toggle"><input type="checkbox" data-action="toggle-theme"' +
      (s.theme === "light" ? " checked" : "") +
      '> Light mode</label>' +
      '<label class="field toggle"><input type="checkbox" data-action="toggle-sfx"' +
      (s.sfx !== false ? " checked" : "") +
      "> Sound effects</label>" +
      '<label class="field toggle"><input type="checkbox" data-action="toggle-auto"' +
      (s.autoAdvanceListen !== false ? " checked" : "") +
      "> Auto-advance listen queue</label>" +
      (voices.length
        ? '<label class="field">Voice<select data-action="set-voice">' + voiceOpts + "</select></label>"
        : "<p class=\"fine\">Voices load after first speech on some browsers.</p>") +
      '<label class="field">Anthropic API key (optional, stored locally)<input type="password" id="api-key" placeholder="sk-ant-..." value="' +
      CCT.esc(s.tutorApiKey) +
      '"><button type="button" class="secondary" data-action="save-key">Save key</button></label>' +
      '<div class="actions row">' +
      '<button type="button" class="secondary" data-action="export">Export progress JSON</button>' +
      '<label class="file-btn secondary">Import JSON<input type="file" accept="application/json" data-action="import-file" hidden></label>' +
      "</div>" +
      '<p class="fine">Install: use Add to Home Screen after deploying. Works offline after first load.</p></section>'
    );
  }

  function stopVoiceIfNeeded() {
    CCT.speech.stopListening();
  }

  function maybeReadQuestion() {
    const session = ui.session;
    if (!session || session.phase !== "ask") return;
    if (!settings().readQuestions) return;
    const q = CCT.quiz.current(session);
    if (q) CCT.speech.speak(CCT.tutor.speakQuestion(q));
  }

  function render() {
    CCT.speech.stop();
    stopVoiceIfNeeded();
    clearTimer();
    applyTheme();

    let html = "";
    if (ui.view === "home") html = renderHome();
    else if (ui.view === "learn") html = renderLearn();
    else if (ui.view === "listen") html = renderListen();
    else if (ui.view === "practice") html = renderQuiz();
    else if (ui.view === "progress") html = renderProgress();
    else if (ui.view === "score") html = renderScore();
    else if (ui.view === "tutor") html = renderTutor();
    else if (ui.view === "settings") html = renderSettings();

    view.innerHTML = html;
    setNav();
    armTimer();
    if (ui.view === "practice" && ui.session && ui.session.phase === "ask") maybeReadQuestion();
  }

  function startSession(session) {
    ui.session = session;
    ui.view = "practice";
    render();
  }

  function selectChoice(id) {
    const session = ui.session;
    if (!session || session.phase !== "ask") return;
    session.choice = id;
    view.querySelectorAll(".choice").forEach(function (btn) {
      const on = btn.dataset.id === id;
      btn.classList.toggle("selected", on);
    });
  }

  function check() {
    const session = ui.session;
    if (!session || session.phase !== "ask") return;
    if (!session.choice) {
      const box = document.getElementById("choices");
      if (box) {
        box.classList.remove("shake");
        void box.offsetWidth;
        box.classList.add("shake");
      }
      return;
    }
    stopVoiceIfNeeded();
    const ok = CCT.quiz.gradeCurrent(session);
    if (ok) CCT.audio.correct();
    else CCT.audio.miss();
    render();
  }

  CCT.player.setOnChange(function () {
    if (ui.view === "listen") renderListenPartial();
  });

  function renderListenPartial() {
    if (ui.view !== "listen") return;
    const gym = view.querySelector(".listen-gym");
    if (!gym) return;
    gym.outerHTML = renderListen();
  }

  function onClick(event) {
    const btn = event.target.closest("[data-action]");
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;

    if (action === "nav") {
      ui.view = btn.dataset.view;
      if (ui.view !== "practice") ui.session = null;
      if (ui.view === "listen" && !CCT.player.getState().queue.length) {
        CCT.player.buildQueue(ui.listenDomain || null);
      }
      render();
      return;
    }
    if (action === "learn-back") {
      ui.lessonId = null;
      render();
      return;
    }
    if (action === "open-lesson") {
      ui.lessonId = btn.dataset.id;
      ui.view = "learn";
      render();
      return;
    }
    if (action === "listen-lesson") {
      event.stopPropagation();
      const lesson = CCT.lessonById(btn.dataset.id);
      if (lesson) {
        ui.view = "listen";
        CCT.player.buildQueue(lesson.domain);
        const idx = CCT.player.getState().queue.findIndex(function (m) {
          return m.id === lesson.id;
        });
        if (idx >= 0) CCT.player.jump(idx);
        render();
        CCT.player.playLesson(lesson);
        renderListenPartial();
      }
      return;
    }
    if (action === "complete-lesson") {
      CCT.progress.markLessonComplete(btn.dataset.id);
      render();
      return;
    }
    if (action === "practice" || action === "mix") {
      startSession(CCT.quiz.start({ mode: "practice", domain: btn.dataset.domain }));
      return;
    }
    if (action === "timed") {
      startSession(CCT.quiz.start({ mode: "timed" }));
      return;
    }
    if (action === "mock") {
      startSession(CCT.quiz.start({ mode: "mock" }));
      return;
    }
    if (action === "misses") {
      startSession(CCT.quiz.start({ mode: "misses", ids: CCT.progress.missedIds() }));
      return;
    }
    if (action === "bookmarks") {
      startSession(CCT.quiz.start({ mode: "bookmarks" }));
      return;
    }
    if (action === "practice-home") {
      ui.session = null;
      render();
      return;
    }
    if (action === "select") {
      selectChoice(btn.dataset.id);
      return;
    }
    if (action === "check") {
      check();
      return;
    }
    if (action === "next") {
      CCT.quiz.next(ui.session);
      render();
      return;
    }
    if (action === "read-question") {
      const q = CCT.quiz.current(ui.session);
      if (q) CCT.speech.speak(CCT.tutor.speakQuestion(q));
      return;
    }
    if (action === "toggle-bookmark") {
      const q = CCT.quiz.current(ui.session);
      if (q) {
        CCT.quiz.toggleBookmark(q.id);
        render();
      }
      return;
    }
    if (action === "voice-start") {
      if (!CCT.speech.recognitionSupported) return;
      CCT.speech.startListening({
        onResult: function (choice, heard) {
          ui.session.voiceHeard = heard;
          if (choice) {
            ui.session.voiceHeard = heard + " → " + choice;
            selectChoice(choice);
            const el = view.querySelector(".voice-heard");
            if (el) el.innerHTML = "Heard: <strong>" + CCT.esc(ui.session.voiceHeard) + "</strong>";
            else render();
          } else {
            render();
          }
        },
        onError: function () {
          ui.session.voiceHeard = "Could not hear — tap an answer";
          render();
        },
      });
      return;
    }
    if (action === "listen-play") {
      const st = CCT.player.getState();
      if (st.playing) CCT.player.pause();
      else CCT.player.playCurrent();
      renderListenPartial();
      return;
    }
    if (action === "listen-next") {
      CCT.player.next();
      renderListenPartial();
      return;
    }
    if (action === "listen-prev") {
      CCT.player.prev();
      renderListenPartial();
      return;
    }
    if (action === "listen-filter") {
      ui.listenDomain = btn.value || "";
      CCT.player.buildQueue(ui.listenDomain || null);
      render();
      return;
    }
    if (action === "tutor-ai") {
      ui.tutorAiText = "";
      ui.tutorAiError = "";
      const plan = CCT.tutor.localTutorPlan();
      CCT.tutor.fetchAiTip(
        plan,
        function (text) {
          ui.tutorAiText = text;
          ui.tutorAiError = "";
          render();
        },
        function (err) {
          if (err === "no-key") {
            ui.tutorAiError = "Add an API key in Settings, or follow the local plan above.";
          } else {
            ui.tutorAiError = err;
          }
          render();
        }
      );
      return;
    }
    if (action === "reset") {
      if (!window.confirm("Clear saved question history on this device?")) return;
      CCT.storage.resetProgress();
      render();
      return;
    }
    if (action === "export") {
      const blob = new Blob([CCT.storage.exportJson()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "claude-cert-tutor-progress.json";
      a.click();
      return;
    }
    if (action === "save-key") {
      const input = document.getElementById("api-key");
      CCT.storage.update(function (data) {
        data.settings.tutorApiKey = input ? input.value.trim() : "";
        return data;
      });
      return;
    }
  }

  document.body.addEventListener("click", onClick);

  document.body.addEventListener("change", function (event) {
    const el = event.target;
    const action = el.dataset && el.dataset.action;
    if (action === "listen-filter") {
      ui.listenDomain = el.value || "";
      CCT.player.buildQueue(ui.listenDomain || null);
      render();
    }
    if (action === "set-voice") {
      CCT.storage.update(function (data) {
        data.settings.voiceUri = el.value;
        return data;
      });
    }
    if (action === "set-rate") {
      CCT.storage.update(function (data) {
        data.settings.speechRate = Number(el.value);
        return data;
      });
      render();
    }
    if (action === "import-file" && el.files && el.files[0]) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          CCT.storage.importJson(reader.result);
          render();
        } catch (e) {
          window.alert("Invalid JSON file.");
        }
      };
      reader.readAsText(el.files[0]);
    }
  });

  document.body.addEventListener("input", function (event) {
    const el = event.target;
    if (el.dataset && el.dataset.action === "set-rate") {
      CCT.storage.update(function (data) {
        data.settings.speechRate = Number(el.value);
        return data;
      });
      const label = el.closest(".field");
      if (label) label.firstChild.textContent = "Speech speed (" + el.value + "x)";
    }
  });

  document.body.addEventListener("change", function (event) {
    const el = event.target;
    if (!el.dataset) return;
    if (el.dataset.action === "toggle-theme") {
      CCT.storage.update(function (data) {
        data.settings.theme = el.checked ? "light" : "dark";
        return data;
      });
      applyTheme();
    }
    if (el.dataset.action === "toggle-sfx") {
      CCT.storage.update(function (data) {
        data.settings.sfx = el.checked;
        return data;
      });
    }
    if (el.dataset.action === "toggle-auto") {
      CCT.storage.update(function (data) {
        data.settings.autoAdvanceListen = el.checked;
        return data;
      });
    }
  });

  document.addEventListener("keydown", function (event) {
    if (!ui.session || ui.view !== "practice" || ui.session.phase !== "ask") return;
    const tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const map = { "1": "A", "2": "B", "3": "C", "4": "D", a: "A", b: "B", c: "C", d: "D" };
    const key = map[event.key] || map[String(event.key).toLowerCase()];
    if (key) selectChoice(key);
    if (event.key === "Enter") {
      event.preventDefault();
      check();
    }
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  }

  applyTheme();
  render();
})();
