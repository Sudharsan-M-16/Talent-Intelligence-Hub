# 06 Engineering Decisions & Mathematics

## Core Engineering Decisions

### 1. Why Vite + React?
Vite uses esbuild (written in Go) for pre-bundling dependencies, which is 10-100x faster than Webpack. For a client-heavy application like TIH, HMR (Hot Module Replacement) speed is critical for developer velocity. React was chosen over Vue/Svelte due to the massive ecosystem (specifically `dnd-kit` for Kanban and `recharts` for the dashboard).

### 2. Why Groq instead of OpenAI?
**Latency.** Groq's LPU (Language Processing Unit) architecture delivers inferencing at roughly 800 tokens per second for Llama 3 70B. OpenAI's GPT-4 can take 5-10 seconds to parse a complex resume into JSON. Groq does it in < 1 second. Since this happens on the client side while the user waits, latency is the defining metric.

### 3. Why pure CSS variables instead of Tailwind config?
Tailwind CSS v4 introduces CSS-first configuration. By strictly using `@theme` and CSS variables, we completely removed the build-step configuration overhead of `tailwind.config.js`. This allows real-time theme toggling (Light/Dark mode) by simply swapping a data-theme attribute on the root HTML element, rather than requiring complex JavaScript logic.

---

## The Mathematics of Talent Scoring

When a candidate is uploaded, their profile is evaluated across multiple axes. 

### 1. Completeness Calculation (Percentage Math)
**Goal:** Determine how "full" a profile is to prompt recruiters to collect more data.
**Formula:**
`Score = (Number of populated fields / Total required fields) * 100`

```javascript
const requiredFields = ['name', 'email', 'skills', 'experience', 'education'];
let filled = 0;
if (profile.name) filled++;
// ...
const completeness = Math.round((filled / requiredFields.length) * 100);
```

### 2. Fuzzy Matching & Levenshtein Distance
When bulk importing CSVs, a recruiter might upload a sheet where the column is named `e-mail address` instead of `email`.
Instead of failing, TIH uses structural fuzzy matching.
While we didn't implement a full Levenshtein matrix (O(N*M) complexity) to save bundle size, we simulate it via regex normalization:
1. Strip all non-alphanumeric characters: `e-mail address` -> `emailaddress`
2. Lowercase everything.
3. Check against an array of aliases.
This mathematically reduces the entropy of human error into a deterministic key space.

### 3. Weighted Averages for Technical Evaluation
In the Evaluations module, different skills have different weights.
A senior engineer's "System Design" score (Weight: 3) matters more than their "HTML" score (Weight: 1).
**Formula:**
`Weighted Average = Σ(Score_i * Weight_i) / Σ(Weight_i)`
This prevents a candidate with 10/10 in HTML but 2/10 in System Design from passing as a senior engineer.
