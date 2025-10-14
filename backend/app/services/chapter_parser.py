"""Utilities to parse chapter structures from documents."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List


@dataclass
class ParsedChapter:
    """Parsed chapter representation."""

    title: str
    content: str


class ChapterParser:
    """Parse documents into chapters based on headings."""

    # Patterns for different heading styles
    HEADING_PATTERNS = [
        r"^(第[一二三四五六七八九十百千万]+[章节篇部段])[\s　]*(.*)$",
        r"^([一二三四五六七八九十]+[\.、])[\s　]*(.*)$",
        r"^([0-9]+[\.\、])[\s　]*(.*)$",
        r"^(#{1,3})\s+(.*)$",
    ]

    def __init__(self) -> None:
        self._compiled_patterns = [re.compile(pattern) for pattern in self.HEADING_PATTERNS]

    def parse(self, text: str) -> List[ParsedChapter]:
        """Parse the document text into chapters."""
        if not text:
            return []

        lines = text.splitlines()
        candidates: List[tuple[int, str]] = []

        for index, raw_line in enumerate(lines):
            line = raw_line.strip()
            if not line:
                continue

            heading = self._match_heading(line)
            if heading:
                title = heading
                candidates.append((index, title))

        # If no headings detected, consider whole document as single chapter
        if not candidates:
            combined = text.strip()
            if not combined:
                return []
            return [ParsedChapter(title="章节一", content=combined)]

        chapters: List[ParsedChapter] = []
        total_lines = len(lines)

        for idx, (line_index, title) in enumerate(candidates):
            start = line_index + 1  # content starts after heading line
            end = candidates[idx + 1][0] if idx + 1 < len(candidates) else total_lines
            content = "\n".join(lines[start:end]).strip()

            # If content empty, still keep heading but placeholder
            if not content:
                content = ""

            chapters.append(ParsedChapter(title=title.strip(), content=content))

        return chapters

    def _match_heading(self, line: str) -> str | None:
        """Match a heading pattern and normalize title."""
        for pattern in self._compiled_patterns:
            match = pattern.match(line)
            if not match:
                continue

            groups = [g for g in match.groups() if g]

            # For markdown headings (# Title) pattern, groups may include hash prefix
            if match.re.pattern.startswith("^(#{1,3})"):
                # Use the captured title portion (groups[1])
                if len(groups) >= 2:
                    return groups[1]
                continue

            # For other patterns, reassemble groups
            if len(groups) >= 2:
                prefix, rest = groups[0], groups[1]
                return f"{prefix}{rest}".strip()
            if len(groups) == 1:
                return groups[0].strip()

        return None

