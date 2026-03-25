# AI Integration Documentation

## Project Overview
This project was developed with extensive AI assistance across planning, implementation, review, and testing. Over the course of the work, the application reached completion for Epics 1-5, 7, and 8, covering project setup, authentication, habit management, calendar interactions, statistics, app shell/navigation, and end-to-end regression coverage. Epic 6, `AI Coaching`, remained intentionally deferred.

AI was used not just for generating code, but for helping structure stories, implement features, refine follow-up tasks, review changes, and expand test coverage. The most effective use of AI came from treating it as an active development partner rather than a one-off code generator.

## 1. Agent Usage
AI assistance was used across nearly the full lifecycle of the project:

- Breaking work into implementation stories and tracking progress across epics.
- Implementing feature work in both client and server areas.
- Refactoring routing and auth guard logic.
- Wiring real-time statistics updates after user actions.
- Generating and refining unit, integration, and end-to-end tests.
- Reviewing changes and identifying follow-up fixes or gaps.
- Producing implementation notes and completion summaries.

In practice, AI contributed to work across:

- Epic 1: project setup and infrastructure.
- Epic 2: authentication flows.
- Epic 3: habit CRUD and archive lifecycle.
- Epic 4: calendar view and day-marking interactions.
- Epic 5: progress and statistics behavior.
- Epic 7: app shell, layouts, routing, and navigation.
- Epic 8: end-to-end regression coverage with Playwright.

### What prompts worked best
Overall, prompt quality was less brittle than expected. Even prompts that were somewhat informal or incomplete often still produced useful results.

The workflow evolved over time:

- At the beginning, I used ChatGPT to help generate clearer and more structured prompts.
- Later, I switched to writing prompts myself.
- Once I understood how to frame the work, my own prompts worked well too, even when they were not perfectly polished.

The most effective prompts usually had these qualities:

- They described the goal clearly.
- They gave concrete constraints or acceptance criteria.
- They named the relevant files, flows, or components when precision mattered.
- They turned vague concerns into explicit tasks.

In short, highly polished prompts were helpful at first, but they were not strictly necessary once the project context was established. Clear intent mattered more than perfect wording.

## 2. MCP Server Usage
During this project, I leveraged Cursor's built-in tool integrations, which function similarly to MCP servers, even though they are abstracted at the IDE level.

Specifically, I used:

- File system interactions: the model was able to create, modify, and delete files directly within the codebase. This significantly accelerated development and reduced manual work when implementing features or refactoring.
- Repository browsing: the model could navigate the project structure, understand context across multiple files, and make consistent changes across the codebase.
- Terminal execution: the model executed commands such as running scripts and validating behavior, enabling a more autonomous and streamlined workflow.

These capabilities allowed the model to move beyond simple prompt-response interactions and act more like an active development agent. As a result, development iterations were faster, context was preserved better across the project, and less time was lost to manual context-switching.

While I did not explicitly configure standalone MCP servers, these integrated capabilities in Cursor effectively provided many of the same benefits as filesystem and execution-oriented MCP tools.

## 3. Test Generation
AI was heavily involved in test-related work, but the quality of outcomes depended on how explicitly testing was requested.

AI helped with:

- Generating and updating unit and integration tests alongside feature work.
- Extending route guard and page behavior coverage when architecture changed.
- Creating a dedicated story for end-to-end coverage once the app had enough real user flows to justify it.
- Implementing a Playwright suite that covered major MVP journeys such as auth, create habit, mark/unmark, archive/unarchive, and delete.

What AI missed initially:

- End-to-end testing was under-emphasized until it was explicitly called out.
- E2E coverage did not emerge automatically just because the product features were implemented.
- Some testing gaps only became visible after recognizing that the shipped flows needed release-confidence coverage, not just component or unit validation.

The key lesson was that AI handled test generation well once testing was framed as a first-class deliverable. It was much less reliable when test expectations were only implied.

## 4. Debugging with AI
AI was helpful in debugging and follow-up refinement, especially when issues could be translated into clear, scoped tasks.

The most useful cases were not always classic code bugs. They were often product and UI quality issues such as:

- Mismatched page widths.
- Strange focus or highlight behavior.
- Missing or inconsistent styles on some components.
- Incomplete polish across related screens.

AI was useful for investigating, applying fixes, and following structured implementation tasks. However, it performed best after the problems were identified clearly and rewritten as actionable requests.

Another important example was test coverage itself. End-to-end testing had effectively been overlooked, so I had to create a dedicated story and describe the expected coverage very explicitly. Once that was done, AI was able to execute against that scope much more effectively.

## 5. Limitations Encountered
AI was highly productive, but it was not equally strong in every area.

The main limitations were:

- UI polish issues were not always caught proactively.
- Visual consistency problems could slip through unless they were pointed out directly.
- Some work that felt "obviously needed," such as stronger E2E coverage, was not always surfaced by default.
- Broad or vague requests sometimes produced acceptable output, but not always complete output.

Human expertise was especially important in:

- Recognizing when the UI still felt inconsistent, even if the implementation was technically correct.
- Identifying missing quality work that had not been made explicit yet.
- Creating new follow-up tasks when the first pass was incomplete.
- Writing sharper instructions for edge cases, polish work, and testing expectations.

The overall experience was still strongly positive. AI accelerated implementation and reduced a large amount of repetitive work, but the best results came when human judgment was used to spot gaps, define priorities, and turn fuzzy concerns into precise tasks.

## Final Reflection
AI was most effective in this project when used as a collaborative development agent with strong context and clear direction. It performed well across feature delivery, refactoring, documentation, and test generation, and it remained useful even when prompts were not perfectly refined.

Its biggest weaknesses appeared in areas that depended on taste, product judgment, or proactive recognition of missing work. In those cases, human direction was essential. The strongest workflow was therefore a hybrid one: AI handled speed, breadth, and implementation momentum, while human oversight handled prioritization, quality judgment, and defining what "done" should really mean.
