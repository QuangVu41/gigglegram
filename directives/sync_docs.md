# Sync Agent Documentation

This directive defines the SOP for maintaining parity between the mirrored agent instruction files.

## Goal

Ensure that `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` are always identical.

## Inputs

- **Source File**: The file containing the latest updates (e.g., `AGENTS.md`).
- **Target Files**: `CLAUDE.md`, `GEMINI.md`.

## Tools & Scripts

- **Tool**: `execution/sync_docs.py`

## Workflow

1. Use any text editing tool to modify one of the mirrored files (default Source of Truth is `AGENTS.md`).
2. Run the synchronization script:
   ```bash
   python3 execution/sync_docs.py --source AGENTS.md
   ```
3. The script will automatically overwrite the target files with the content of the source file.

## Edge Cases

- **Conflict**: If multiple files are edited simultaneously, the source provided to the script will win.
- **Permissions**: Ensure the script has write access to the root directory.
