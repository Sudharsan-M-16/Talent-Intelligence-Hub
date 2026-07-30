# Module: Testing Strategy

## 1. Why this concept exists
Untested code in a B2B application leads to catastrophic data corruption (e.g., parsing salaries into phone number fields). A robust test suite guarantees that complex business logic remains bulletproof as the application evolves.

## 2. Where this concept appears in THIS project
- `apps/web/src/test/` (9 test files)
- `package.json` (vitest configuration)

## 3. Which files implement it
- `apps/web/src/test/profileSpreadsheet.comprehensive.test.ts`
- `apps/web/src/test/pdfParser.test.ts`
- `apps/web/src/test/talentStore.test.ts`

## 4. Which functions implement it
- `describe()`, `it()`, `expect()` from Vitest.
- `render()`, `screen` from `@testing-library/react`.

## 5. Complete execution flow
1. **Runner**: Engineer runs `npm test`.
2. **Environment Setup**: Vitest boots up using the `jsdom` environment (simulating a browser).
3. **Execution**: Tests run in parallel. For spreadsheet tests, mock CSV data is injected into the pure function `parseProfilesWorkbook()`.
4. **Assertion**: `expect()` checks if the output perfectly matches the predicted interface.
5. **Report**: Vitest reports the pass/fail matrix.

## 6. Engineering decisions
- **Vitest over Jest**: Vite native. Extremely fast, zero configuration required to handle TypeScript or ES Modules (which Jest struggles with).
- **Focus on Pure Logic**: 90% of the tests focus on `lib/` (spreadsheets, parsers) rather than React UI components. Why? Because UI changes constantly, leading to brittle tests. Data ingestion logic is strictly mathematical and must be perfect.

## 7. Tradeoffs
- **Tradeoff**: Lack of End-to-End (E2E) UI testing (Cypress/Playwright).
- **Mitigation**: Pure unit tests cover the most dangerous parts of the codebase (data mutation and ingestion). E2E is slated for the Enterprise Roadmap.

## 8. Alternatives
- Jest (slower, hard to configure with Vite). Playwright component testing (too heavy for pure functions).

## 9. Common bugs
- **False Positives**: A test mocks too much of the system, passing the test but failing in production because the real system behaves differently than the mock.

## 10. Debugging techniques
- Run `npm test -- --ui` to open the beautiful Vitest UI in the browser for tracing.
- Use `it.only()` to isolate a single failing test.

## 11. Security implications
- The tests verify that malicious CSV injections (e.g., `=CMD()`) are sanitized by `normalizeField`. Without these tests, a regression could expose clients to macro viruses.

## 12. Performance implications
- The test suite runs in under 2 seconds.

## 13. Scalability implications
- Vitest scales well, but as tests exceed 1000, CI/CD shard execution might be necessary.

## 14. Best practices
- Write tests for *behaviors*, not *implementation details*. Test what the function *returns*, not *how* it computes it.

## 15. Future improvements
- Add Playwright for testing the Kanban drag-and-drop mechanics, which are impossible to test via `jsdom`.

## 16. Interview questions
- *Q: Why do the spreadsheet tests use `jsdom`?*
  A: Because the `read-excel-file` library specifically uses browser-native APIs (like `FileReader` and `Blob`) which do not exist in a pure Node environment.

## 17. Practical exercises
- Break the `normalizeField` regex intentionally and watch the test suite fail.

## 18. Mini implementation exercises
- Add a new unit test verifying that `normalizeField` correctly parses the string "10 years" into the integer `10`.

## 19. Reading checklist
- [ ] Read `profileSpreadsheet.comprehensive.test.ts`.

## 20. Completion checklist
- [ ] I can run the test suite.
- [ ] I understand the difference between mocking an API vs mocking a module.
