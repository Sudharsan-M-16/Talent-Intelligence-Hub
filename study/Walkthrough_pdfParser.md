# Code Walkthrough: pdfParser.ts

## Purpose
Acts as the central ingestion engine for raw resume files (PDF, DOCX). It orchestrates text extraction, AI processing, validation, and fallback parsing.

## Responsibilities
- Initializing `pdfjs-dist` worker.
- Extracting raw text from PDFs while maintaining logical reading flow (Y-coordinate grouping).
- Extracting raw text from DOCX files via `mammoth`.
- Calling the Groq AI API.
- Executing Regex heuristics if AI fails.
- Normalizing and verifying AI output against the original text.

## Dependencies
- `pdfjs-dist` (PDF text extraction)
- `mammoth` (DOCX extraction)
- `node-forge` / DOM APIs (for crypto operations if needed, mostly fetch)

## Execution Order
1. UI calls `parseResumeFromFile(file)`.
2. Function checks `file.type`. Branches to `extractTextFromPDF` or `extractTextFromDocx`.
3. Raw text is yielded.
4. Checks if `VITE_GROQ_API_KEY` exists. If yes, calls `callGroqApi(text)`.
5. AI API loop runs. If rate-limited (429), it waits and retries (`fetchWithRetry`).
6. If AI yields valid JSON, it passes to `normalizeParsedResume(parsedData, rawText)`.
7. If API fails, it passes raw text to `fallbackRegexParser()`.
8. Returns a `ParsedResume` object.
9. UI calls `parsedToProfile()` to convert it to a DB-ready `TalentProfile`.

## Key Functions

### `extractTextFromPDF(buffer)`
Crucially, it groups text items by their `transform[5]` property (the Y coordinate on the PDF canvas). Without this, PDFs with side-by-side columns (e.g., left sidebar for skills, right for experience) are extracted sequentially left-to-right, creating absolute gibberish.

### `normalizeParsedResume(parsed, text)`
The anti-hallucination function. It takes the AI's email and phone outputs and uses Regex `match()` against the original `text`. If the AI invented an email, this function drops it.

## Business Logic
AI is treated as untrusted input. The parser assumes the LLM will occasionally lie or format data incorrectly, hence the strict normalization step.

## Data Flow
Binary File -> ArrayBuffer -> Raw String -> JSON String (via Groq) -> Parsed Object -> Validated Object.

## Security
No arbitrary code execution is possible here because the AI output is parsed via `JSON.parse()` after stripping markdown backticks.

## Testing Strategy
Covered in `pdfParser.test.ts`. Tests simulate Groq API failures to ensure the regex fallback correctly grabs the emails.

## Common Interview Questions
*Q: Why does the PDF extractor group items by Y-coordinate?*
A: To prevent column bleed. If a PDF has a "Skills" column on the left and an "Experience" column on the right, standard extraction reads straight across the page, mixing skills into job titles. Grouping by Y-coordinate rebuilds the text logically block-by-block.
