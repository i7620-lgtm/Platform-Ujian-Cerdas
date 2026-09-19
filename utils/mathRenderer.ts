import katex from "katex";
import "katex/dist/katex.min.css";

// Expose on window for any legacy or template consumers
if (typeof window !== "undefined") {
  (window as any).katex = katex;
}

/**
 * Normalizes and cleans LaTeX expressions to ensure high render compatibility with KaTeX.
 */
export const normalizeLatex = (latex: string): string => {
  if (!latex) return "";
  let clean = latex.trim();

  // Strip wrapping delimiters if passed accidentally
  if (clean.startsWith("$$") && clean.endsWith("$$") && clean.length >= 4) {
    clean = clean.slice(2, -2).trim();
  } else if (clean.startsWith("$") && clean.endsWith("$") && clean.length >= 2) {
    clean = clean.slice(1, -1).trim();
  } else if (clean.startsWith("\\[") && clean.endsWith("\\]") && clean.length >= 4) {
    clean = clean.slice(2, -2).trim();
  } else if (clean.startsWith("\\(") && clean.endsWith("\\)") && clean.length >= 4) {
    clean = clean.slice(2, -2).trim();
  }

  // Normalize multiple backslashes (common from JSON escaping)
  clean = clean.replace(/\\\\([a-zA-Z]+)/g, "\\$1");

  // Fix Unicode degree symbol
  clean = clean.replace(/°/g, "^{\\circ}");

  // Fix common unit formatting issues like \text{ cm}^3 or \text{cm}^3
  clean = clean.replace(/\\text\{\s*cm\s*\}\^([23])/g, "\\text{ cm}^$1");
  clean = clean.replace(/\\text\{\s*m\s*\}\^([23])/g, "\\text{ m}^$1");
  clean = clean.replace(/\\text\{\s*dm\s*\}\^([23])/g, "\\text{ dm}^$1");
  clean = clean.replace(/\\text\{\s*mm\s*\}\^([23])/g, "\\text{ mm}^$1");

  return clean;
};

/**
 * Renders a LaTeX string into KaTeX HTML with safe fallback.
 */
export const renderLatexToString = (
  rawLatex: string,
  displayMode = false,
): string => {
  if (!rawLatex) return "";
  const cleanLatex = normalizeLatex(rawLatex);

  try {
    const k = (typeof window !== "undefined" && (window as any).katex) || katex;
    if (k && typeof k.renderToString === "function") {
      return k.renderToString(cleanLatex, {
        throwOnError: false,
        displayMode,
        output: "html",
        strict: false,
        trust: true,
      });
    }
  } catch (err) {
    console.warn("KaTeX rendering warning for:", cleanLatex, err);
  }

  // Graceful HTML fallback for simple units/exponents if KaTeX is unavailable
  const fallbackHtml = cleanLatex
    .replace(/\\text\{\s*([^}]+)\s*\}/g, "$1")
    .replace(/\\mathrm\{\s*([^}]+)\s*\}/g, "$1")
    .replace(/\^([0-9]+|\{[0-9]+\})/g, (_, exp) => `<sup>${exp.replace(/[{}]/g, "")}</sup>`)
    .replace(/_([0-9]+|\{[0-9]+\})/g, (_, sub) => `<sub>${sub.replace(/[{}]/g, "")}</sub>`)
    .replace(/\\times/g, " × ")
    .replace(/\\div/g, " ÷ ")
    .replace(/\\pm/g, " ± ")
    .replace(/\\le/g, " ≤ ")
    .replace(/\\ge/g, " ≥ ")
    .replace(/\\neq/g, " ≠ ")
    .replace(/\\approx/g, " ≈ ");

  return `<span class="math-fallback font-mono">${fallbackHtml}</span>`;
};

/**
 * Helper to convert math delimiters and naked math patterns within plain text into math-visual spans.
 */
const convertTextToMathSpans = (text: string): string => {
  if (!text) return "";
  let result = text;

  // 1. Process Block Math: $$...$$ or \[...\]
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => {
    const clean = normalizeLatex(latex);
    const rendered = renderLatexToString(clean, true);
    return `&#8203;<span class="math-visual" style="display: block; text-align: center; margin: 0.5rem 0;" contenteditable="false" data-latex="${clean.replace(/"/g, "&quot;")}">${rendered}</span>&#8203;`;
  });

  result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, latex) => {
    const clean = normalizeLatex(latex);
    const rendered = renderLatexToString(clean, true);
    return `&#8203;<span class="math-visual" style="display: block; text-align: center; margin: 0.5rem 0;" contenteditable="false" data-latex="${clean.replace(/"/g, "&quot;")}">${rendered}</span>&#8203;`;
  });

  // 2. Process Inline Math: $...$ or \(...\)
  result = result.replace(/\$([^$\n]+?)\$/g, (_, latex) => {
    const clean = normalizeLatex(latex);
    const rendered = renderLatexToString(clean, false);
    return `&#8203;<span class="math-visual" style="display: inline-block; vertical-align: middle;" contenteditable="false" data-latex="${clean.replace(/"/g, "&quot;")}">${rendered}</span>&#8203;`;
  });

  result = result.replace(/\\\(([\s\S]+?)\\\)/g, (_, latex) => {
    const clean = normalizeLatex(latex);
    const rendered = renderLatexToString(clean, false);
    return `&#8203;<span class="math-visual" style="display: inline-block; vertical-align: middle;" contenteditable="false" data-latex="${clean.replace(/"/g, "&quot;")}">${rendered}</span>&#8203;`;
  });

  // 3. Process un-delimited LaTeX fractions, roots, or units
  result = result.replace(
    /(?:^|\s)((\d+[\d.,]*\s*)?\\(?:text|mathrm)\{[^}]+\}\^[0-9]+|\\frac\{[^}]+\}\{[^}]+\}|\\sqrt(?:\[[^\]]+\])?\{[^}]+\})(?:$|\s)/g,
    (fullMatch, latexSnippet) => {
      const clean = normalizeLatex(latexSnippet);
      const rendered = renderLatexToString(clean, false);
      const prefix = fullMatch.startsWith(" ") ? " " : "";
      const suffix = fullMatch.endsWith(" ") ? " " : "";
      return `${prefix}&#8203;<span class="math-visual" style="display: inline-block; vertical-align: middle;" contenteditable="false" data-latex="${clean.replace(/"/g, "&quot;")}">${rendered}</span>&#8203;${suffix}`;
    },
  );

  return result;
};

