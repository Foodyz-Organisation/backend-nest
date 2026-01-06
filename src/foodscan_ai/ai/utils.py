import re

def clean_text(text: str) -> str:
    """
    Cleans and formats text output from LLM.

    Args:
        text (str): Raw text from LLM.

    Returns:
        str: Cleaned text.
    """
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def format_markdown(text: str) -> str:
    """
    Ensures text is properly formatted as markdown.

    Args:
        text (str): Text to format.

    Returns:
        str: Markdown formatted text.
    """
    # Basic formatting, can be expanded
    return text