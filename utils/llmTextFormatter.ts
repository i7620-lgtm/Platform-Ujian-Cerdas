/**
 * Utility for parsing and converting LLM/AI markdown formatting:
 * - Code blocks: ```lang ... ``` -> <pre><code class="font-mono">...</code></pre>
 * - Inline code: `...` -> <code>...</code>
 * - Headings: #, ##, ###, #### -> <h1>, <h2>, <h3>, <h4>
 * - Blockquotes: > ... -> <blockquote class="callout-indent-quote">...</blockquote>
 * - Bullet lists: - item, * item, • item -> <ul class="list-disc pl-5 my-2 space-y-1"><li>item</li></ul>
 * - Numbered lists: 1. item, 2. item -> <ol class="list-decimal pl-5 my-2 space-y-1"><li>item</li></ol>
 * - Bold-Italic: ***text*** -> <b><i>text</i></b>
 * - Bold: **text** -> <b>text</b>
 * - Strikethrough: ~~text~~ -> <s>text</s>
 * - Italic: *text* -> <i>text</i>
 * - Underline: _text_ -> <u>text</u>
 *
 * Rules:
 * - Preserves math KaTeX formulas ($...$, $$...$$, \(...\), \[...\], .math-visual, .katex, <math>)
 * - Preserves long underscores used for fill-in-the-blank questions (e.g. "_____", "___", "__")
 * - Preserves existing HTML tags, attributes, and SVG geometry
 * - Preserves URLs and links so underscores in paths are not altered
 */

export interface LlmFormatOptions {
  /** Convert newlines into <br/> if text does not already contain HTML block elements */
  convertNewlines?: boolean;
}

