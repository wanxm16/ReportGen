"""Example file management service"""

import json
from pathlib import Path
from typing import List, Dict

EXAMPLES_DIR = Path("examples")
INDEX_FILE = EXAMPLES_DIR / "index.json"


class ExampleManager:
    """Manage example file metadata"""

    @staticmethod
    def load_index() -> List[Dict[str, str]]:
        """Load example files index

        Returns:
            List of example file metadata
        """
        if not INDEX_FILE.exists():
            return []

        try:
            with open(INDEX_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Failed to load example index: {e}")
            return []

    @staticmethod
    def save_index(examples: List[Dict[str, str]]) -> None:
        """Save example files index

        Args:
            examples: List of example file metadata
        """
        try:
            EXAMPLES_DIR.mkdir(exist_ok=True)
            with open(INDEX_FILE, 'w', encoding='utf-8') as f:
                json.dump(examples, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error: Failed to save example index: {e}")
            raise

    @staticmethod
    def add_example(file_id: str, filename: str) -> None:
        """Add an example file to the index

        Args:
            file_id: Unique file ID
            filename: Original filename
        """
        examples = ExampleManager.load_index()

        # Check if already exists
        if any(ex['id'] == file_id for ex in examples):
            return

        examples.append({
            'id': file_id,
            'name': filename
        })

        ExampleManager.save_index(examples)

    @staticmethod
    def remove_example(file_id: str) -> None:
        """Remove an example file from the index

        Args:
            file_id: File ID to remove
        """
        examples = ExampleManager.load_index()
        examples = [ex for ex in examples if ex['id'] != file_id]
        ExampleManager.save_index(examples)

        # Also delete the physical file
        for ext in ['.md', '.markdown', '.docx', '.doc']:
            file_path = EXAMPLES_DIR / f"{file_id}{ext}"
            if file_path.exists():
                file_path.unlink()
                break

    @staticmethod
    def get_all_examples() -> List[Dict[str, str]]:
        """Get all example files

        Returns:
            List of example file metadata
        """
        return ExampleManager.load_index()
