import argparse
import os
import shutil

def sync_docs(source_file):
    """
    Syncs the content of the source file to other mirrored instruction files.
    """
    targets = ["AGENTS.md", "CLAUDE.md", "GEMINI.md"]
    
    if source_file not in targets:
        print(f"Error: {source_file} is not a valid mirrored file.")
        return

    if not os.path.exists(source_file):
        print(f"Error: Source file {source_file} does not exist.")
        return

    # Read source content
    with open(source_file, 'r') as f:
        content = f.read()

    # Sync to targets
    for target in targets:
        if target == source_file:
            continue
        
        try:
            with open(target, 'w') as f:
                f.write(content)
            print(f"Synced {source_file} -> {target}")
        except Exception as e:
            print(f"Failed to sync to {target}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync mirrored agent instruction files.")
    parser.add_argument("--source", required=True, help="The source file to sync from (AGENTS.md, CLAUDE.md, or GEMINI.md)")
    
    args = parser.parse_args()
    sync_docs(args.source)
