/**
 * Utility for parsing and converting LLM markdown formatting:
 * - **bold** -> <strong>bold</strong>
 * - *italic* -> <em>italic</em>
 * - _underline_ -> <u>underline</u>
 *
 * Rules:
 * - Preserves math KaTeX formulas ($...$, $$...$$, \(...\), \[...\])
 * - Preserves long underscores used for fill-in-the-blank questions (e.g. "_____", "___")
 * - Preserves existing HTML tags, attributes, and SVG geometry
 */

export interface LlmFormatOptions {
  /** Convert newlines into <br/> if text does not already contain HTML block elements */
  convertNewlines?: boolean;
}

/**
 * Converts LLM markdown formatting (**bold**, *italic*, _underline_) to semantic HTML.
 */
export const convertLlmFormattingToHtml = (
  input: string,
  options: LlmFormatOptions = {}
): string => {
  if (!input || typeof input !== "string") return "";

  let text = input;

  // 1. Protect existing Math elements (rendered spans & raw LaTeX delimiters)
  const mathPlaceholders: string[] = [];
  const pushMath = (match: string) => {
    const placeholder = `%%%LLM_MATH_${mathPlaceholders.length}%%%`;
    mathPlaceholders.push(match);
    return placeholder;
  };

  // Math visual spans & katex spans
  text = text.replace(
    /<span[^>]*class="[^"]*(?:math-visual|katex)[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    pushMath
  );

  // Display math $$...$$ and \[...\]
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, pushMath);
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, pushMath);

  // Inline math $...$ and \(...\)
  text = text.replace(/\$([^$\n\r]+?)\$/g, pushMath);
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, pushMath);

  // 2. Protect fill-in-the-blank long underscores (2 or more consecutive underscores like "__", "___", "_____")
  const blankFillPlaceholders: string[] = [];
  text = text.replace(/_{2,}/g, (match) => {
    const placeholder = `%%%LLM_BLANK_${blankFillPlaceholders.length}%%%`;
    blankFillPlaceholders.push(match);
    return placeholder;
  });

  // 3. Protect existing HTML tags (<...>) so attributes with underscores/asterisks are untouched
  const htmlTagPlaceholders: string[] = [];
  text = text.replace(/<[^>]+>/g, (match) => {
    const placeholder = `%%%LLM_HTML_TAG_${htmlTagPlaceholders.length}%%%`;
    htmlTagPlaceholders.push(match);
    return placeholder;
  });

  // 4. Convert Markdown delimiters
  // 4a. Bold-Italic: ***text***
  text = text.replace(
    /\*\*\*([^*\r\n]+?)\*\*\*/g,
    "<b><i>$1</i></b>"
  );

  // 4b. Bold: **text**
  text = text.replace(
    /\*\*([^*\r\n]+?)\*\*/g,
    "<b>$1</b>"
  );

  // 4c. Italic: *text* (prevent matching lone asterisks or inside formulas)
  // Ensure boundaries: start of string/whitespace/punctuation/placeholder on left, and end/whitespace/punctuation/placeholder on right
  text = text.replace(
    /(^|[\s(>[\],;:.!?"'«“‘]|%%%[A-Z0-9_]+%%%)\*(?!\s)([^*\r\n]+?)(?<!\s)\*(?=$|[\s)<[\],;:.!?"'»”’]|%%%[A-Z0-9_]+%%%)/g,
    "$1<i>$2</i>"
  );

  // 4d. Underline: _text_ (strictly single underscore delimiter)
  // Ensure boundaries: start of string/whitespace/punctuation/placeholder on left, and end/whitespace/punctuation/placeholder on right
  text = text.replace(
    /(^|[\s(>[\],;:.!?"'«“‘]|%%%[A-Z0-9_]+%%%)(?<!_)_(?!\s)([^_\r\n]+?)(?<!\s)_(?!_)(?=$|[\s)<[\],;:.!?"'»”’]|%%%[A-Z0-9_]+%%%)/g,
    "$1<u>$2</u>"
  );

  // 5. Optionally handle newlines if plain text without HTML paragraph tags
  if (options.convertNewlines && !text.includes("<p>") && !text.includes("<div>")) {
    text = text.replace(/\r\n|\r|\n/g, "<br/>");
  }

  // 6. Restore HTML tags (using function replacer to avoid $ substitution bugs)
  for (let i = 0; i < htmlTagPlaceholders.length; i++) {
    text = text.replace(`%%%LLM_HTML_TAG_${i}%%%`, () => htmlTagPlaceholders[i]);
  }

  // 7. Restore Blank Fills (_____)
  for (let i = 0; i < blankFillPlaceholders.length; i++) {
    text = text.replace(`%%%LLM_BLANK_${i}%%%`, () => blankFillPlaceholders[i]);
  }

  // 8. Restore Math KaTeX expressions
  for (let i = 0; i < mathPlaceholders.length; i++) {
    text = text.replace(`%%%LLM_MATH_${i}%%%`, () => mathPlaceholders[i]);
  }

  return text;
};