/**
 * Converts markdown/LaTeX delimiters ($...$, $$...$$, \(...\), \[...\])
 * inside an HTML string into properly rendered .math-visual spans.
 * Uses DOMParser and TreeWalker in browser environments to avoid touching existing HTML nodes.
 */
export const renderMathInHtml = (html: string): string => {
  if (!html) return "";

  // Quick check: if no math signs, return as-is
  if (
    !html.includes("$") &&
    !html.includes("\\(") &&
    !html.includes("\\[") &&
    !html.includes("\\frac") &&
    !html.includes("\\sqrt") &&
    !html.includes("\\text{") &&
    !html.includes("math-visual")
  ) {
    return html;
  }

  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<body>${html}</body>`, "text/html");

      // 1. First ensure any existing .math-visual elements have their KaTeX markup hydrated
      doc.querySelectorAll(".math-visual[data-latex]").forEach((el) => {
        if (!el.querySelector(".katex") || el.innerHTML.trim() === "") {
          const latex = el.getAttribute("data-latex") || "";
          const isBlock = (el as HTMLElement).style.display === "block";
          el.innerHTML = renderLatexToString(latex, isBlock);
        }
      });

      // 2. Find all text nodes that are not inside .math-visual, svg, script, style, code, pre
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          let parent = node.parentElement;
          while (parent && parent !== doc.body) {
            const tag = parent.tagName.toLowerCase();
            if (
              tag === "script" ||
              tag === "style" ||
              tag === "code" ||
              tag === "pre" ||
              tag === "svg" ||
              tag === "math" ||
              parent.classList.contains("math-visual") ||
              parent.classList.contains("katex") ||
              parent.classList.contains("geometry-shape")
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const textNodes: Text[] = [];
      let currentNode = walker.nextNode();
      while (currentNode) {
        textNodes.push(currentNode as Text);
        currentNode = walker.nextNode();
      }

      // 3. Convert any math delimiters in eligible text nodes
      for (const node of textNodes) {
        const text = node.nodeValue || "";
        const hasMath =
          /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\b\\frac\{[^}]+\}\{[^}]+\}|\b\\sqrt(?:\[[^\]]+\])?\{[^}]+\}/.test(
            text,
          );
        if (hasMath) {
          const tempSpan = doc.createElement("span");
          tempSpan.innerHTML = convertTextToMathSpans(text);
          node.parentNode?.replaceChild(tempSpan, node);
          while (tempSpan.firstChild) {
            tempSpan.parentNode?.insertBefore(tempSpan.firstChild, tempSpan);
          }
          tempSpan.parentNode?.removeChild(tempSpan);
        }
      }

      return doc.body.innerHTML;
    } catch (e) {
      console.warn("DOMParser math render fallback:", e);
    }
  }

  return convertTextToMathSpans(html);
};

/**
 * Hydrates all unrendered .math-visual elements and raw LaTeX nodes in a container.
 */
export const hydrateMathInContainer = (container: Element | Document = document) => {
  if (typeof window === "undefined" || !container) return;

  // 1. Hydrate all .math-visual[data-latex] where KaTeX HTML is not yet present
  const mathVisuals = container.querySelectorAll(".math-visual[data-latex]");
  mathVisuals.forEach((el) => {
    const latex = el.getAttribute("data-latex");
    if (latex && (!el.querySelector(".katex") || el.innerHTML.trim() === "")) {
      const displayMode = (el as HTMLElement).style.display === "block";
      el.innerHTML = renderLatexToString(latex, displayMode);
    }
  });

  // 2. Scan options and question content for unrendered math delimiters
  const textContainers = container.querySelectorAll(
    ".option-content, .student-question-text, .wysiwyg-content, .prose",
  );
  textContainers.forEach((tc) => {
    if (tc.innerHTML.includes("$") || tc.innerHTML.includes("\\(") || tc.innerHTML.includes("\\[")) {
      // If it contains raw dollar or latex delimiters outside of .math-visual, re-render
      const hasUnrenderedMath = /(?:\$[^$\n]+\$|\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)|\\[[\s\S]+?\\])/.test(
        tc.innerHTML,
      );
      if (hasUnrenderedMath) {
        tc.innerHTML = renderMathInHtml(tc.innerHTML);
      }
    }
  });
};
