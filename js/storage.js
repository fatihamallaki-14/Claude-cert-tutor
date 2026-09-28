(function () {
  const KEY = "cct.v2";
  const CCT = (window.CCT = window.CCT || {});

  function blank() {
    return {
      settings: {
        theme: "dark",
        speechRate: 1,
        voiceUri: "",
        autoAdvanceListen: true,
        readQuestions: false,
        sfx: true,
        tutorApiKey: "",
      },
      lessons: {},
      questions: {},
      bookmarks: [],
      sessions: [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const data = JSON.parse(raw);
      return {
        settings: Object.assign(blank().settings, data.settings || {}),
        lessons: data.lessons || {},
        questions: data.questions || {},
        bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
        sessions: Array.isArray(data.sessions) ? data.sessions : [],
      };
    } catch (err) {
      return blank();
    }
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      /* private mode or quota — session still runs */
    }
  }

  CCT.storage = {
    get: function () {
      return state;
    },
    update: function (fn) {
      state = fn(JSON.parse(JSON.stringify(state))) || state;
      save();
      return state;
    },
    resetProgress: function () {
      const settings = state.settings;
      state = blank();
      state.settings = settings;
      save();
      return state;
    },
    exportJson: function () {
      return JSON.stringify(state, null, 2);
    },
    importJson: function (text) {
      const data = JSON.parse(text);
      state = {
        settings: Object.assign(blank().settings, data.settings || {}),
        lessons: data.lessons || {},
        questions: data.questions || {},
        bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
        sessions: Array.isArray(data.sessions) ? data.sessions : [],
      };
      save();
      return state;
    },
  };

  CCT.esc = function (value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch];
    });
  };
})();
