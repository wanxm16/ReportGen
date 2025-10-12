"""Prompt generator service for creating templates from examples"""

from pathlib import Path
from .data_processor import DataProcessor
from .llm_service import LLMService
from .example_manager import ExampleManager


class PromptGenerator:
    """Generate prompt templates by analyzing example documents"""

    def __init__(self):
        self.data_processor = DataProcessor()
        self.llm_service = LLMService()
        self.example_manager = ExampleManager()

    def generate_from_examples(
        self,
        example_file_ids: list[str],
        chapter_type: str
    ) -> dict:
        """Generate prompt template from multiple example documents

        Args:
            example_file_ids: List of example file IDs to analyze
            chapter_type: Chapter type (e.g., "chapter_1", "chapter_2")

        Returns:
            Dictionary containing:
            - system_prompt: Generated system prompt
            - user_prompt_template: Generated user prompt template
            - analyzed_examples: Number of examples analyzed
        """
        if not example_file_ids:
            raise ValueError("At least one example file is required")

        print(f"[PromptGenerator] Generating prompt for {chapter_type} from {len(example_file_ids)} example(s)")

        # Load and extract chapter contents from all examples
        chapter_contents = []

        for file_id in example_file_ids:
            try:
                # Get example file info
                example = self.example_manager.get_example_by_id(file_id)
                if not example:
                    print(f"[PromptGenerator] Warning: Example {file_id} not found, skipping")
                    continue

                # Construct file path
                file_path = Path("examples") / example["name"]
                if not file_path.exists():
                    print(f"[PromptGenerator] Warning: File not found at {file_path}, skipping")
                    continue

                # Read example file
                content = self.data_processor.read_example_file(str(file_path))

                # Extract specific chapter
                chapter_content = self.data_processor._extract_chapter_from_example(
                    content, chapter_type
                )

                if chapter_content:
                    chapter_contents.append(chapter_content)
                    print(f"[PromptGenerator] Extracted {len(chapter_content)} chars from {example['name']}")

            except Exception as e:
                print(f"[PromptGenerator] Error processing example {file_id}: {e}")
                continue

        if not chapter_contents:
            raise ValueError("Failed to extract any chapter content from the provided examples")

        print(f"[PromptGenerator] Successfully extracted content from {len(chapter_contents)} example(s)")

        # Analyze examples and generate prompt
        result = self.llm_service.analyze_examples_and_generate_prompt(
            chapter_contents=chapter_contents,
            chapter_type=chapter_type
        )

        # Add metadata
        result["analyzed_examples"] = len(chapter_contents)
        result["chapter_type"] = chapter_type

        return result

    def generate_from_all_examples(self, chapter_type: str) -> dict:
        """Generate prompt from all available example documents

        Args:
            chapter_type: Chapter type to generate prompt for

        Returns:
            Dictionary with generated prompt template
        """
        # Get all example file IDs
        examples = self.example_manager.list_examples()
        if not examples:
            raise ValueError("No example documents available")

        example_ids = [ex["id"] for ex in examples]
        print(f"[PromptGenerator] Using all {len(example_ids)} available examples")

        return self.generate_from_examples(
            example_file_ids=example_ids,
            chapter_type=chapter_type
        )
