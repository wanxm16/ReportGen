#!/usr/bin/env python3
"""
Fix duplicate chapter titles in existing projects.

This script cleans up chapter titles that may have been duplicated
during the document parsing process.
"""

import json
import sys
from pathlib import Path


def clean_repeated_title(title: str) -> str:
    """Remove repeated patterns from a title.

    Example: "一、标题一、标题一、标题" -> "一、标题"
    """
    if not title:
        return title

    # Try to detect if the title contains repeated patterns
    length = len(title)

    # Check for repetitions of various lengths (from 1 to half the title)
    for segment_len in range(1, length // 2 + 1):
        if length % segment_len == 0:
            # Check if title consists of repeated segments
            segment = title[:segment_len]
            repetitions = length // segment_len

            # If title equals segment repeated multiple times, return just one segment
            if segment * repetitions == title:
                return segment

    return title


def fix_chapters_file(chapters_file: Path) -> bool:
    """Fix duplicate titles in a chapters.json file."""
    if not chapters_file.exists():
        return False

    try:
        with open(chapters_file, 'r', encoding='utf-8') as f:
            chapters = json.load(f)

        modified = False
        for chapter in chapters:
            original_title = chapter.get('title', '')
            cleaned_title = clean_repeated_title(original_title)

            if original_title != cleaned_title:
                print(f"  Cleaning: {original_title[:50]}... -> {cleaned_title}")
                chapter['title'] = cleaned_title
                modified = True

        if modified:
            # Backup original file
            backup_file = chapters_file.with_suffix('.json.backup')
            chapters_file.rename(backup_file)
            print(f"  Backed up original to: {backup_file}")

            # Write cleaned data
            with open(chapters_file, 'w', encoding='utf-8') as f:
                json.dump(chapters, f, ensure_ascii=False, indent=2)
            print(f"  Saved cleaned chapters to: {chapters_file}")
            return True
        else:
            print(f"  No duplicates found, skipping.")
            return False

    except Exception as e:
        print(f"  Error processing {chapters_file}: {e}")
        return False


def main():
    """Scan all projects and fix duplicate chapter titles."""
    projects_dir = Path("projects")

    if not projects_dir.exists():
        print("Error: projects directory not found")
        sys.exit(1)

    print("Scanning for projects with duplicate chapter titles...")
    fixed_count = 0

    for project_dir in projects_dir.iterdir():
        if not project_dir.is_dir():
            continue

        chapters_file = project_dir / "chapters.json"
        if not chapters_file.exists():
            continue

        print(f"\nProject: {project_dir.name}")
        if fix_chapters_file(chapters_file):
            fixed_count += 1

    print(f"\n{'=' * 60}")
    print(f"Fixed {fixed_count} project(s)")
    print("Done!")


if __name__ == "__main__":
    main()
