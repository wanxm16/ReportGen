"""LLM service for calling DeepSeek API"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class LLMService:
    """Service for interacting with DeepSeek LLM"""

    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
        self.model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY not found in environment variables")

        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            timeout=60.0  # 60 seconds timeout
        )

    def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> str:
        """Generate response from LLM

        Args:
            system_prompt: System prompt setting the context
            user_prompt: User prompt with specific task
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response

        Returns:
            Generated text response
        """
        try:
            print(f"[LLM] Calling API with model: {self.model}")
            print(f"[LLM] System prompt length: {len(system_prompt)}")
            print(f"[LLM] User prompt length: {len(user_prompt)}")

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )

            print(f"[LLM] Response received, length: {len(response.choices[0].message.content)}")
            return response.choices[0].message.content

        except Exception as e:
            print(f"[LLM] Error: {type(e).__name__}: {str(e)}")
            raise RuntimeError(f"LLM API call failed: {str(e)}")

    def _fix_markdown_tables(self, content: str) -> str:
        """Fix malformed markdown tables and HTML tags

        Args:
            content: Original content with potentially malformed tables

        Returns:
            Content with fixed table formatting
        """
        import re

        # First, replace HTML line breaks with actual line breaks in table cells
        # Replace <br> tags with space (since they're meant to break lines within cells)
        content = re.sub(r'<br\s*/?>\s*', ' ', content, flags=re.IGNORECASE)

        # Remove other common HTML tags that might appear
        content = re.sub(r'</?[a-z]+[^>]*>', '', content, flags=re.IGNORECASE)

        lines = []
        for line in content.split('\n'):
            # Detect if this line contains a markdown table separator (|---|---|)
            # If found, split the line into separate table rows
            if '|' in line and ('---' in line or line.count('|') > 6):
                # This might be a compressed table
                # Split by the pattern: | text1 | text2 | ... | immediately followed by | text1 | text2 |
                # Look for |---|---| pattern which indicates table separator

                # Find all positions of table separator pattern
                separator_pattern = r'\|[\s-]+\|'

                if re.search(separator_pattern, line):
                    # This line contains table content, split it properly
                    # Strategy: find | followed by | and treat as row boundaries
                    # More specifically: find patterns like "| ... | | ... |"

                    # Simple approach: look for || which indicates end of one row and start of another
                    fixed_line = line.replace('||', '|\n|')

                    # Also handle cases where there's | | (with space)
                    fixed_line = re.sub(r'\|\s+\|', '|\n|', fixed_line)

                    lines.extend(fixed_line.split('\n'))
                else:
                    lines.append(line)
            else:
                lines.append(line)

        return '\n'.join(lines)

    def generate_report_chapter(
        self,
        system_prompt: str,
        user_prompt: str
    ) -> str:
        """Generate a report chapter with appropriate settings

        Args:
            system_prompt: System prompt
            user_prompt: User prompt with data

        Returns:
            Generated chapter content in markdown
        """
        # Use lower temperature for more consistent, factual output
        response = self.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.3,
            max_tokens=4000
        )

        # Fix markdown table formatting
        return self._fix_markdown_tables(response)
