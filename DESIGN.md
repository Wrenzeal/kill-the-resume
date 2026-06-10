# Design

## Source of truth
- Status: Active draft
- Last refreshed: 2026-06-02
- Primary product surfaces: `/editor` resume editing cockpit, live A4 resume preview, future JSON-driven resume modules.
- Evidence reviewed:
  - `AGENTS.md`: autonomous implementation, verification, and design workflow constraints.
  - User brief, 2026-06-02: Futuristic Tactical Console resume editor, three-pane App Router implementation, project experience block, A4 preview.
  - Repository inspection: no existing `src/`, UI components, screenshots, design docs, or package manifest before this phase.
  - Next.js official installation docs: App Router, TypeScript, Tailwind, ESLint, `src/` directory, root layout/page conventions.

## Brand
- Personality: hard-edged, tactical, cyberpunk, developer-native, precision-first.
- Trust signals: clear status telemetry, deterministic JSON/data framing, high-contrast preview truth, minimal ornamental ambiguity.
- Avoid: soft SaaS gradients, rounded consumer-dashboard cards, paper-first Word-like workflows, decorative controls without state meaning.

## Product goals
- Goals:
  - Make resume editing feel like operating a personal core-data console.
  - Keep data and presentation separate through typed JSON-shaped state.
  - Provide immediate feedback between form input and A4 preview.
  - Establish a reusable tactical visual language for future modules.
- Non-goals:
  - Full backend persistence in phase 1.
  - Complete resume schema editor in phase 1.
  - Pixel-perfect print/export pipeline in phase 1.
- Success signals:
  - `/editor` loads as a fixed-height three-column cockpit.
  - Project Experience fields update preview without submit/reload.
  - A4 preview remains visually distinct as a white paper surface inside a dark sandbox.

## Personas and jobs
- Primary personas: developers, hackers, technical founders, design-conscious engineers.
- User jobs:
  - Convert structured career data into a sharp resume quickly.
  - Edit keyboard-first while seeing immediate layout consequences.
  - Diagnose content density and fit issues before export.
- Key contexts of use: desktop/laptop primary; widescreen editing; future print/PDF export.

## Information architecture
- Primary navigation: left tactical anchor rail for resume modules and system actions.
- Core routes/screens:
  - `/`: launch/redirect surface to the editor.
  - `/editor`: tactical editor cockpit with module-switched editing panels for identity, projects, work, skills, education, and export protocol.
- Content hierarchy:
  - System header/status > section navigation > active data block editor > live A4 preview.

## Design principles
- Principle 1: Dark controls, white truth. Editing happens in a dark console; the preview is the print artifact.
- Principle 2: Every module is a block. Resume sections are typed data cards with visible status, density, and confidence.
- Principle 3: Focus is energy. Keyboard focus should be unmistakable through thin neon glow, not bulky borders.
- Principle 4: Compression before panic. Dense content uses measured compression/density cues before layout failure.
- Tradeoffs: Visual intensity must not reduce legibility; motion must respect reduced-motion preferences; fixed desktop cockpit may degrade on small screens until a later mobile layout pass.

## Visual language
- Color:
  - Console base: `#0D1117` / near-black layers.
  - Cyber green: `#39FF88` for active/focus/healthy states.
  - Warning orange: `#FF8A3D` for density pressure and tactical warnings.
  - Cyan trace: `#58E6FF` for telemetry accents.
  - Preview paper: pure white with print-neutral text.
- Typography:
  - Monospace for controls, labels, status, module titles.
  - System UI/serif-neutral preview typography for resume readability.
- Spacing/layout rhythm: dense 4px/8px tactical grid; three columns with fixed left rail and preview width, fluid center editor.
- Shape/radius/elevation: straight edges or tiny radii; hairline borders; deep black preview shadow.
- Motion: low-amplitude scan lines, focus sweep, and compression pulse; no distracting parallax.
- Imagery/iconography: ASCII-like glyphs, status dots, brackets, terminal prefixes.

## Components
- Existing components to reuse: none found.
- New/changed components:
  - `ResumeModuleConsoles`: Client module switcher with editable panels for all current resume sections.
  - `ProjectExperienceConsole`: legacy re-export retained for compatibility.
  - `ResumePreview`: Client Component A4 paper renderer driven by full resume state.
  - `EditorStatusStrip`: client telemetry header with language switcher.
  - `LanguageToggle` / `LanguageHydrator`: user-level Chinese/English preference controls.
- Variants and states:
  - Block status: stable, warning, overflow-risk.
  - Field status: idle, focused, dirty/updated.
  - Preview density: normal, compact, critical.
- Token/component ownership: global CSS owns tactical tokens and motion; components own semantic layout and data binding.

## Accessibility
- Target standard: WCAG 2.2 AA intent for contrast and keyboard access.
- Keyboard/focus behavior: visible `:focus-visible` ring/glow; labels remain connected to inputs.
- Contrast/readability: avoid low-opacity text for primary labels; preview remains print-readable.
- Screen-reader semantics: use real form labels, sections, headings, and aria-live only for meaningful status.
- Reduced motion and sensory considerations: disable scan/focus animations under `prefers-reduced-motion: reduce`.

## Responsive behavior
- Supported breakpoints/devices: desktop-first phase 1; large screens get fixed three-column cockpit.
- Layout adaptations: below wide desktop, editor can horizontally scroll instead of collapsing the A4 contract; future mobile may use tabs.
- Touch/hover differences: current interactions are keyboard/mouse-first; hover effects are supplementary only.

## Interaction states
- Loading: future skeleton as low-opacity scan rows.
- Empty: block-level placeholder with tactical coordinate copy.
- Error: warning orange border/status with concise remediation.
- Success: cyber green status and timestamp.
- Disabled: dimmed text, no glow, no motion.
- Offline/slow network: not applicable in phase 1 local state; future persistence should surface sync telemetry.

## Content voice
- Tone: terse, operational, uppercase labels for system chrome; Chinese is the default UI language, English remains available as a user preference.
- Terminology: module/block/payload/density/telemetry/A4 sandbox may remain as tactical English tokens when they improve the console aesthetic; surrounding guidance should be localized.
- Microcopy rules: prefer status fragments over paragraphs; no cute SaaS copy; keep language switching persistent per user via local preference storage until backend profiles exist.

## Implementation constraints
- Framework/styling system: Next.js 16 App Router, TypeScript, Tailwind CSS v4 via global CSS import, React 19, Zustand for client state and user preferences.
- Design-token constraints: keep tactical colors in CSS variables/classes; avoid adding a separate design-token package in phase 1.
- Performance constraints: direct controlled inputs backed by small Zustand slices; avoid heavyweight preview recalculation.
- Compatibility constraints: Naive UI is Vue-native; phase 1 borrows its disciplined component-state vocabulary but does not import Vue components into React. Revisit if a React-compatible adapter/design-system decision is made.
- Test/screenshot expectations: validate with typecheck, lint, and production build; future visual work should add Playwright screenshot baselines.

## Open questions
- [ ] Should the future backend store resume style presets separately from resume content? / product owner / impacts schema and editor state.
- [ ] Is final export PDF browser-rendered or backend-rendered? / engineering / impacts A4 layout engine and typography.
- [ ] Should mobile use tabbed panes or a command-palette flow? / design / impacts responsive IA.
