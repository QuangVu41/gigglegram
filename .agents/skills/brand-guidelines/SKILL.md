---
name: brand-guidelines
description: Ensures UI development, visual styling, and content creation adhere to Gigglegram's brand identity, typography, color palettes, and tone of voice.
author: QuangVu41
date: 2026-04-16
version: 1.0.0
---

# brand-guidelines

## Purpose

To ensure that all UI/UX designs, frontend implementations, and copywriting consistently align with Gigglegram's core brand identity. This skill provides the definitive design tokens, typography rules, layout patterns, and brand voice guidelines necessary for creating a cohesive product experience reminiscent of modern, dynamic social media platforms.

## When to Use This Skill

This skill should automatically be referenced when:

- Designing or implementing new frontend components, pages, or features.
- Refactoring the UI, writing CSS, or applying styling libraries (e.g., Tailwind CSS).
- Adding new user flows that require reliable, consistent visual styling.
- Writing UX microcopy, error messages, empty states, or user notifications.
- The user requests to "apply brand colors" or "ensure brand consistency".

## Core Capabilities

1. **Visual Design Enforcement**: Applies Gigglegram's primary colors, gradients, layout structures, and dark/light mode themes consistently.
2. **Typography Standards**: Ensures correct font families, weights, letter spacing, and sizing hierarchies are strictly used.
3. **Voice & Tone Guidance**: Guides the generation of conversational, engaging, socially-driven, and clear user-facing text.
4. **Component Best Practices**: Suggests standard spacing, borders, radii, shadow usage, and micro-interactions.

## Brand Identity Specifications

### 1. Colors & Theming

- **Primary Aesthetics**: Gigglegram is vibrant, social, and modern.
- **Brand Highlights**: Social gradients (e.g., vivid pinks, deep oranges, purples) reserved for primary buttons, active states, branded logos, and interactive highlights.
- **Backgrounds**:
  - _Light Mode_: Pure white (`#FFFFFF`) or off-white (`#FAFAFA`) to foreground content.
  - _Dark Mode_: Deep black (`#000000`) or very dark gray (`#121212`) for battery saving and sleek aesthetics.
- **Text**:
  - _Primary Text_: High contrast (Black in Light Mode, White in Dark Mode).
  - _Secondary Text_: Subdued gray (e.g., `#8E8E8E` or equivalent) for timestamps, subtitles, and hints.
- **Feedback States**: Clean red (`#ED4956`) for errors and notifications, distinct blue (`#0095F6`) for links and affirmative actions.

### 2. Typography

- **Primary Font**: Clean, modern sans-serif (e.g., Inter, Roboto, or `system-ui`).
- **Hierarchy**:
  - _Headings_: Bold, clean, minimal letter-spacing for punchy delivery.
  - _Body_: Readable, standard weight, sufficient line-height (1.5) for long scrolling.
  - _Microcopy_: Smaller font size, typically using secondary text colors to reduce visual weight.

### 3. UI Patterns & Layout

- **Responsiveness**: Everything must be mobile-first.
- **Spacing**: Use a consistent 4px/8px modular grid system (e.g., Tailwind's standard `p-2`, `m-4` scales).
- **Borders & Radii**:
  - Soft rounded corners for buttons and cards (e.g., `rounded-lg`).
  - Full rounded (`rounded-full`) for avatars and status indicators.
- **Shadows & Depth**: Mostly flat design to keep the UI clean, with subtle drop shadows reserved exclusively for floating elements, popovers, and sticky navbars.

### 4. Voice and Tone

- **Friendly & Engaging**: Communications should feel welcoming, warm, and distinctly social.
- **Clear & Concise**: Keep UI text brief. Action-oriented verbs for buttons (e.g., "Share", "Post"). Avoid technical jargon unless necessary.
- **Encouraging**: Use positive reinforcement in empty states, onboarding flows, and success messages (e.g., "You're all caught up!").

## Execution Workflow

1. **Analyze Request**: Evaluate the component or text snippet being created or modified for its primary function.
2. **Apply Design Tokens**: Map standard design variables (e.g., Tailwind classes) directly to the element. Do not introduce arbitrary "magic numbers" or unapproved colors.
3. **Verify Context & Layout**: Ensure mobile-first responsiveness, proper padding/margin rhythms, and adherence to accessibility standards (e.g., WCAG contrast ratios).
4. **Review Copy**: Adjust text to fit the friendly, concise Gigglegram brand voice.

## References

- Follow project-specific coding and architecture rules located in `.agents/rules/.code-style-guide` (if available).
- Ensure consistent spacing logic using the core frontend platform specifications.

## Limitations

- This skill only enforces styling, aesthetics, and tone metadata. It does not replace functional logic or core architectural decisions.
- Wait for user confirmation before executing massive, automated project-wide CSS refactorings.
