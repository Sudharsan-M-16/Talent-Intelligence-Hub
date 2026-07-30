# Code Deep Dive: `src/lib/pdfParser.ts`

## Purpose
This file is the engine behind the "Magic AI Resume Upload". It takes a raw PDF or DOCX file, extracts the text from it directly in the browser, and structures it into a standard JSON `TalentProfile` using Groq API and heuristic fallbacks.

## Architecture & Flow
1. **File Type Detection**: Detects MIME type. If DOCX, routes to `mammoth`. If PDF, routes to `pdfjs-dist`.
2. **Text Extraction (`extractTextFromPDF`)**:
   - Initializes PDF.js worker.
   - Iterates over pages.
   - For each page, extracts `textItems`.
   - **Crucial Algorithm**: PDF text isn't a string; it's absolute X/Y coordinates. The parser groups text items by their `transform[5]` (Y coordinate) to reconstruct paragraphs. Without this, multi-column resumes become unintelligible garbage.
3. **AI Inference (`parseResumeWithAI`)**:
   - Takes the raw extracted string and sends it to Groq API.
   - Enforces a JSON schema via prompt engineering.
   - Uses `fetchWithRetry` to handle rate limits (429) or network hiccups via exponential backoff.
4. **Fallback & Normalization (`normalizeParsedResume`)**:
   - AI hallucinates. We cannot trust it blindly.
   - The system runs standard Regex on the original raw text to find emails and phone numbers. If the AI's returned email doesn't match the regex-extracted email, the AI result is discarded and replaced with the regex result.

## Dependencies
- `pdfjs-dist`: For rendering and text extraction of PDFs.
- `mammoth`: For DOCX to HTML/Text conversion.

## Complexities & Tradeoffs
- **Bundle Size**: `pdfjs-dist` is massive. We rely on Vite's dynamic imports or worker separation so it doesn't block the main initial load of the application.
- **API Key Exposure**: Currently, the Groq API key is exposed in the frontend. This is acceptable for a V1 MVP to avoid building a backend, but it is a massive security risk in production.

## Potential Bugs
- **Encrypted PDFs**: PDF.js will throw an error if the user uploads an encrypted or password-protected PDF.
- **Image-based PDFs**: If a user uploads a scanned image saved as a PDF, `pdfjs-dist` will extract 0 text (it lacks OCR).

## Interview Questions
**Q: Why do we group PDF text by Y-coordinates?**
A: PDFs do not have a concept of paragraphs or HTML flow. They just tell the printer "put the letter A at coordinate x=10, y=20". Multi-column resumes will interleave text from left and right columns if you just read them linearly. Grouping by Y-coordinates roughly reconstructs lines.
