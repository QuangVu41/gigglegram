import json
import os

def get_keys(data, keys_set, prefix=""):
    """
    Recursively extract all keys from a nested dictionary into the provided set.
    """
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys_set.add(full_key)
            get_keys(v, keys_set, full_key)

def check_translations():
    en_path = "apps/web/messages/en.json"
    vi_path = "apps/web/messages/vi.json"

    print(f"Loading {en_path}...")
    if not os.path.exists(en_path) or not os.path.exists(vi_path):
        print("Error: Locale files not found.")
        return

    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    print(f"Loading {vi_path}...")
    with open(vi_path, 'r', encoding='utf-8') as f:
        vi_data = json.load(f)

    print("Extracting keys...")
    en_keys = set()
    vi_keys = set()
    get_keys(en_data, en_keys)
    get_keys(vi_data, vi_keys)
    print("Comparing...")

    missing_in_vi = en_keys - vi_keys
    missing_in_en = vi_keys - en_keys

    if not missing_in_vi and not missing_in_en:
        print("✅ Translation parity maintained. All keys match.")
    else:
        if missing_in_vi:
            print(f"❌ Missing in vi.json ({len(missing_in_vi)} keys):")
            for key in sorted(missing_in_vi):
                print(f"  - {key}")
        
        if missing_in_en:
            print(f"❌ Missing in en.json ({len(missing_in_en)} keys):")
            for key in sorted(missing_in_en):
                print(f"  - {key}")

if __name__ == "__main__":
    check_translations()
