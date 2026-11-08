/**
 * formattingCleaner.ts
 * 
 * Modul pembersih dan penstandar format tipografi soal (Single Responsibility Principle).
 * Bertugas mengubah simbol-simbol markdown (*, **, _, __) menjadi tag HTML baku (<b>, <i>, <u>)
 * dengan tetap melindungi rumus matematika KaTeX/LaTeX dan elemen visual SVG/HTML secara aman.
 */

/**
 * Mengonversi format markdown menjadi tag HTML baku (<b>, <i>, <u>)
 * dengan proteksi penuh terhadap sintaks matematika KaTeX ($...$, $$...$$) dan tag SVG/HTML.
 */
export function convertMarkdownToCompliantHtml(text: string | null | undefined): string {
  if (!text || typeof text !== "string") return "";

  let result = text;

  // 1. Lindungi blok rumus matematika (KaTeX/LaTeX) agar simbol perkalian (*), subskrip (_), dsb. tidak berubah
  const mathPlaceholders: string[] = [];
  
  // Blok $$...$$ dan \[...\]
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
    const idx = mathPlaceholders.length;
    mathPlaceholders.push(match);
    return `___MATH_BLOCK_HOLD_${idx}___`;
  });
  result = result.replace(/\\\[([\s\S]+?)\\\]/g, (match) => {
    const idx = mathPlaceholders.length;
    mathPlaceholders.push(match);
    return `___MATH_BLOCK_HOLD_${idx}___`;
  });

  // Inline $...$ dan \(...\)
  result = result.replace(/\$([^$\n]+?)\$/g, (match) => {
    const idx = mathPlaceholders.length;
    mathPlaceholders.push(match);
    return `___MATH_INLINE_HOLD_${idx}___`;
  });
  result = result.replace(/\\\(([\s\S]+?)\\\)/g, (match) => {
    const idx = mathPlaceholders.length;
    mathPlaceholders.push(match);
    return `___MATH_INLINE_HOLD_${idx}___`;
  });

  // 2. Lindungi elemen visual SVG dan tabel HTML agar atribut atau style tidak terganggu
  const tagPlaceholders: string[] = [];
  result = result.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
    const idx = tagPlaceholders.length;
    tagPlaceholders.push(match);
    return `___VISUAL_SVG_HOLD_${idx}___`;
  });
  result = result.replace(/<table[\s\S]*?<\/table>/gi, (match) => {
    const idx = tagPlaceholders.length;
    tagPlaceholders.push(match);
    return `___HTML_TABLE_HOLD_${idx}___`;
  });

  // 3. Normalisasi tag penekanan yang sudah ada: strong -> b, em -> i
  result = result.replace(/<\/?strong>/gi, (match) => (match.startsWith("</") ? "</b>" : "<b>"));
  result = result.replace(/<\/?em>/gi, (match) => (match.startsWith("</") ? "</i>" : "<i>"));

  // 4. Konversi kombinasi Tebal + Miring (***teks*** atau **_teks_** atau _**teks**_)
  result = result.replace(/\*\*\*([^*]+?)\*\*\*/g, "<b><i>$1</i></b>");
  result = result.replace(/\*\*_([^*_]+?)_\*\*/g, "<b><i>$1</i></b>");
  result = result.replace(/_\*\*([^*_]+?)\*\*_/g, "<b><i>$1</i></b>");

  // 5. Konversi Garis Bawah (Underline)
  // Menangani sintaks markdown underline ganda __teks__ atau tag <u>...</u>
  result = result.replace(/__([^_]+?)__/g, "<u>$1</u>");

  // 6. Konversi Huruf Tebal (Bold): **teks** -> <b>teks</b>
  result = result.replace(/\*\*([^*]+?)\*\*/g, "<b>$1</b>");

  // 7. Konversi Huruf Miring (Italic): *teks* -> <i>teks</i>
  // Pastikan tidak mengenai tanda bintang standalone atau bullet point di awal baris
  result = result.replace(/(^|[^*])\*([^*\s][^*]*?[^*\s]|\S)\*([^*]|$)/g, "$1<i>$2</i>$3");

  // 8. Konversi Huruf Miring garis bawah tunggal: _teks_ -> <i>teks</i>
  // Bounded by word boundary or whitespace so snake_case variables (e.g. var_name) aren't altered
  result = result.replace(/(^|[\s(])_([^_]+?)_([\s).,;:!?]|$)/g, "$1<i>$2</i>$3");

  // 9. Restorasi kembali elemen visual SVG dan tabel HTML
  tagPlaceholders.forEach((tag, idx) => {
    result = result.replace(`___VISUAL_SVG_HOLD_${idx}___`, tag);
    result = result.replace(`___HTML_TABLE_HOLD_${idx}___`, tag);
  });

  // 10. Restorasi kembali rumus matematika KaTeX
  mathPlaceholders.forEach((math, idx) => {
    result = result.replace(`___MATH_BLOCK_HOLD_${idx}___`, math);
    result = result.replace(`___MATH_INLINE_HOLD_${idx}___`, math);
  });

  return result;
}

/**
 * Membersihkan objek butir soal lengkap agar seluruh teks di dalamnya
 * mematuhi format HTML baku (<b>, <i>, <u>).
 */
export function sanitizeQuestionFormatting<T extends Record<string, any>>(question: T): T {
  if (!question || typeof question !== "object") return question;

  const sanitized = { ...question };

  // questionText
  if (typeof sanitized.questionText === "string") {
    sanitized.questionText = convertMarkdownToCompliantHtml(sanitized.questionText);
  }

  // options
  if (Array.isArray(sanitized.options)) {
    sanitized.options = sanitized.options.map((opt: any) =>
      typeof opt === "string" ? convertMarkdownToCompliantHtml(opt) : opt
    );
  }

  // explanation
  if (typeof sanitized.explanation === "string") {
    sanitized.explanation = convertMarkdownToCompliantHtml(sanitized.explanation);
  }

  // solutionSteps
  if (typeof sanitized.solutionSteps === "string") {
    sanitized.solutionSteps = convertMarkdownToCompliantHtml(sanitized.solutionSteps);
  }

  // hint
  if (typeof sanitized.hint === "string") {
    sanitized.hint = convertMarkdownToCompliantHtml(sanitized.hint);
  }

  // trueFalseRows
  if (Array.isArray(sanitized.trueFalseRows)) {
    sanitized.trueFalseRows = sanitized.trueFalseRows.map((row: any) => ({
      ...row,
      text: typeof row?.text === "string" ? convertMarkdownToCompliantHtml(row.text) : row?.text,
    }));
  }

  // matchingPairs
  if (Array.isArray(sanitized.matchingPairs)) {
    sanitized.matchingPairs = sanitized.matchingPairs.map((pair: any) => ({
      ...pair,
      left: typeof pair?.left === "string" ? convertMarkdownToCompliantHtml(pair.left) : pair?.left,
      right: typeof pair?.right === "string" ? convertMarkdownToCompliantHtml(pair.right) : pair?.right,
    }));
  }

  return sanitized;
}
