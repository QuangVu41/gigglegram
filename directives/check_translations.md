# Check Translation Parity

This directive defines the SOP for ensuring that all locale files (`en.json`, `vi.json`) maintain perfect key parity.

## Goal

Prevent hydration mismatches and missing text by ensuring every translation key exists in all supported languages.

## Inputs

- **Directory**: `apps/web/messages/`
- **Files**: `en.json`, `vi.json`

## Tools & Scripts

- **Tool**: `execution/check_translations.py`

## Workflow

1. Run the validation script:
   ```bash
   python3 execution/check_translations.py
   ```
2. The script will recursively scan the JSON structures and report:
   - Keys present in `en.json` but missing in `vi.json`.
   - Keys present in `vi.json` but missing in `en.json`.
3. If discrepancies are found, they must be resolved before committing the changes.

## Edge Cases

- **Deep Nesting**: The script handles nested objects recursively.
- **Empty Values**: Keys with empty strings are still considered present but may flag a warning if the script is configured to check for untranslated content.
