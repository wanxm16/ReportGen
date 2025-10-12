"""Migrate existing example files to the index system"""

import json
from pathlib import Path

EXAMPLES_DIR = Path("examples")
INDEX_FILE = EXAMPLES_DIR / "index.json"

def migrate_examples():
    """Find all existing example files and add them to the index"""
    examples = []

    # Find all example files
    for file_path in EXAMPLES_DIR.glob("*"):
        # Skip non-file entries and special files
        if not file_path.is_file():
            continue
        if file_path.name in ['.gitkeep', '.DS_Store', 'index.json']:
            continue

        # Extract file ID (everything before the extension)
        file_id = file_path.stem

        # Use the filename as the display name
        filename = file_path.name

        examples.append({
            'id': file_id,
            'name': filename
        })

        print(f"Added: {filename} (ID: {file_id})")

    # Save index
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump(examples, f, ensure_ascii=False, indent=2)

    print(f"\nMigration complete. Added {len(examples)} files to index.")

if __name__ == '__main__':
    migrate_examples()
