# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## AI Tools

The assistant exposes a tool that powers the GitHub analysis feature in the chat UI.

### analyzeGitHub

**Purpose:** Analyzes a public GitHub profile and returns structured, career-relevant
information that can be rendered by the frontend.

**Input:**

| Field     | Type   | Description                                  |
| --------- | ------ | -------------------------------------------- |
| `username` | string | The public GitHub username to analyze.       |

Example input:

```json
{
  "username": "torvalds"
}
```

**Output fields** currently returned by the backend:

- `username` — The GitHub login that was analyzed.
- `publicRepos` — Count of the user's public repositories.
- `followers` — Count of the user's followers.
- `topLanguages` — Array of the user's most-used programming languages (by repository count).
- `totalStars` — Total number of stars across the user's public repositories.
- `activityScore` — A number from `0` to `100` summarizing overall open-source activity.
- `careerSummary` — A short, human-readable summary of the profile.
- `recommendedFocus` — Array of suggested next steps to strengthen the user's career profile.

Example structured result (illustrative only — GitHub data changes over time, so real
values will differ from those shown here):

```json
{
  "username": "torvalds",
  "publicRepos": 12,
  "followers": 316561,
  "topLanguages": ["C", "OpenSCAD", "C++"],
  "totalStars": 255959,
  "activityScore": 88,
  "careerSummary": "...",
  "recommendedFocus": [
    "..."
  ]
}
```

### Tool lifecycle (Phase 4)

During a GitHub analysis the backend streams Server-Sent Events that map to the
frontend tool-card states as follows:

| SSE event          | Frontend state      |
| ------------------ | ------------------- |
| `tool-input-start` | `input-streaming`   |
| `tool-input-delta` | `input-streaming`   |
| `tool-call`        | `input-available`   |
| `tool-result`      | `output-available`  |
| `tool-error`       | `output-error`      |

### Frontend behavior

**Successful tool result:**

- Structured GitHub data is rendered as a real GitHub Analysis component.
- Raw JSON is not displayed.

**Failure:**

- The UI displays the designed "Analysis failed" state.
- The UI does not expose raw error/JSON details.
- A **Try again** action is available to retry the analysis.

**Normal text chat:**

- Continues to work independently of GitHub tool rendering.

