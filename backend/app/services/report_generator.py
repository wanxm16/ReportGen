"""Report generation service"""

from pathlib import Path
from .data_processor import DataProcessor
from .llm_service import LLMService
from .prompt_manager import PromptManager


class ReportGenerator:
    """Generate report chapters using LLM"""

    def __init__(self):
        self.data_processor = DataProcessor()
        self.llm_service = LLMService()

    def generate_chapter(
        self,
        chapter_type: str,
        data_file_path: str,
        example_file_paths: list[str] = None
    ) -> str:
        """Generate a specific chapter of the report

        Args:
            chapter_type: "chapter_1" or "chapter_2"
            data_file_path: Path to CSV data file
            example_file_paths: Optional list of paths to example documents

        Returns:
            Generated chapter content in markdown format
        """
        # Read and process data
        df = self.data_processor.read_csv(data_file_path)
        data_summary = self.data_processor.generate_data_summary(df)

        # Process example files if provided
        examples_context = ""
        if example_file_paths:
            examples_context = self.data_processor.combine_examples(example_file_paths, chapter_type)

        # Get default template for the chapter
        template = PromptManager.get_default_template(chapter_type)
        if not template:
            raise ValueError(f"No template found for chapter: {chapter_type}")

        # Build examples text
        examples_text = ""
        if examples_context:
            examples_text = f"\n\n# 参考示例\n\n{examples_context}"

        # Format user prompt with data and examples
        # Use a safer format method that allows unknown placeholders
        system_prompt = template["system_prompt"]
        user_prompt_template = template["user_prompt_template"]

        # Replace known placeholders
        user_prompt = user_prompt_template.replace("{data_summary}", data_summary)
        user_prompt = user_prompt.replace("{examples_text}", examples_text if examples_text else "")

        # Generate chapter using LLM
        chapter_content = self.llm_service.generate_report_chapter(
            system_prompt=system_prompt,
            user_prompt=user_prompt
        )

        return chapter_content

    def generate_chapter_with_text(
        self,
        chapter_type: str,
        data_text: str,
        example_file_ids: list[str] = None,
        template_id: str = None
    ) -> str:
        """Generate a specific chapter from text data

        Args:
            chapter_type: "chapter_1" or "chapter_2"
            data_text: Raw text data (CSV or Markdown)
            example_file_ids: Optional list of example file IDs
            template_id: Optional template ID to use (uses default if not provided)

        Returns:
            Generated chapter content in markdown format
        """
        # Process text data
        data_summary = self.data_processor.generate_data_summary_from_text(data_text)

        # Process example files if provided
        examples_context = ""
        if example_file_ids:
            # Construct example file paths
            from pathlib import Path
            example_file_paths = []
            EXAMPLES_DIR = "examples"

            for file_id in example_file_ids:
                for ext in ['.md', '.markdown', '.docx', '.doc']:
                    potential_path = Path(EXAMPLES_DIR) / f"{file_id}{ext}"
                    if potential_path.exists():
                        example_file_paths.append(str(potential_path))
                        break

            if example_file_paths:
                examples_context = self.data_processor.combine_examples(example_file_paths, chapter_type)

        # Get appropriate template for the chapter
        if template_id:
            print(f"[ReportGen] Using custom template: {template_id}")
            template = PromptManager.get_template_by_id(template_id)
            if not template:
                raise ValueError(f"Template not found: {template_id}")
            print(f"[ReportGen] Template name: {template['name']}")
        else:
            print(f"[ReportGen] Using default template for chapter: {chapter_type}")
            template = PromptManager.get_default_template(chapter_type)
            if not template:
                raise ValueError(f"No template found for chapter: {chapter_type}")
            print(f"[ReportGen] Template name: {template['name']}")

        # Build examples text
        examples_text = ""
        if examples_context:
            examples_text = f"\n\n# 参考示例\n\n{examples_context}"

        print(f"[ReportGen] Examples context length: {len(examples_context) if examples_context else 0}")
        print(f"[ReportGen] Examples text length: {len(examples_text)}")
        print(f"[ReportGen] Examples text preview: {examples_text[:100] if examples_text else 'No examples'}")
        print(f"[ReportGen] Data summary length: {len(data_summary)}")

        # Format user prompt with data and examples
        # Use a safer format method that allows unknown placeholders
        system_prompt = template["system_prompt"]
        user_prompt_template = template["user_prompt_template"]

        # Replace known placeholders
        user_prompt = user_prompt_template.replace("{data_summary}", data_summary)
        user_prompt = user_prompt.replace("{examples_text}", examples_text if examples_text else "")

        print(f"[ReportGen] Final user prompt length: {len(user_prompt)}")
        print(f"[ReportGen] User prompt contains '参考示例': {'参考示例' in user_prompt}")

        # Generate chapter using LLM
        chapter_content = self.llm_service.generate_report_chapter(
            system_prompt=system_prompt,
            user_prompt=user_prompt
        )

        return chapter_content
