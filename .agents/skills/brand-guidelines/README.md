# Brand Guidelines Skill

This skill acts as a unified source of truth to help AI agents implement and enforce the visual and textual brand identity of **Gigglegram**. By providing deterministic guidelines for colors, typography, UI patterns, and tone of voice, this skill ensures consistency across the entire social media application and speeds up feature development.

## Purpose

To prevent visual regressions and mismatched styling across platforms by strictly defining Gigglegram's primary aesthetics, maintaining an Instagram-like premium feel throughout the development process.

## Installation

This skill is located at `./agents/skills/brand-guidelines`. Any configured AI agent pointing to this repository's skill path will automatically pick up and adhere to these directives.

## Usage

AI Agents will automatically invoke and reference this skill when fulfilling requests such as:

- "Build a new React component for the user feed."
- "Update the styling of the login page to make it more vibrant."
- "Write the UX copy for an empty inbox state."
- "Check if this new header component aligns with Gigglegram's brand."

You can also explicitly trigger the skill during an agent session by including keywords like **"brand guidelines"**, **"Gigglegram brand"**, or **"ensure brand consistency"** in your prompt.

## Extending Guidelines

To extend the design specifications, simply modify the `SKILL.md` file within this directory and detail the new patterns (e.g., adding specific animations or charting colors). For more complex, multi-page guidelines, document them in the `references/` directory and cite them in `SKILL.md`.