const escapeHtmlEntities = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Converts LLM markdown formatting to semantic HTML while protecting math, blanks, and code.
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

  // Helper for balanced <span>...</span> extraction (KaTeX/math-visual spans contain many nested spans)
  const extractBalancedSpans = (source: string, classRegex: RegExp, onMatch: (m: string) => string): string => {
    let result = "";
    let cursor = 0;
    const openRegex = /<span\b[^>]*>/gi;
    while (cursor < source.length) {
      openRegex.lastIndex = cursor;
      const openMatch = openRegex.exec(source);
      if (!openMatch) {
        result += source.slice(cursor);
        break;
      }
      const tagStr = openMatch[0];
      const classAttr = tagStr.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const classVal = classAttr ? (classAttr[1] ?? classAttr[2] ?? "") : "";
      if (!classRegex.test(classVal)) {
        result += source.slice(cursor, openMatch.index + tagStr.length);
        cursor = openMatch.index + tagStr.length;
        continue;
      }
      result += source.slice(cursor, openMatch.index);
      let depth = 1;
      let scanIdx = openMatch.index + tagStr.length;
      const spanTagRegex = /<\/?span\b[^>]*>/gi;
      spanTagRegex.lastIndex = scanIdx;
      let nextTag: RegExpExecArray | null;
      while (depth > 0 && (nextTag = spanTagRegex.exec(source)) !== null) {
        if (nextTag[0].startsWith("</")) {
          depth -= 1;
        } else if (!nextTag[0].endsWith("/>")) {
          depth += 1;
        }
        scanIdx = nextTag.index + nextTag[0].length;
      }
      const fullSpan = source.slice(openMatch.index, scanIdx);
      result += onMatch(fullSpan);
      cursor = scanIdx;
    }
    return result;
  };

  // Math visual spans & katex spans (balanced so nested KaTeX tags stay 100% protected)
  text = extractBalancedSpans(text, /\b(?:math-visual|katex)\b/i, pushMath);

  // MathML
  text = text.replace(/<math\b[^>]*>[\s\S]*?<\/math>/gi, pushMath);

  // Display math $$...$$ and \[...\]
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, pushMath);
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, pushMath);

  // Inline math $...$ and \(...\)
  text = text.replace(/\$([^$\n\r]+?)\$/g, pushMath);
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, pushMath);

  // 2. Protect Fenced Code Blocks (```lang ... ```)
  const codeBlockPlaceholders: string[] = [];
  text = text.replace(
    /```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g,
    (_match, lang, codeContent) => {
      const placeholder = `%%%LLM_CODE_BLOCK_${codeBlockPlaceholders.length}%%%`;
      const escapedCode = escapeHtmlEntities(codeContent.trimEnd());
      const langAttr = lang ? ` data-lang="${escapeHtmlEntities(lang)}"` : "";
      const htmlBlock = `<pre class="bg-slate-100 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 p-3 rounded-xl overflow-x-auto my-2.5 text-xs font-mono border border-slate-200 dark:border-slate-700/80 custom-scrollbar"${langAttr}><code class="font-mono">${escapedCode}</code></pre>`;
      codeBlockPlaceholders.push(htmlBlock);
      return placeholder;
    }
  );

  // 3. Protect Inline Code (`code`)
  const inlineCodePlaceholders: string[] = [];
  text = text.replace(
    /(?<!`)(`)([^`\r\n]+?)\1(?!`)/g,
    (_match, _delim, codeContent) => {
      const placeholder = `%%%LLM_INLINE_CODE_${inlineCodePlaceholders.length}%%%`;
      const escapedCode = escapeHtmlEntities(codeContent);
      const htmlInline = `<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 font-mono text-[0.9em] border border-slate-200 dark:border-slate-700">${escapedCode}</code>`;
      inlineCodePlaceholders.push(htmlInline);
      return placeholder;
    }
  );

  // 3b. Convert Bold & Bold-Italic with underscores before fill-in-the-blank protection
  text = text.replace(/___(?!\s)([^_\r\n]+?)(?<!\s)___/g, "<b><i>$1</i></b>");
  text = text.replace(/__(?!\s)([^_\r\n]+?)(?<!\s)__/g, "<b>$1</b>");

  // 4. Protect fill-in-the-blank long underscores (2 or more consecutive underscores like "__", "___", "_____")
  const blankFillPlaceholders: string[] = [];
  text = text.replace(/_{2,}/g, (match) => {
    const placeholder = `%%%LLM_BLANK_${blankFillPlaceholders.length}%%%`;
    blankFillPlaceholders.push(match);
    return placeholder;
  });

  // 5. Protect SVG Geometry elements & [GEOMETRY:...] tags
  const geometryPlaceholders: string[] = [];
  text = text.replace(
    /<span[^>]*class="[^"]*geometry-shape[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    (match) => {
      const placeholder = `%%%LLM_GEO_${geometryPlaceholders.length}%%%`;
      geometryPlaceholders.push(match);
      return placeholder;
    }
  );
  text = text.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, (match) => {
    const placeholder = `%%%LLM_GEO_${geometryPlaceholders.length}%%%`;
    geometryPlaceholders.push(match);
    return placeholder;
  });
  text = text.replace(/\[GEOMETRY:[^\]]+\]/gi, (match) => {
    const placeholder = `%%%LLM_GEO_${geometryPlaceholders.length}%%%`;
    geometryPlaceholders.push(match);
    return placeholder;
  });

  // 6. Protect URLs so underscores or dashes in query/paths are untouched
  const urlPlaceholders: string[] = [];
  text = text.replace(/https?:\/\/[^\s<>"']+/gi, (match) => {
    const placeholder = `%%%LLM_URL_${urlPlaceholders.length}%%%`;
    urlPlaceholders.push(match);
    return placeholder;
  });

  // 7. Protect existing HTML tags (<...>) so attributes with underscores/asterisks are untouched
  const htmlTagPlaceholders: string[] = [];
  text = text.replace(/<[^>]+>/g, (match) => {
    const placeholder = `%%%LLM_HTML_TAG_${htmlTagPlaceholders.length}%%%`;
    htmlTagPlaceholders.push(match);
    return placeholder;
  });

  // 8. Convert Block Structures: Headings, Blockquotes, Lists
  // 8a. Headings (#, ##, ###, ####)
  text = text.replace(/(?:^|\n)\s*####\s+([^\n\r]+)/g, "\n<h4 class=\"text-xs font-bold my-1 text-inherit\">$1</h4>");
  text = text.replace(/(?:^|\n)\s*###\s+([^\n\r]+)/g, "\n<h3 class=\"text-sm font-bold my-1.5 text-inherit\">$1</h3>");
  text = text.replace(/(?:^|\n)\s*##\s+([^\n\r]+)/g, "\n<h2 class=\"text-base font-bold my-2 text-inherit\">$1</h2>");
  text = text.replace(/(?:^|\n)\s*#\s+([^\n\r]+)/g, "\n<h1 class=\"text-lg font-black my-2.5 text-inherit\">$1</h1>");

  // 8b. Blockquotes (> ...)
  text = text.replace(/(?:^|\n)\s*>\s+([^\n\r]+)/g, "\n<blockquote class=\"callout-indent-quote\">$1</blockquote>");

  // 8c. Bullet Lists (- ..., * ..., • ...)
  // Note: * must be followed by whitespace (\s+) so *italic* is NEVER matched here
  const bulletBlockRegex = /(?:^|\n)((?:[ \t]*[-*•]\s+[^\n\r]+(?:\n|$))+)/gi;
  text = text.replace(bulletBlockRegex, (match, block) => {
    const rawLines = block.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    const validItems = rawLines
      .filter((l: string) => /^[-*•]\s+/.test(l))
      .map((l: string) => l.replace(/^[-*•]\s+/, "").trim());
    if (validItems.length === 0) return match;
    const prefix = match.startsWith("\n") ? "\n" : "";
    return `${prefix}<ul class="list-disc pl-5 my-2 space-y-1">${validItems.map((it: string) => `<li>${it}</li>`).join("")}</ul>\n`;
  });

  // 8d. Numbered Lists (1. ..., 2. ...)
  // Require at least 2 items to prevent standalone question prefix "1. Soal..." from being wrapped
  const numberedBlockRegex = /(?:^|\n)((?:[ \t]*\d+[.)]\s+[^\n\r]+(?:\n|$))+)/gi;
  text = text.replace(numberedBlockRegex, (match, block) => {
    const rawLines = block.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    const validItems = rawLines
      .filter((l: string) => /^\d+[.)]\s+/.test(l))
      .map((l: string) => l.replace(/^\d+[.)]\s+/, "").trim());
    if (validItems.length < 2) return match;
    const prefix = match.startsWith("\n") ? "\n" : "";
    return `${prefix}<ol class="list-decimal pl-5 my-2 space-y-1">${validItems.map((it: string) => `<li>${it}</li>`).join("")}</ol>\n`;
  });

  // 9. Convert Inline Markdown Delimiters
  // 9a. Bold-Italic: ***text***
  text = text.replace(/\*\*\*([^*\r\n]+?)\*\*\*/g, "<b><i>$1</i></b>");

  // 9b. Bold: **text**
  text = text.replace(/\*\*([^*\r\n]+?)\*\*/g, "<b>$1</b>");

  // 9c. Strikethrough: ~~text~~
  text = text.replace(/~~([^~\r\n]+?)~~/g, "<s>$1</s>");

  // 9d. Italic: *text* (prevent matching lone asterisks or inside formulas/multiplication)
  // Ensure boundaries: start of string/whitespace/punctuation/placeholder on left, and end/whitespace/punctuation/placeholder on right
  text = text.replace(
    /(^|[\s(>[\],;:.!?"'«“‘\-/]|%%%[A-Z0-9_]+%%%)\*(?!\s)([^*\r\n]+?)(?<!\s)\*(?=$|[\s)<[\],;:.!?"'»”’\-/]|%%%[A-Z0-9_]+%%%)/g,
    "$1<i>$2</i>"
  );

  // 9e. Underline: _text_ (strictly single underscore delimiter)
  // Ensure boundaries: start of string/whitespace/punctuation/placeholder on left, and end/whitespace/punctuation/placeholder on right
  text = text.replace(
    /(^|[\s(>[\],;:.!?"'«“‘\-/]|%%%[A-Z0-9_]+%%%)(?<!_)_(?!\s)([^_\r\n]+?)(?<!\s)_(?!_)(?=$|[\s)<[\],;:.!?"'»”’\-/]|%%%[A-Z0-9_]+%%%)/g,
    "$1<u>$2</u>"
  );

  // 10. Handle newlines if plain text without HTML block elements
  const shouldConvertNewlines =
    options.convertNewlines ??
    (!text.includes("<p>") && !text.includes("<div>") && !text.includes("<ul>") && !text.includes("<ol>"));
  if (shouldConvertNewlines) {
    // Strip newlines directly adjacent to block containers so we don't inject superfluous <br/>
    text = text.replace(/(<\/?(?:ul|ol|li|h[1-6]|blockquote|pre|table|thead|tbody|tr|th|td)[^>]*>)[ \t]*\r?\n/gi, "$1");
    text = text.replace(/\r?\n[ \t]*(<\/?(?:ul|ol|li|h[1-6]|blockquote|pre|table|thead|tbody|tr|th|td)[^>]*>)/gi, "$1");
    text = text.replace(/\r\n|\r|\n/g, "<br/>");
  }

  // 11. Restore Placeholders in reverse order of extraction
  // 11a. Restore HTML tags
  for (let i = 0; i < htmlTagPlaceholders.length; i++) {
    text = text.replace(`%%%LLM_HTML_TAG_${i}%%%`, () => htmlTagPlaceholders[i]);
  }

  // 11b. Restore URLs
  for (let i = 0; i < urlPlaceholders.length; i++) {
    text = text.replace(`%%%LLM_URL_${i}%%%`, () => urlPlaceholders[i]);
  }

  // 11c. Restore SVG Geometry
  for (let i = 0; i < geometryPlaceholders.length; i++) {
    text = text.replace(`%%%LLM_GEO_${i}%%%`, () => geometryPlaceholders[i]);
  }

  // 11d. Restore Blank Fills (_____)
  for (let i = 0; i < blankFillPlaceholders.length; i++) {
    text = text.replace(`%%%LLM_BLANK_${i}%%%`, () => blankFillPlaceholders[i]);
  }

  // 11e. Restore Inline Code
  for (let i = 0; i < inlineCodePlaceholders.length; i++) {
    text = text.replace(`%%%LLM_INLINE_CODE_${i}%%%`, () => inlineCodePlaceholders[i]);
  }

  // 11f. Restore Fenced Code Blocks
  for (let i = 0; i < codeBlockPlaceholders.length; i++) {
    text = text.replace(`%%%LLM_CODE_BLOCK_${i}%%%`, () => codeBlockPlaceholders[i]);
  }

  // 11g. Restore Math KaTeX expressions
  for (let i = 0; i < mathPlaceholders.length; i++) {
    text = text.replace(`%%%LLM_MATH_${i}%%%`, () => mathPlaceholders[i]);
  }

  return text;
};
