(function () {
  const CCT = (window.CCT = window.CCT || {});

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const hold = copy[i];
      copy[i] = copy[j];
      copy[j] = hold;
    }
    return copy;
  }

  function byDomain(id) {
    return CCT.questions.filter(function (q) {
      return q.domain === id;
    });
  }

  function isBookmarked(id) {
    return CCT.storage.get().bookmarks.indexOf(id) >= 0;
  }

  function toggleBookmark(id) {
    CCT.storage.update(function (data) {
      const i = data.bookmarks.indexOf(id);
      if (i >= 0) data.bookmarks.splice(i, 1);
      else data.bookmarks.push(id);
      return data;
    });
  }

  function start(opts) {
    const mode = opts.mode;
    let questions = [];
    let label = "Practice";
    let timed = false;
    let deadline = null;

    if (mode === "mock") {
      CCT.domains.forEach(function (domain) {
        questions = questions.concat(shuffle(byDomain(domain.id)));
      });
      questions = shuffle(questions);
      label = "Full mock exam";
      timed = true;
      deadline = Date.now() + 90 * 60 * 1000;
    } else if (mode === "timed") {
      questions = shuffle(CCT.questions).slice(0, 10);
      label = "Timed practice · 15 min";
      timed = true;
      deadline = Date.now() + 15 * 60 * 1000;
    } else if (mode === "misses") {
      const want = {};
      (opts.ids || []).forEach(function (id) {
        want[id] = true;
      });
      questions = shuffle(
        CCT.questions.filter(function (q) {
          return want[q.id];
        })
      ).slice(0, 15);
      label = "Review misses";
    } else if (mode === "bookmarks") {
      const marks = CCT.storage.get().bookmarks;
      questions = shuffle(
        CCT.questions.filter(function (q) {
          return marks.indexOf(q.id) >= 0;
        })
      );
      label = "Bookmarked questions";
    } else if (opts.domain) {
      questions = shuffle(byDomain(opts.domain)).slice(0, 5);
      const domain = CCT.domains.find(function (d) {
        return d.id === opts.domain;
      });
      label = (domain ? domain.name : "Domain") + " practice";
    } else {
      questions = shuffle(CCT.questions).slice(0, 5);
      label = "Mixed practice";
    }

    return {
      mode: mode,
      label: label,
      questions: questions,
      index: 0,
      choice: null,
      voiceHeard: "",
      answers: [],
      phase: questions.length ? "ask" : "empty",
      timed: timed,
      deadline: deadline,
      recorded: false,
      result: null,
    };
  }

  function current(session) {
    return session.questions[session.index] || null;
  }

  function gradeCurrent(session) {
    const q = current(session);
    if (!q || session.phase !== "ask") return null;
    const correct = session.choice === q.answer;
    session.answers[session.index] = {
      id: q.id,
      choice: session.choice,
      correct: correct,
    };
    session.phase = "review";
    return correct;
  }

  function next(session) {
    if (session.phase !== "review") return session;
    if (session.index + 1 >= session.questions.length) {
      session.phase = "done";
      return session;
    }
    session.index += 1;
    session.choice = null;
    session.voiceHeard = "";
    session.phase = "ask";
    return session;
  }

  function expire(session) {
    if (!session || session.phase === "done" || session.phase === "empty") return;
    if (session.phase === "ask" && session.choice) gradeCurrent(session);
    session.questions.forEach(function (q, i) {
      if (!session.answers[i]) {
        session.answers[i] = { id: q.id, choice: null, correct: false };
      }
    });
    session.phase = "done";
  }

  CCT.quiz = {
    start: start,
    current: current,
    gradeCurrent: gradeCurrent,
    next: next,
    expire: expire,
    isBookmarked: isBookmarked,
    toggleBookmark: toggleBookmark,
  };
})();
