(function () {
  const CCT = (window.CCT = window.CCT || {});
  const esc = function (v) {
    return CCT.esc(v);
  };

  function domainName(id) {
    const domain = CCT.domains.find(function (d) {
      return d.id === id;
    });
    return domain ? domain.name : id;
  }

  function lessonHtml(lesson) {
    const body = lesson.paragraphs
      .map(function (p) {
        return "<p>" + esc(p) + "</p>";
      })
      .join("");
    const domain = domainName(lesson.domain);
    return (
      '<article class="lesson" data-lesson="' +
      esc(lesson.id) +
      '">' +
      '<p class="eyebrow">' +
      esc(domain) +
      "</p>" +
      "<h2>" +
      esc(lesson.title) +
      "</h2>" +
      body +
      '<div class="actions row">' +
      '<button type="button" class="primary" data-action="listen-lesson" data-id="' +
      esc(lesson.id) +
      '">Listen</button>' +
      '<button type="button" class="secondary" data-action="complete-lesson" data-id="' +
      esc(lesson.id) +
      '">Mark complete</button>' +
      '<button type="button" class="secondary" data-action="practice" data-domain="' +
      esc(lesson.domain) +
      '">Practice domain</button>' +
      "</div></article>"
    );
  }

  function wrongLines(q, choiceId) {
    return q.choices
      .filter(function (c) {
        return c.id !== q.answer;
      })
      .map(function (c) {
        const tag = c.id === choiceId ? " (your pick)" : "";
        return "<li><strong>" + esc(c.id) + tag + ".</strong> " + esc(c.text) + "</li>";
      })
      .join("");
  }

  function explanationHtml(q, choiceId) {
    const correct = choiceId === q.answer;
    const right = q.choices.find(function (c) {
      return c.id === q.answer;
    });
    return (
      '<div class="explain ' +
      (correct ? "is-correct" : "is-miss") +
      '" aria-live="polite">' +
      '<p class="kicker">' +
      (correct ? "Correct" : "Not quite") +
      "</p>" +
      "<p><strong>Why " +
      esc(q.answer) +
      " is right:</strong> " +
      esc(q.why) +
      "</p>" +
      (right ? "<p>" + esc(right.text) + "</p>" : "") +
      "<p><strong>Why the others miss:</strong></p>" +
      '<ul class="wrong-list">' +
      wrongLines(q, choiceId) +
      "</ul>" +
      (q.trap ? '<p class="trap"><span>Exam trap.</span> ' + esc(q.trap) + "</p>" : "") +
      "</div>"
    );
  }

  function speakQuestion(q) {
    const lines = q.choices
      .map(function (c) {
        return c.id + ". " + c.text;
      })
      .join(" ");
    return q.stem + " " + lines;
  }

  function localTutorPlan() {
    const weak = CCT.progress.weakest();
    const concepts = CCT.progress.conceptWeaknesses();
    const ready = CCT.progress.readiness();
    const lesson = ready.nextLesson;
    return {
      weak: weak,
      concepts: concepts,
      readiness: ready,
      suggestedLessons: CCT.lessonsByDomain(weak.id).slice(0, 2),
      lesson: lesson,
      summary:
        "Focus on " +
        weak.name +
        ". Complete lesson " +
        lesson.title +
        ". Then run a five question practice in that domain.",
    };
  }

  /** Optional Anthropic API — key stays in localStorage only. */
  function fetchAiTip(plan, onDone, onErr) {
    const key = (CCT.storage.get().settings.tutorApiKey || "").trim();
    if (!key) {
      onErr("no-key");
      return;
    }
    const conceptLines = plan.concepts
      .slice(0, 4)
      .map(function (c) {
        return c.concept + " (" + c.missRate + "% miss rate)";
      })
      .join(", ");
    const body = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content:
            "You are a concise CCA-F exam coach. Student readiness: " +
            plan.readiness.score +
            "/100 (" +
            plan.readiness.level.name +
            "). Weakest domain: " +
            plan.weak.name +
            ". Struggling concepts: " +
            (conceptLines || "none logged yet") +
            ". Give three bullet study actions for today. Spoken tone. No markdown headers.",
        },
      ],
    };
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error && data.error.message ? data.error.message : "API error");
          const block = (data.content || []).find(function (b) {
            return b.type === "text";
          });
          onDone(block ? block.text : "No response text.");
        });
      })
      .catch(function (err) {
        onErr(err.message || String(err));
      });
  }

  CCT.tutor = {
    domainName: domainName,
    lessonHtml: lessonHtml,
    explanationHtml: explanationHtml,
    speakQuestion: speakQuestion,
    localTutorPlan: localTutorPlan,
    fetchAiTip: fetchAiTip,
  };
})();
