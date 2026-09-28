(function () {
  const CCT = (window.CCT = window.CCT || {});

  const READINESS_LEVELS = [
    { id: "early", name: "Early Learning", min: 0 },
    { id: "foundations", name: "Building Foundations", min: 25 },
    { id: "developing", name: "Developing", min: 45 },
    { id: "nearly", name: "Nearly Ready", min: 65 },
    { id: "ready", name: "Exam Ready", min: 82 },
  ];

  function markLessonComplete(lessonId) {
    CCT.storage.update(function (data) {
      data.lessons[lessonId] = Object.assign({}, data.lessons[lessonId] || {}, {
        completed: true,
        completedAt: new Date().toISOString(),
      });
      return data;
    });
  }

  function lessonStats() {
    const data = CCT.storage.get();
    const total = CCT.lessonModules.length;
    let done = 0;
    CCT.lessonModules.forEach(function (m) {
      if (data.lessons[m.id] && data.lessons[m.id].completed) done += 1;
    });
    return { total: total, done: done, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function record(session) {
    const answers = session.answers || [];
    const correct = answers.filter(function (a) {
      return a && a.correct;
    }).length;
    const total = session.questions.length;
    const misses = session.questions
      .map(function (q, i) {
        return { q: q, a: answers[i] };
      })
      .filter(function (row) {
        return !row.a || !row.a.correct;
      })
      .map(function (row) {
        return row.q.id;
      });

    CCT.storage.update(function (data) {
      session.questions.forEach(function (q, i) {
        const a = answers[i];
        const prev = data.questions[q.id] || { seen: 0, correct: 0, wrong: 0, lastCorrect: null };
        prev.seen += 1;
        const ok = !!(a && a.correct);
        if (ok) prev.correct += 1;
        else prev.wrong += 1;
        prev.lastCorrect = ok;
        data.questions[q.id] = prev;
      });
      data.sessions.unshift({
        id: Date.now(),
        ts: new Date().toISOString(),
        mode: session.mode,
        label: session.label,
        correct: correct,
        total: total,
        misses: misses,
      });
      data.sessions = data.sessions.slice(0, 50);
      return data;
    });

    return { correct: correct, total: total, misses: misses };
  }

  function domainStats() {
    const data = CCT.storage.get();
    return CCT.domains.map(function (domain) {
      let seen = 0;
      let correct = 0;
      let lessonDone = 0;
      let lessonTotal = 0;
      CCT.lessonsByDomain(domain.id).forEach(function (m) {
        lessonTotal += 1;
        if (data.lessons[m.id] && data.lessons[m.id].completed) lessonDone += 1;
      });
      CCT.questions.forEach(function (q) {
        if (q.domain !== domain.id) return;
        const stat = data.questions[q.id];
        if (!stat) return;
        seen += stat.seen;
        correct += stat.correct;
      });
      const qPct = seen ? Math.round((correct / seen) * 100) : null;
      const lPct = lessonTotal ? Math.round((lessonDone / lessonTotal) * 100) : 0;
      return {
        id: domain.id,
        name: domain.name,
        weight: domain.weight,
        seen: seen,
        correct: correct,
        pct: qPct,
        lessonsDone: lessonDone,
        lessonsTotal: lessonTotal,
        lessonPct: lPct,
      };
    });
  }

  function weakest() {
    const stats = domainStats();
    const scored = stats.map(function (d) {
      const q = d.pct == null ? 0 : d.pct;
      const blend = Math.round(d.lessonPct * 0.4 + q * 0.6);
      return Object.assign({}, d, { blend: blend });
    });
    scored.sort(function (a, b) {
      if (a.blend !== b.blend) return a.blend - b.blend;
      return b.weight - a.weight;
    });
    return scored[0] || CCT.domains[0];
  }

  function missedIds() {
    const data = CCT.storage.get();
    return CCT.questions
      .filter(function (q) {
        const stat = data.questions[q.id];
        return stat && stat.lastCorrect === false;
      })
      .map(function (q) {
        return q.id;
      });
  }

  function overall() {
    const data = CCT.storage.get();
    let seen = 0;
    let correct = 0;
    Object.keys(data.questions).forEach(function (id) {
      seen += data.questions[id].seen;
      correct += data.questions[id].correct;
    });
    return {
      seen: seen,
      correct: correct,
      pct: seen ? Math.round((correct / seen) * 100) : null,
      sessions: data.sessions,
    };
  }

  /** Coverage, accuracy, consistency → 0–100 readiness score. */
  function readiness() {
    const lessons = lessonStats();
    const stats = domainStats();
    const overallStats = overall();

    let domainsTouched = 0;
    let domainAccuracySum = 0;
    stats.forEach(function (d) {
      if (d.seen > 0) {
        domainsTouched += 1;
        domainAccuracySum += d.pct || 0;
      }
    });
    const lessonDomainAvg =
      stats.reduce(function (s, d) {
        return s + d.lessonPct;
      }, 0) / CCT.domains.length;
    const coverageScore =
      lessons.pct * 0.35 +
      (domainsTouched / CCT.domains.length) * 100 * 0.25 +
      lessonDomainAvg * 0.4;

    const accuracyScore = overallStats.pct == null ? 0 : overallStats.pct;

    const sessions = overallStats.sessions.slice(0, 5);
    let consistencyScore = 0;
    if (sessions.length >= 2) {
      const pcts = sessions.map(function (s) {
        return s.total ? (s.correct / s.total) * 100 : 0;
      });
      const avg = pcts.reduce(function (a, b) {
        return a + b;
      }, 0) / pcts.length;
      const variance =
        pcts.reduce(function (s, p) {
          return s + Math.pow(p - avg, 2);
        }, 0) / pcts.length;
      const std = Math.sqrt(variance);
      consistencyScore = Math.max(0, 100 - std * 1.2);
      if (pcts.every(function (p) {
        return p >= 70;
      }))
        consistencyScore = Math.min(100, consistencyScore + 10);
    } else if (sessions.length === 1) {
      consistencyScore = 40;
    }

    const raw = coverageScore * 0.38 + accuracyScore * 0.42 + consistencyScore * 0.2;
    const score = Math.round(Math.min(100, Math.max(0, raw)));

    let level = READINESS_LEVELS[0];
    for (let i = READINESS_LEVELS.length - 1; i >= 0; i -= 1) {
      if (score >= READINESS_LEVELS[i].min) {
        level = READINESS_LEVELS[i];
        break;
      }
    }

    const nextLesson = CCT.lessonModules.find(function (m) {
      const data = CCT.storage.get();
      return !(data.lessons[m.id] && data.lessons[m.id].completed);
    });

    return {
      score: score,
      level: level,
      coverageScore: Math.round(coverageScore),
      accuracyScore: accuracyScore,
      consistencyScore: Math.round(consistencyScore),
      nextLesson: nextLesson || CCT.lessonModules[0],
      weakDomain: weakest(),
    };
  }

  function conceptWeaknesses() {
    const data = CCT.storage.get();
    const map = {};
    CCT.questions.forEach(function (q) {
      const stat = data.questions[q.id];
      if (!stat || stat.seen < 1) return;
      const key = q.domain + "::" + q.concept;
      if (!map[key]) {
        map[key] = { domain: q.domain, concept: q.concept, seen: 0, wrong: 0 };
      }
      map[key].seen += stat.seen;
      map[key].wrong += stat.wrong;
    });
    return Object.keys(map)
      .map(function (k) {
        const row = map[k];
        return Object.assign({}, row, {
          missRate: row.seen ? Math.round((row.wrong / row.seen) * 100) : 0,
        });
      })
      .filter(function (r) {
        return r.wrong > 0;
      })
      .sort(function (a, b) {
        return b.missRate - a.missRate;
      })
      .slice(0, 8);
  }

  CCT.progress = {
    READINESS_LEVELS: READINESS_LEVELS,
    markLessonComplete: markLessonComplete,
    lessonStats: lessonStats,
    record: record,
    domainStats: domainStats,
    weakest: weakest,
    missedIds: missedIds,
    overall: overall,
    readiness: readiness,
    conceptWeaknesses: conceptWeaknesses,
  };
})();
