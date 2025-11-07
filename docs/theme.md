# Theme & Dark Mode System

## Overview

The application now exposes a centralized theming system that keeps light and dark
mode in sync across the public marketing pages and the administrative shell. The
system is made up of three layers:

1. **State management** – `ThemeProvider` in `src/providers/ThemeProvider.tsx`
   persists the active mode in `localStorage`, reacts to OS preference changes,
   and guarantees that every toggle in the app reads from the same context.
2. **Design tokens** – `src/index.css` defines semantic CSS custom properties for
   backgrounds, surfaces, typography, borders, and accent colors. The values flip
   automatically inside the `.dark` scope.
3. **Utility classes** – reusable helpers (e.g. `bg-theme-surface`,
   `text-theme-secondary`, `shadow-theme-elevated`) wrap the tokens so components
   can opt into the palette without hand-writing hex values.

## Theme tokens

| Token | Light value | Dark value | Usage |
| --- | --- | --- | --- |
| `--color-bg-page` | `rgb(248 250 252)` | `rgb(15 23 42)` | Body backgrounds, full page sections |
| `--color-bg-surface` | `rgb(255 255 255)` | `rgb(31 41 55)` | Cards, navigation bars, modals |
| `--color-bg-subtle` | `rgb(241 245 249)` | `rgb(17 24 39)` | Hover states, subtle containers |
| `--color-bg-muted` | `rgb(226 232 240)` | `rgb(30 41 59)` | Dividers, striped backgrounds |
| `--color-text-primary` | `rgb(17 24 39)` | `rgb(248 250 252)` | Headings, primary copy |
| `--color-text-secondary` | `rgb(71 85 105)` | `rgb(203 213 225)` | Supporting text, labels |
| `--color-text-muted` | `rgb(100 116 139)` | `rgb(148 163 184)` | Meta text, helper text |
| `--color-border` | `rgba(15, 23, 42, 0.12)` | `rgba(148, 163, 184, 0.32)` | Default borders |
| `--color-action-primary` | `#7dc242` | `#9ed050` | Brand CTA backgrounds |
| `--color-action-primary-hover` | `#6da52f` | `#8cc63f` | CTA hover state |
| `--color-action-primary-soft` | `rgba(125, 194, 66, 0.18)` | `rgba(158, 208, 80, 0.22)` | Active row highlights |
| `--color-action-contrast` | `#0b1120` | `#0f172a` | Text on primary buttons |
| `--color-action-primary-focus` | `rgba(125, 194, 66, 0.35)` | `rgba(158, 208, 80, 0.38)` | Focus rings |

See `src/index.css` for the complete list, including shadows and input styles.

## CSS helpers

The helpers are plain classes defined in `src/index.css`, so they can be used in
any component alongside Tailwind utilities:

| Helper | Description |
| --- | --- |
| `bg-theme-page`, `bg-theme-surface`, `bg-theme-subtle`, `bg-theme-muted` | Background layers mapped to the tokens |
| `text-theme-primary`, `text-theme-secondary`, `text-theme-muted` | Semantic text colors |
| `border-theme`, `border-theme-muted`, `border-theme-strong` | Border colors |
| `shadow-theme-elevated`, `shadow-theme-popover` | Depth presets tuned for each theme |
| `transition-theme` | Smooth theme transitions across background, text, border, and shadow |
| `hover:bg-theme-subtle`, `hover:text-theme-primary`, `hover:border-theme-muted` | Stateful variants for the above |
| `bg-action-primary`, `hover:bg-action-primary-hover`, `active:bg-action-primary-active` | Primary CTA background states |
| `text-action-contrast` | Text color that keeps buttons accessible in both modes |

Default form controls (`input`, `textarea`, `select`) automatically inherit the
tokenized backgrounds, borders, and focus rings so bespoke styles are optional.

## React usage

- Wrap the application once with `<ThemeProvider>` in `src/main.tsx` (done).
- Access the theme anywhere with the `useTheme` hook:

  ```tsx
  import { useTheme } from '@/hooks/useTheme';

  function ThemeToggleButton() {
    const { isDark, toggle } = useTheme();

    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isDark}
        className="p-2 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle transition-theme"
      >
        {isDark ? 'Switch to light' : 'Switch to dark'}
      </button>
    );
  }
  ```

- The provider keeps the `<html>` class in sync, persists the choice to
  `localStorage`, listens for cross-tab changes, and reacts to OS preference
  updates via `matchMedia`.

## Accessibility guidance

- `:root { color-scheme: light dark; }` allows native form controls to respect
  the active mode.
- All key color pairs hit a contrast ratio ≥ 4.5:1. Buttons use
  `text-action-contrast` so the text color adjusts alongside the background.
- Theme transitions respect `transition-theme`; add `motion-safe` wrappers if
  additional animations are introduced.
- Focus rings reuse `--color-action-primary-focus` for visibility on both light
  and dark backgrounds.

## Migration checklist

When updating existing components or adding new UI, follow these steps:

1. Replace hard-coded `bg-white`, `text-gray-*`, etc. with the semantic helpers.
2. Prefer the shared `Button`, `Card`, and layout primitives so state styling is
   consistent.
3. If a component needs a new color, add a semantic token instead of inlining a
   hex value.
4. Verify the component in both light and dark mode (Storybook or local testing)
   and ensure hover/focus states remain accessible.
