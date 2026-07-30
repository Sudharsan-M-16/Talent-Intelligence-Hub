# 05 Interview Preparation

## Frontend Architecture Questions

**Q: Why was Zustand chosen over Redux or Context API?**
**A:** Redux requires significant boilerplate (actions, reducers, types) which slows down velocity in a rapid MVP/V1 phase. Context API triggers re-renders on all descendants whenever the value changes, which would cripple the Kanban board's performance. Zustand provides global state without the boilerplate of Redux, while offering granular selector subscriptions to prevent unnecessary re-renders.

**Q: How does the PDF viewer work without an iframe?**
**A:** We use `pdfjs-dist`. Iframes can suffer from CORS issues, browser extensions intercepting the viewer, and lack of UI control. By using `pdfjs-dist`, we load the PDF into an HTML5 Canvas. This gives us absolute control over the rendering, allows us to overlay our own UI, and enables us to extract the raw text directly from the worker for our AI parser pipeline simultaneously.

## System Design Questions

**Q: If TIH scales to 1,000,000 resumes, how does the architecture change?**
**A:** Currently, TIH is client-heavy. The browser parses the PDF and normalizes the CSV. For 1 million records, this breaks the browser. We would need to implement an event-driven backend.
1. The client uploads the file directly to an S3 bucket via presigned URLs.
2. S3 triggers a Lambda/Edge function.
3. The function places a message in an SQS queue.
4. A worker node (ECS) picks up the message, runs the PDF parser or CSV normalizer, calls the Groq AI, and writes to Supabase.
5. Supabase broadcasts a Realtime WebSocket event to the client's Zustand store, updating the UI.

## Founder / Product Architect Questions

**Q: Why do we have a demo mode at all instead of forcing logins?**
**A:** Friction. Enterprise B2B SaaS requires high trust. By allowing users to experience the "magic" of the UI and the speed of the Kanban board offline without handing over an email, we drastically increase conversion rates. It also ensures the sales team can demo the product seamlessly even with spotty conference Wi-Fi.

## Debugging Scenarios

**Q: A user drags a card on the Kanban board on their phone, but the screen scrolls instead of moving the card. Why?**
**A:** In `dnd-kit`, the default sensors might not capture touch events properly on mobile if CSS `touch-action` properties aren't set, or if the `TouchSensor` isn't explicitly initialized alongside the `PointerSensor`. The fix is ensuring both sensors are active in the `DndContext` and `touch-action: none` is applied to draggable handles.
