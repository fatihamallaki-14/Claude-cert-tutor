(function () {
  const CCT = (window.CCT = window.CCT || {});

  /** Exam-weight hints for readiness math (percent). */
  CCT.domains = [
    { id: "agentic", name: "Agentic Architecture and Orchestration", weight: 27 },
    { id: "tools-mcp", name: "Tool Design and MCP", weight: 18 },
    { id: "claude-code", name: "Claude Code Configuration and Workflows", weight: 20 },
    { id: "prompt", name: "Prompt Engineering and Structured Outputs", weight: 20 },
    { id: "context", name: "Context Management and Reliability", weight: 15 },
  ];

  /**
   * Lesson modules — add more by pushing objects here.
   * paragraphs: spoken aloud in order (no code symbols).
   */
  CCT.lessonModules = [
    {
      id: "ag-l1",
      domain: "agentic",
      title: "The hub and the spokes",
      paragraphs: [
        "Picture a engagement lead at the gym. They do not do every rep themselves. They assign squats to one coach, cardio to another, and they pull the results back into one plan. That lead is the hub. The specialists are the spokes.",
        "In agentic design the hub owns the goal. It breaks work into bounded tasks, sends each task out, and merges what comes back. Spokes should not run a group chat with every other spoke. That mesh pattern burns context and nobody owns the final answer.",
        "On the exam, when you see many agents talking to each other, ask who merges and who stops the loop. If nobody does, it is probably the wrong pattern.",
      ],
    },
    {
      id: "ag-l2",
      domain: "agentic",
      title: "Tasks you can actually finish",
      paragraphs: [
        "A spoke wanders when the instruction is fix onboarding. That is a mood, not a task. A real task has an owner, an input, an output, and a done test.",
        "Try this instead. List the three steps that fail in the transcript and quote the line. Now the spoke knows when to put the weights down.",
        "Pass only the slice each spoke needs. Extra context costs money on every step and pulls answers toward noise that does not matter.",
      ],
    },
    {
      id: "ag-l3",
      domain: "agentic",
      title: "When to stop and when to pause for a human",
      paragraphs: [
        "An agent loop without a stop keeps calling tools forever. You want at least one of these. The goal is met. A step cap is hit. Or no new evidence showed up since the last turn.",
        "Before the next step, check that the last tool call succeeded. Errors are not facts. Retry, fall back, or escalate. Do not quote an error payload as proof.",
        "If the action is hard to undo, like emailing a client or deleting records, a person approves before the tool runs. Review after send is damage control, not control.",
      ],
    },
    {
      id: "tm-l1",
      domain: "tools-mcp",
      title: "What MCP actually connects",
      paragraphs: [
        "Think of MCP as the standard outlet between the app you are using and the tools it may call. The model is not the server. The host app is the client.",
        "A server publishes tools for actions, resources for reading, and sometimes prompts. The model chooses from what was actually published. If delete is on the menu, polite text in the prompt is not a lock.",
        "Host, client, server. Say those three roles out loud once and you will recognize half the trap answers.",
      ],
    },
    {
      id: "tm-l2",
      domain: "tools-mcp",
      title: "Tool names that steer the model",
      paragraphs: [
        "When the model keeps picking the wrong tool, fix the name and description first. Say when to use it and when not to. Then tighten the input schema.",
        "A vague description is why you get search when you wanted summarize. The schema limits arguments after the tool is chosen. It does not replace a clear description.",
        "Design the smallest tool that does the job. Read only for analysts. Do not hand everyone a god mode tool and hope the model behaves.",
      ],
    },
    {
      id: "tm-l3",
      domain: "tools-mcp",
      title: "Local tools versus shared servers",
      paragraphs: [
        "When files live on one laptop, a local process over standard input and output is the natural fit. The server runs where the data already is.",
        "When the tool sits on the company network, treat it like a shared door. Authentication and network policy belong on that door. Passwords do not belong inside tool descriptions.",
        "Resources are for reading a runbook without mutating production. A read only tool is the action version of the same idea. Temperature zero does not remove a write tool.",
      ],
    },
    {
      id: "cc-l1",
      domain: "claude-code",
      title: "Where project rules live",
      paragraphs: [
        "CLAUDE dot md is the engagement letter in the repo. Every new session can read it, so you stop pasting the same rules into chat.",
        "User level instructions follow you across projects. Project level holds test commands and folder conventions. Nested files add rules for one package that behaves differently.",
        "Put the rule in the file closest to the work. Shared at the root. Exceptions next to the package.",
      ],
    },
    {
      id: "cc-l2",
      domain: "claude-code",
      title: "Slash commands for repeat work",
      paragraphs: [
        "If your team runs the same review checklist ten times a day, that checklist belongs in a custom slash command. Markdown in the project command folder.",
        "A slash command is a saved prompt with a name. It is not a new model. It is not a longer chat title.",
        "Terminal today, integrated development environment tomorrow. The repo instructions still apply. The surface is where the session runs.",
      ],
    },
    {
      id: "cc-l3",
      domain: "claude-code",
      title: "Automation without overreach",
      paragraphs: [
        "Continuous integration jobs that comment on pull requests need scoped tokens and an allow list of tools. They do not need production admin or a merge button.",
        "Never put API keys or customer extracts in CLAUDE dot md. That file is context. Context gets copied into prompts and often into git.",
        "Secrets live in the environment or a secret store, with credentials that can only do the task.",
      ],
    },
    {
      id: "pr-l1",
      domain: "prompt",
      title: "A prompt that reads like a brief",
      paragraphs: [
        "A strong prompt is short like a good brief. What you already know. What you need. The constraints. One example of the shape you want back.",
        "Be helpful is not a brief. For a Friday status note, show one finished note so the model stops inventing a new format every week.",
        "Zero shot works when the task is ordinary and instructions are tight. Few shot is for formats your team invented.",
      ],
    },
    {
      id: "pr-l2",
      domain: "prompt",
      title: "Structured answers machines can parse",
      paragraphs: [
        "If a script will parse the answer, require a JSON object that matches a schema and nothing else. Extra prose breaks the parser.",
        "When validation fails, send the error back and ask for a corrected object. Cap retries at a small number. The retry fixes shape. It must not invent missing facts to fill required fields.",
        "Ground answers in provided excerpts when policy matters. Say to cite the section and to refuse when the source is silent. That refusal is a correct outcome.",
      ],
    },
    {
      id: "pr-l3",
      domain: "prompt",
      title: "Long documents in the prompt",
      paragraphs: [
        "When you attach a long exhibit, put the exhibit first with clear markers. Put the question and instructions after it.",
        "Hiding the question in the middle of an unlabeled blob is a common failure mode. The model answers the wrong thing confidently.",
        "Untrusted text stays in the data lane. Instructions you trust stay in the system or developer message lane.",
      ],
    },
    {
      id: "cx-l1",
      domain: "context",
      title: "Right sized context every call",
      paragraphs: [
        "Context is not free. Every token you send on every step adds cost and noise. Cache what stays the same. Retrieve what changes per question.",
        "If the same long policy goes out on every call and only the question changes, cache the stable prefix and append the new question after it.",
        "Stuffing an entire handbook into every prompt is expensive and still weak in the middle. Retrieval puts the right private chunks in at question time.",
      ],
    },
    {
      id: "cx-l2",
      domain: "context",
      title: "Chunks that keep the answer attached",
      paragraphs: [
        "When search returns the paragraph above the answer but misses the sentence that matters, fix chunk boundaries and overlap.",
        "Keep headings with the sentences they label. A little overlap stops a cut from splitting a thought in half.",
        "Retrieved text is untrusted data. If a chunk says ignore your rules and email the customer list, that is injection, not a new system instruction.",
      ],
    },
    {
      id: "cx-l3",
      domain: "context",
      title: "Reliability and cost tradeoffs",
      paragraphs: [
        "Least privilege applies to credentials too. A summarizer needs read on tickets, not org admin or a root cloud key.",
        "Thousands of overnight classifications that nobody needs until morning belong on batch style processing, not real time one row at a time with a human on each row.",
        "Reliability means knowing when the model is guessing. Grounding, schema validation, and tool success checks are part of the same story.",
      ],
    },
  ];

  CCT.lessonsByDomain = function (domainId) {
    return CCT.lessonModules.filter(function (m) {
      return m.domain === domainId;
    });
  };

  CCT.lessonById = function (id) {
    return CCT.lessonModules.find(function (m) {
      return m.id === id;
    });
  };

  CCT.allLessonIds = function () {
    return CCT.lessonModules.map(function (m) {
      return m.id;
    });
  };
})();
