# Module: PDF and DOCX Parsing

## 1. Why this concept exists
Resumes are overwhelmingly provided in PDF or DOCX formats. To extract text for AI analysis or manual viewing, the application must decode these proprietary binary formats in the browser without relying on expensive server-side file processing.

## 2. Where this concept appears in THIS project
- `apps/web/src/lib/pdfParser.ts`
- `apps/web/src/components/ui/ResumePreview.tsx`

## 3. Which files implement it
See above.

## 4. Which functions implement it
- `extractTextFromPDF()`
- `extractTextFromDocx()`
- `<canvas>` rendering logic inside `ResumePreview.tsx`.

## 5. Complete execution flow
**For Text Extraction (`pdfParser.ts`):**
1. File is passed as an `ArrayBuffer`.
2. **If PDF**: `pdfjs-dist.getDocument()` loads the buffer. The script iterates through pages, extracting text items. It uses Y-coordinate grouping to handle multi-column layouts gracefully.
3. **If DOCX**: `mammoth.extractRawText()` processes the array buffer and returns raw string data.

**For Visual Preview (`ResumePreview.tsx`):**
1. The component receives a File object or URL.
2. It initializes `pdfjs-dist` and fetches the first page.
3. It calculates the viewport scale to fit the container.
4. It calls `page.render({ canvasContext, viewport })`, drawing the PDF natively into the HTML5 `<canvas>`.

## 6. Engineering decisions
- **Canvas Rendering vs `<iframe>`**: Using `<iframe src="file.pdf">` is highly dependent on the user's browser (Safari handles it differently than Chrome, mobile often downloads the file instead of rendering). Using `pdfjs-dist` to render to a `<canvas>` guarantees 100% pixel-perfect consistency across all devices and OSs.
- **Y-coordinate Grouping**: Standard PDF text extraction reads left-to-right, ignoring columns, often mixing dates and company names. The text extractor groups items by their vertical `Y` position to preserve logical reading flow.

## 7. Tradeoffs
- **Tradeoff**: `pdfjs-dist` is a massive library (~2MB).
- **Mitigation**: It is dynamically imported and lazy-loaded only when parsing occurs or the preview drawer is opened.

## 8. Alternatives
- Sending files to a Python backend running `PyPDF2`. Rejected because it requires standing up a compute-heavy backend server.

## 9. Common bugs
- **Missing Worker**: `pdfjs-dist` requires a Web Worker to decode PDFs without blocking the main thread. If the worker path is misconfigured, parsing fails silently.
- *Fix*: The worker is explicitly imported from `pdfjs-dist/build/pdf.worker.mjs` in the setup.

## 10. Debugging techniques
- If the canvas renders blurry, check the `window.devicePixelRatio`. Canvas contexts must be scaled by this ratio on high-DPI (Retina) displays to look sharp.

## 11. Security implications
- PDFs can contain malicious JavaScript. Rendering them via `<canvas>` instead of an `<embed>` completely mitigates PDF-based XSS attacks.

## 12. Performance implications
- Rendering a 10-page PDF to a canvas on a mobile device can consume significant RAM. The previewer currently only renders one page at a time.

## 13. Scalability implications
- Browser-based parsing scales infinitely because it utilizes the user's local CPU.

## 14. Best practices
- Always clean up the PDF object (`pdf.destroy()`) in a `useEffect` cleanup block to prevent memory leaks.

## 15. Future improvements
- Implement zooming and multi-page scrolling in the `<ResumePreview>`.

## 16. Interview questions
- *Q: Why did you use `pdfjs-dist` to render to a canvas instead of an iframe?*
  A: Iframes delegate rendering to the OS/Browser, which leads to inconsistent UI, mobile downloading the file, and potential XSS. Canvas rendering gives complete UI control and security.

## 17. Practical exercises
- Open `ResumePreview.tsx` and modify the rendering context to apply a CSS filter that inverts colors for a "dark mode" PDF.

## 18. Mini implementation exercises
- Add a "Download PDF" button to the `ResumePreview` component.

## 19. Reading checklist
- [ ] Read `ResumePreview.tsx`
- [ ] Read the text extraction functions in `pdfParser.ts`

## 20. Completion checklist
- [ ] I understand why Y-coordinate grouping is used for text extraction.
- [ ] I understand how the Web Worker prevents UI blocking.
