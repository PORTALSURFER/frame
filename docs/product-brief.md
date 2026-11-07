# Frame product brief

Working brief. The purpose and visual-only scope below reflect the product discussion. Interface priorities are design implications to refine through use.

## Purpose

Frame helps people develop UI concepts with AI agents through a fast loop of visual design, human feedback, and revision. Its goal is to help people and agents converge quickly on a visually strong interface concept.

Agents get tools suited to creating, inspecting, and modifying visual concepts. People get simple ways to review the results and point precisely to what they want changed.

## Users and central workflow

The human directs the design and judges the result. The AI agent does the concepting and revision work. Frame supports both sides of their collaboration.

1. The person describes the interface they want to explore.
2. The agent creates a visual concept using tooling that fits agent workflows.
3. The person reviews it and provides feedback through marks, notes, and other contextual annotations.
4. The agent reads that feedback with enough visual and structured context to understand its target.
5. The agent revises the concept, and the person reviews the next version.

The loop should remain quick and precise across repeated iterations. The person should not need expertise in a conventional design editor to communicate a change.

## Scope: visual concepts

Concepts show how an interface looks. Screens, viewport sizes, and visual states can be represented as separate previews or variants. A focused row, an open panel, or a selected item can be shown without implementing the application's behavior.

Clickable target-application controls, simulated workflows, business logic, and production application development are outside Frame's intended concepting scope. Adding them at this stage introduces complexity that belongs to developing the application itself.

Frame's own review and annotation tools remain interactive. Choosing a preview, navigating the canvas, drawing a mark, or placing a note is part of using Frame, rather than simulating the application being designed.

Existing prototype-interaction capabilities are historical implementation context. This brief establishes intended direction; it does not request their removal or a source-code refactor.

## Working controls and important information

The concept is the main working surface. Keep the tools used to inspect it and give feedback directly available in predictable locations. Keep the relationship between the displayed concept, its revision, and its feedback understandable.

Preview selection, canvas navigation, marking, notes, and correction of feedback should support a small learning period followed by fluent repeated use. Familiar actions can use simple icons with accessible names and concise reminders. Avoid permanent instructions and labels that compete with the concept.

Agent tooling should make targeted changes and reliable visual inspection straightforward. Feedback needs to retain the relevant screen, state, location or element, and revision context so the agent can act precisely and the person can recognize what changed.

Infrequent setup, source/storage configuration, and long-term preferences can live in settings or occasional-use menus. Keep the everyday review loop direct.

## Keyboard workflow

Tab and Shift+Tab move through working controls in a predictable order. Arrow keys, Home, and End immediately preview screen, visual-state, and viewport choices while keeping focus on the selector. Keyboard users can browse revisions in History without changing the live design; restoring a revision remains an explicit action. Native picker access and ordinary text editing remain available.

Pointing at a preview selector and pressing Up or Down focuses it and previews the adjacent choice without opening the dropdown. Hover alone does not move focus. Tab resumes ordinary keyboard navigation; text editing and open dialogs keep their own keyboard behavior. Clicking a selector still opens its native menu, where Enter confirms a highlighted choice.

## Visual character

Frame's own interface should feel calm, minimal, visually pleasing, and carefully composed. Readable typography, proportion, spacing, and restrained controls should make long review sessions comfortable while giving the concept room to be judged.

Frame should support the visual language of the product being explored. Its host interface should not impose one appearance on every concept. Exact host styling and control layout remain design decisions to refine.

## Signs of success

- A person can identify what they want changed and communicate it without a lengthy verbal description or editor training.
- An agent can connect feedback to the intended design element or area and make a targeted visual revision.
- Earlier work and feedback remain understandable as concepts evolve.
- The creation-to-review-to-revision loop stays short, with little setup or manual coordination.
- The resulting concepts are visually pleasing and useful for deciding an interface's visual direction without first building its behavior.

## Relationship to shared guidance

This local brief applies the global Product design philosophy from the Codex configuration folder (`$CODEX_HOME/design-philosophy.md`, normally `~/.codex/design-philosophy.md`). Product-specific decisions stay here. Additional briefs can describe distinct user-facing systems within Frame if needed, linked to this parent brief.

## Parallel exploration

A person can compare several alternatives for the same screen, visual state and viewport by switching a Version selector. Each alternative retains independent feedback and revision history. An explicit preference identifies the version to continue; alternatives and their feedback stay available so an agent can combine selected ideas into another concept. This review flow uses one canvas. Infrequent design-guide selection lives with design setup.
