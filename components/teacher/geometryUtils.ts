export const extractNum = (val: any, defaultVal: number): number => {
  if (!val) return defaultVal;
  const match = String(val)
    .replace(",", ".")
    .match(/[\d.]+/);
  const num = match ? parseFloat(match[0]) : defaultVal;
  return isNaN(num) || num <= 0 ? defaultVal : num;
};

export const normalizeLabels = (raw: any = {}): any => {
  if (!raw || typeof raw !== "object") return {};
  const l: any = { ...raw };

  // Indonesian / English aliases normalization
  const widthVal = l.width ?? l.panjang ?? l.length ?? l.p ?? l.bottom_width ?? l.bottom ?? l.w;
  const heightVal = l.height ?? l.tinggi ?? l.t ?? l.h;
  const depthVal = l.depth ?? l.lebar ?? l.l ?? l.tebal ?? l.tebal_balok ?? l.bottom_depth ?? l.d;
  const radiusVal = l.radius ?? l.jariJari ?? l.jari_jari ?? l.r;
  const diameterVal = l.diameter ?? l.diam ?? l.d;
  const slantVal = l.slant ?? l.garisPelukis ?? l.garis_pelukis ?? l.apotema ?? l.s;
  const sideVal = l.side ?? l.sisi ?? l.rusuk ?? l.s;
  const baseVal = l.base ?? l.alas ?? l.a ?? l.bottom;
  const topVal = l.top ?? l.atas ?? l.b;
  const bottomVal = l.bottom ?? l.bawah ?? l.alas ?? l.a;
  const leftVal = l.left ?? l.kiri;
  const rightVal = l.right ?? l.kanan;
  const d1Val = l.d1 ?? l.diagonal1;
  const d2Val = l.d2 ?? l.diagonal2;

  // Composite shapes specific keys
  const bottomWidthVal = l.bottom_width ?? l.bottomWidth ?? l.width ?? l.panjang ?? l.length ?? l.p ?? l.side ?? l.sisi;
  const bottomDepthVal = l.bottom_depth ?? l.bottomDepth ?? l.depth ?? l.lebar ?? l.l ?? l.tebal ?? l.d;
  const bottomHeightVal = l.bottom_height ?? l.bottomHeight ?? l.tinggi_balok ?? l.height ?? l.tinggi ?? l.t;
  const topHeightVal = l.top_height ?? l.topHeight ?? l.roof_height ?? l.roofHeight ?? l.pyramid_height ?? l.tinggi_limas ?? l.tinggi_atap ?? l.coneHeight ?? l.tinggi_kerucut;
  const cylinderHeightVal = l.cylinderHeight ?? l.cylinder_height ?? l.tinggi_tabung ?? l.bottom_height ?? l.height ?? l.tinggi ?? l.h;
  const coneHeightVal = l.coneHeight ?? l.cone_height ?? l.tinggi_kerucut ?? l.top_height ?? l.height ?? l.tinggi ?? l.h;
  const roofHeightVal = l.roof_height ?? l.roofHeight ?? l.tinggi_atap ?? l.tinggi_prisma ?? l.top_height;

  if (widthVal !== undefined && l.width === undefined) l.width = widthVal;
  if (heightVal !== undefined && l.height === undefined) l.height = heightVal;
  if (depthVal !== undefined && l.depth === undefined) l.depth = depthVal;
  if (radiusVal !== undefined && l.radius === undefined) l.radius = radiusVal;
  if (diameterVal !== undefined && l.diameter === undefined) l.diameter = diameterVal;
  if (slantVal !== undefined && l.slant === undefined) l.slant = slantVal;
  if (sideVal !== undefined && l.side === undefined) l.side = sideVal;
  if (baseVal !== undefined && l.base === undefined) l.base = baseVal;
  if (topVal !== undefined && l.top === undefined) l.top = topVal;
  if (bottomVal !== undefined && l.bottom === undefined) l.bottom = bottomVal;
  if (leftVal !== undefined && l.left === undefined) l.left = leftVal;
  if (rightVal !== undefined && l.right === undefined) l.right = rightVal;
  if (d1Val !== undefined && l.d1 === undefined) l.d1 = d1Val;
  if (d2Val !== undefined && l.d2 === undefined) l.d2 = d2Val;

  if (bottomWidthVal !== undefined && l.bottom_width === undefined) l.bottom_width = bottomWidthVal;
  if (bottomDepthVal !== undefined && l.bottom_depth === undefined) l.bottom_depth = bottomDepthVal;
  if (bottomHeightVal !== undefined && l.bottom_height === undefined) l.bottom_height = bottomHeightVal;
  if (topHeightVal !== undefined && l.top_height === undefined) l.top_height = topHeightVal;
  if (cylinderHeightVal !== undefined && l.cylinderHeight === undefined) l.cylinderHeight = cylinderHeightVal;
  if (coneHeightVal !== undefined && l.coneHeight === undefined) l.coneHeight = coneHeightVal;
  if (roofHeightVal !== undefined && l.roof_height === undefined) l.roof_height = roofHeightVal;

  return l;
};

export const parseGeometryLabels = (raw: any): any => {
  if (!raw) return {};
  if (typeof raw === "object") return normalizeLabels(raw);
  const str = String(raw).trim();
  if (!str) return {};

  // 1. Try standard JSON parse
  try {
    return normalizeLabels(JSON.parse(str));
  } catch {}

  // 2. Try loose JSON / JS object (replace single quotes, quote unquoted keys)
  try {
    let s = str;
    if (!s.startsWith("{")) s = "{" + s;
    if (!s.endsWith("}")) s = s + "}";
    s = s.replace(/'/g, '"');
    s = s.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
    return normalizeLabels(JSON.parse(s));
  } catch {}

  // 3. Fallback: parse key-value pairs (e.g. width=10, height=5 or width:10, height:5)
  const result: any = {};
  const cleaned = str.replace(/^\{|\}$/g, "");
  const pairs = cleaned.split(/[,;\n]+/);
  for (const pair of pairs) {
    const parts = pair.split(/[:=]/);
    if (parts.length >= 2) {
      const key = parts[0].trim().replace(/^["']|["']$/g, "");
      const val = parts.slice(1).join(":").trim().replace(/^["']|["']$/g, "");
      if (key) result[key] = val;
    }
  }
  return normalizeLabels(result);
};

export const normalizeShapeName = (rawShape: string): string => {
  const s = String(rawShape || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  const shapeMap: Record<string, string> = {
    // 3D Shapes
    "balok": "cuboid",
    "block": "cuboid",
    "kotak": "cuboid",
    "box": "cuboid",
    "kubus": "cube",
    "tabung": "cylinder",
    "silinder": "cylinder",
    "kerucut": "cone",
    "bola": "sphere",
    "limas": "pyramid",
    "limas_segiempat": "pyramid",
    "limas_persegi": "pyramid",
    "prisma": "prism",
    "prisma_segitiga": "prism",

    // 2D Shapes
    "persegi": "square",
    "bujursangkar": "square",
    "bujur_sangkar": "square",
    "persegi_panjang": "rectangle",
    "persegipanjang": "rectangle",
    "segitiga": "triangle",
    "segitiga_siku": "triangle_right",
    "segitiga_siku_siku": "triangle_right",
    "segitiga_sama_kaki": "triangle",
    "segitiga_sama_sisi": "triangle",
    "trapesium": "trapezoid",
    "trapesium_sama_kaki": "trapezoid_isosceles",
    "trapesium_siku": "trapezoid_right",
    "trapesium_siku_siku": "trapezoid_right",
    "jajar_genjang": "parallelogram",
    "jajargenjang": "parallelogram",
    "belah_ketupat": "rhombus",
    "belahketupat": "rhombus",
    "layang_layang": "kite",
    "layanglayang": "kite",
    "lingkaran": "circle",
    "segi_banyak": "polygon",
    "segibanyak": "polygon",

    // Combined Shapes
    "gabungan_balok_limas": "combined_cuboid_pyramid",
    "gabungan_balok_kubus": "combined_cuboid_cube",
    "gabungan_tabung_kerucut": "combined_cylinder_cone",
    "gabungan_tabung_setengah_bola": "combined_cylinder_hemisphere",
    "gabungan_kerucut_setengah_bola": "combined_cone_hemisphere",
    "gabungan_persegi_segitiga": "combined_rect_triangle",
    "gabungan_persegi_setengah_lingkaran": "combined_rect_semicircle",
    "gabungan_l": "combined_l_shape",
    "l_shape": "combined_l_shape",
  };
  return shapeMap[s] || s;
};

export const generateGeometrySVG = (
  shape: string,
  labels: any = {},
  fillColor: string = "#f1f5f9",
  strokeColor: string = "#1e293b",
  showAngles: boolean = false,
  simulate: boolean = false,
  showLines: boolean = true,
) => {
  if (!labels) labels = {};
  labels = normalizeLabels(labels);
  shape = normalizeShapeName(shape);

  let vMinX = 0,
    vMinY = 0,
    vW = 220,
    vH = 220;

  // Render label directly as clean text without any container box, using subtle white halo stroke for contrast
  const drawLabel = (x: number, y: number, text: string | number | undefined, isAngle: boolean = false) => {
    if (text === undefined || text === null || String(text).trim() === "") return "";
    let str = String(text).trim();
    // Strip unnecessary prefix like "t = ", "p = ", "l = ", "t_limas = ", "t_atap = ", "s = " if present
    str = str.replace(/^[a-zA-Z0-9_]+\s*=\s*/, "").trim();
    const fontSize = isAngle ? 11 : 12;
    return `<text x="${Math.round(x)}" y="${Math.round(y)}" fill="${strokeColor}" font-size="${fontSize}" font-weight="700" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central" style="paint-order: stroke fill; stroke: #ffffff; stroke-width: 2.5px; stroke-linejoin: round;">${str}</text>`;
  };

  const formatDim = (_prefix: string, val: string | number | undefined) => {
    if (!val) return "";
    let s = String(val).trim();
    if (!s) return "";
    // Strip prefix like "p = ", "l = ", "t = ", etc.
    s = s.replace(/^[a-zA-Z0-9_]+\s*=\s*/, "").trim();
    return s;
  };

  // Render vertex dot with letter (e.g. A, B, C, D, T)
  const drawVertex = (x: number, y: number, letter?: string, pos: "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right" = "top-left") => {
    let out = `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="2.5" fill="${strokeColor}" />`;
    if (letter && String(letter).trim()) {
      let ox = 0, oy = 0;
      switch (pos) {
        case "top": oy = -10; break;
        case "bottom": oy = 11; break;
        case "left": ox = -10; break;
        case "right": ox = 10; break;
        case "top-left": ox = -9; oy = -9; break;
        case "top-right": ox = 9; oy = -9; break;
        case "bottom-left": ox = -9; oy = 9; break;
        case "bottom-right": ox = 9; oy = 9; break;
      }
      out += `<text x="${Math.round(x + ox)}" y="${Math.round(y + oy)}" fill="${strokeColor}" font-size="11" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">${letter}</text>`;
    }
    return out;
  };

  let svgBody = "";

  // --------------------------------------------------------------------------
  // 1. BANGUN DATAR (2D)
  // --------------------------------------------------------------------------
  if (shape === "triangle" || shape === "triangle_right") {
    const isRight = shape === "triangle_right" || Boolean(labels.isRight);
    let a = extractNum(labels.bottom || labels.base || labels.alas, 130);
    let b = extractNum(labels.left || labels.height || labels.tinggi, 100);
    let c = extractNum(labels.right || labels.hypotenuse || labels.miring, 100);

    if (!isRight && (a + b <= c || a + c <= b || b + c <= a)) {
      a = 130; b = 100; c = 100;
    }
    
    let ox = 40, oy = 175;
    let pBottomLeft = `${ox},${oy}`;
    let pBottomRight = `${ox + a},${oy}`;
    let pTop = "";
    
    if (isRight) {
      const sf = Math.min(130 / a, 130 / b);
      const w = a * sf;
      const h = b * sf;
      ox = 110 - w / 2;
      oy = 110 + h / 2;
      pBottomLeft = `${ox},${oy}`;
      pBottomRight = `${ox + w},${oy}`;
      pTop = `${ox},${oy - h}`;
      
      svgBody += `<polygon points="${pBottomLeft} ${pBottomRight} ${pTop}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round"/>`;
      // Right angle symbol
      svgBody += `<polyline points="${ox},${oy - 14} ${ox + 14},${oy - 14} ${ox + 14},${oy}" fill="none" stroke="${strokeColor}" stroke-width="1.5" />`;
      
      if (showLines) {
        if (labels.bottom) svgBody += drawLabel(ox + w / 2, oy + 16, labels.bottom);
        if (labels.left) svgBody += drawLabel(ox - 16, oy - h / 2, labels.left);
        if (labels.hypotenuse || labels.right) svgBody += drawLabel(ox + w / 2 + 14, oy - h / 2 - 10, labels.hypotenuse || labels.right);
      }
    } else {
      const cp = (a * a + b * b - c * c) / (2 * a);
      const hp = Math.sqrt(Math.max(0, b * b - cp * cp)) || 90;
      const sf = Math.min(140 / a, 130 / hp);
      const dw = a * sf, dh = hp * sf, dx = cp * sf;
      ox = 110 - dw / 2;
      oy = 110 + dh / 2;
      
      pBottomLeft = `${ox},${oy}`;
      pBottomRight = `${ox + dw},${oy}`;
      pTop = `${ox + dx},${oy - dh}`;
      
      svgBody += `<polygon points="${pBottomLeft} ${pBottomRight} ${pTop}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round"/>`;
      
      if (labels.height) {
        svgBody += `<line x1="${ox + dx}" y1="${oy - dh}" x2="${ox + dx}" y2="${oy}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
        svgBody += `<polyline points="${ox + dx},${oy - 10} ${ox + dx + 10},${oy - 10} ${ox + dx + 10},${oy}" fill="none" stroke="${strokeColor}" stroke-width="1.2" />`;
        svgBody += drawLabel(ox + dx + 16, oy - dh / 2, labels.height);
      }
      if (showLines) {
        if (labels.bottom) svgBody += drawLabel(ox + dw / 2, oy + 16, labels.bottom);
        if (labels.left) svgBody += drawLabel(ox + dx / 2 - 16, oy - dh / 2, labels.left);
        if (labels.right) svgBody += drawLabel(ox + (dw + dx) / 2 + 16, oy - dh / 2, labels.right);
      }
    }

    if (showAngles) {
      if (labels.angleA) svgBody += drawLabel(ox + 18, oy - 12, labels.angleA, true);
      if (labels.angleB) svgBody += drawLabel(ox + 90, oy - 12, labels.angleB, true);
    }
  } else if (shape === "square" || shape === "rectangle") {
    const isSquare = shape === "square";
    let w = extractNum(labels.width || labels.side, isSquare ? 115 : 125);
    let h = isSquare ? w : extractNum(labels.height, 80);
    const sf = Math.min(140 / w, 140 / h);
    w *= sf;
    h *= sf;
    const ox = 110 - w / 2, oy = 110 - h / 2;

    svgBody += `<rect x="${ox}" y="${oy}" width="${w}" height="${h}" rx="2" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    // Right angle mark at bottom-left
    svgBody += `<polyline points="${ox},${oy + h - 12} ${ox + 12},${oy + h - 12} ${ox + 12},${oy + h}" fill="none" stroke="${strokeColor}" stroke-width="1.2" />`;
    
    if (showLines) {
      if (labels.width || labels.side) svgBody += drawLabel(ox + w / 2, oy + h + 16, labels.width || labels.side);
      if (labels.height && !isSquare) svgBody += drawLabel(ox - 18, oy + h / 2, labels.height);
    }
  } else if (shape === "parallelogram") {
    let base = extractNum(labels.base || labels.width, 110);
    let height = extractNum(labels.height, 75);
    let offset = 35;
    const sf = Math.min(130 / (base + offset), 130 / height);
    base *= sf; height *= sf; offset *= sf;
    const ox = 110 - (base + offset) / 2, oy = 110 - height / 2;

    const pt0 = `${ox},${oy + height}`,
      pt1 = `${ox + base},${oy + height}`,
      pt2 = `${ox + base + offset},${oy}`,
      pt3 = `${ox + offset},${oy}`;

    svgBody += `<polygon points="${pt0} ${pt1} ${pt2} ${pt3}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round"/>`;
    if (labels.height) {
      svgBody += `<line x1="${ox + offset}" y1="${oy}" x2="${ox + offset}" y2="${oy + height}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
      svgBody += `<polyline points="${ox + offset},${oy + height - 10} ${ox + offset + 10},${oy + height - 10} ${ox + offset + 10},${oy + height}" fill="none" stroke="${strokeColor}" stroke-width="1.2"/>`;
      svgBody += drawLabel(ox + offset + 16, oy + height / 2, labels.height);
    }
    if (showLines) {
      if (labels.base || labels.bottom) svgBody += drawLabel(ox + base / 2, oy + height + 16, labels.base || labels.bottom);
      if (labels.side || labels.left) svgBody += drawLabel(ox + offset / 2 - 16, oy + height / 2, labels.side || labels.left);
    }
  } else if (shape === "trapezoid" || shape === "trapezoid_isosceles" || shape === "trapezoid_right") {
    const isRight = shape === "trapezoid_right";
    let a = extractNum(labels.bottom, 130);
    let b = extractNum(labels.top, 75);
    let h = extractNum(labels.height, 75);
    const sf = Math.min(140 / Math.max(a, b), 130 / h);
    a *= sf; b *= sf; h *= sf;
    const ox = 110 - a / 2, oy = 110 - h / 2;
    const dif = isRight ? 0 : (a - b) / 2;

    const pt0 = `${ox},${oy + h}`,
      pt1 = `${ox + a},${oy + h}`,
      pt2 = `${ox + a - (isRight ? a - b : dif)},${oy}`,
      pt3 = `${ox + dif},${oy}`;

    svgBody += `<polygon points="${pt0} ${pt1} ${pt2} ${pt3}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round"/>`;
    if (isRight) {
      svgBody += `<polyline points="${ox},${oy + h - 12} ${ox + 12},${oy + h - 12} ${ox + 12},${oy + h}" fill="none" stroke="${strokeColor}" stroke-width="1.2" />`;
      svgBody += `<polyline points="${ox},${oy + 12} ${ox + 12},${oy + 12} ${ox + 12},${oy}" fill="none" stroke="${strokeColor}" stroke-width="1.2" />`;
    } else if (labels.height) {
      svgBody += `<line x1="${ox + dif}" y1="${oy}" x2="${ox + dif}" y2="${oy + h}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
      svgBody += `<polyline points="${ox + dif},${oy + h - 10} ${ox + dif + 10},${oy + h - 10} ${ox + dif + 10},${oy + h}" fill="none" stroke="${strokeColor}" stroke-width="1.2"/>`;
      svgBody += drawLabel(ox + dif + 16, oy + h / 2, labels.height);
    }
    if (showLines) {
      if (labels.bottom) svgBody += drawLabel(ox + a / 2, oy + h + 16, labels.bottom);
      if (labels.top) svgBody += drawLabel(ox + dif + b / 2, oy - 14, labels.top);
      if (labels.left) svgBody += drawLabel(ox + dif / 2 - 16, oy + h / 2, labels.left);
      if (labels.right) svgBody += drawLabel(ox + a - dif / 2 + 16, oy + h / 2, labels.right);
    }
  } else if (shape === "rhombus" || shape === "kite") {
    let d1 = extractNum(labels.d1, 120);
    let d2 = extractNum(labels.d2, 90);
    let yOffset = shape === "kite" ? 25 : 0;
    const sf = Math.min(140 / d1, 140 / d2);
    d1 *= sf; d2 *= sf; yOffset *= sf;

    const pt0 = `110,${110 - d2 / 2}`;
    const pt1 = `${110 + d1 / 2},${110 + yOffset}`;
    const pt2 = `110,${110 + d2 / 2}`;
    const pt3 = `${110 - d1 / 2},${110 + yOffset}`;

    svgBody += `<polygon points="${pt0} ${pt1} ${pt2} ${pt3}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round"/>`;
    // Diagonals
    svgBody += `<line x1="${110 - d1 / 2}" y1="${110 + yOffset}" x2="${110 + d1 / 2}" y2="${110 + yOffset}" stroke="${strokeColor}" stroke-width="1.2" stroke-dasharray="3,3"/>`;
    svgBody += `<line x1="110" y1="${110 - d2 / 2}" x2="110" y2="${110 + d2 / 2}" stroke="${strokeColor}" stroke-width="1.2" stroke-dasharray="3,3"/>`;
    // Right angle mark at center intersection
    svgBody += `<polyline points="110,${110 + yOffset - 8} ${110 + 8},${110 + yOffset - 8} ${110 + 8},${110 + yOffset}" fill="none" stroke="${strokeColor}" stroke-width="1" />`;

    if (showLines) {
      if (labels.d1) svgBody += drawLabel(110 + d1 / 4, 110 + yOffset - 12, labels.d1);
      if (labels.d2) svgBody += drawLabel(110 + 16, 110 - d2 / 4, labels.d2);
      if (labels.side) svgBody += drawLabel(110 + d1 / 4 + 14, 110 - d2 / 4 - 8, labels.side);
    }
  } else if (shape === "circle") {
    let r = extractNum(labels.radius, 58);
    if (labels.diameter) r = extractNum(labels.diameter, r * 2) / 2;
    r = Math.min(Math.max(25, r), 70);

    svgBody += `<circle cx="110" cy="110" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<circle cx="110" cy="110" r="3" fill="${strokeColor}"/>`;
    if (showLines) {
      if (labels.diameter) {
        svgBody += `<line x1="${110 - r}" y1="110" x2="${110 + r}" y2="110" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
        svgBody += drawLabel(110, 110 - 14, labels.diameter);
      } else if (labels.radius) {
        svgBody += `<line x1="110" y1="110" x2="${110 + r}" y2="110" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
        svgBody += drawLabel(110 + r / 2, 110 - 12, labels.radius);
      }
    }
  } else if (shape === "polygon") {
    let n = parseInt(labels.nSides) || 6;
    n = Math.max(3, Math.min(12, n));
    const r = 62;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      pts.push(`${110 + r * Math.cos(angle)},${110 + r * Math.sin(angle)}`);
    }
    svgBody += `<polygon points="${pts.join(" ")}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round"/>`;
    if (showLines && labels.side) {
      svgBody += drawLabel(110, 110 + r + 16, labels.side);
    }
  }

  // --------------------------------------------------------------------------
  // 2. BANGUN RUANG (3D STANDAR DENGAN PROYEKSI PRESISI & SHADING REALISTIS)
  // --------------------------------------------------------------------------
  else if (shape === "cube" || shape === "cuboid") {
    const isCube = shape === "cube";
    let w = extractNum(labels.width || labels.side, isCube ? 75 : 95);
    let h = isCube ? w : extractNum(labels.height, 55);
    let d = isCube ? w * 0.5 : extractNum(labels.depth, 45);

    // Scaling factor with depth foreshortening so it fits comfortably in the 220x220 canvas
    const depthRatio = 0.52;
    const projDx = d * depthRatio * Math.cos(Math.PI / 6); // ~ d * 0.45
    const projDy = d * depthRatio * Math.sin(Math.PI / 6); // ~ d * 0.26

    const totalW = w + projDx;
    const totalH = h + projDy;
    const sf = Math.min(135 / totalW, 125 / totalH);

    w = Math.max(35, Math.min(145, w * sf));
    h = Math.max(25, Math.min(135, h * sf));
    d = Math.max(20, Math.min(80, d * sf));

    const dx = Math.round(d * 0.5);
    const dy = Math.round(d * 0.35);

    // Center coordinates inside 220x220 canvas
    const ox = Math.round(110 - (w + dx) / 2);
    const oy = Math.round(110 + (h - dy) / 2);

    // Vertices coordinates:
    // Front face (ABFE):
    const p1 = { x: ox, y: oy };            // Front bottom-left (A)
    const p2 = { x: ox + w, y: oy };        // Front bottom-right (B)
    const p3 = { x: ox + w, y: oy - h };    // Front top-right (F)
    const p4 = { x: ox, y: oy - h };        // Front top-left (E)
    // Back face (DCGH):
    const p5 = { x: ox + dx, y: oy - dy };        // Back bottom-left (D, internal hidden)
    const p6 = { x: ox + w + dx, y: oy - dy };    // Back bottom-right (C)
    const p7 = { x: ox + w + dx, y: oy - h - dy };// Back top-right (G)
    const p8 = { x: ox + dx, y: oy - h - dy };    // Back top-left (H)

    // Hidden back edges (garis putus-putus rusuk dalam: AD, CD, HD)
    svgBody += `<line x1="${p1.x}" y1="${p1.y}" x2="${p5.x}" y2="${p5.y}" stroke="${strokeColor}" stroke-width="1.6" stroke-dasharray="4,4" stroke-linecap="round"/>`;
    svgBody += `<line x1="${p5.x}" y1="${p5.y}" x2="${p6.x}" y2="${p6.y}" stroke="${strokeColor}" stroke-width="1.6" stroke-dasharray="4,4" stroke-linecap="round"/>`;
    svgBody += `<line x1="${p5.x}" y1="${p5.y}" x2="${p8.x}" y2="${p8.y}" stroke="${strokeColor}" stroke-width="1.6" stroke-dasharray="4,4" stroke-linecap="round"/>`;

    // 3D Faces (rendered with translucent fills so dashed lines remain visible!):
    // Top Face (EFGH) - illuminated
    svgBody += `<polygon points="${p4.x},${p4.y} ${p3.x},${p3.y} ${p7.x},${p7.y} ${p8.x},${p8.y}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" fill-opacity="0.55" stroke-linejoin="round"/>`;
    // Right Face (BCGF) - shaded side
    svgBody += `<polygon points="${p2.x},${p2.y} ${p6.x},${p6.y} ${p7.x},${p7.y} ${p3.x},${p3.y}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" fill-opacity="0.8" stroke-linejoin="round"/>`;
    // Front Face (ABFE)
    svgBody += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.2" fill-opacity="0.65" stroke-linejoin="round"/>`;

    // Optional Vertices (Titik Sudut: ABCD.EFGH)
    if (labels.vertices || labels.titik || labels.showVertices) {
      const vLetters = typeof labels.vertices === "string" 
        ? labels.vertices.replace(/[^A-Za-z]/g, "").split("")
        : Array.isArray(labels.vertices) ? labels.vertices : ["A","B","C","D","E","F","G","H"];
      if (vLetters.length >= 8) {
        svgBody += drawVertex(p1.x, p1.y, vLetters[0], "bottom-left");
        svgBody += drawVertex(p2.x, p2.y, vLetters[1], "bottom-right");
        svgBody += drawVertex(p6.x, p6.y, vLetters[2], "bottom-right");
        svgBody += drawVertex(p5.x, p5.y, vLetters[3], "top-left");
        svgBody += drawVertex(p4.x, p4.y, vLetters[4], "top-left");
        svgBody += drawVertex(p3.x, p3.y, vLetters[5], "top-right");
        svgBody += drawVertex(p7.x, p7.y, vLetters[6], "top-right");
        svgBody += drawVertex(p8.x, p8.y, vLetters[7], "top-left");
      }
    }

    // Dimensions labels
    if (showLines) {
      const wLabel = labels.width || labels.side;
      const hLabel = labels.height;
      const dLabel = labels.depth;

      if (wLabel) {
        svgBody += drawLabel(ox + w / 2, oy + 16, wLabel);
      }
      if (hLabel) {
        svgBody += drawLabel(ox - 18, oy - h / 2, hLabel);
      }
      if (dLabel) {
        svgBody += drawLabel(ox + w + dx / 2 + 16, oy - dy / 2 + 6, dLabel);
      }
    }
  } else if (shape === "cylinder") {
    let r = extractNum(labels.radius, 45);
    if (labels.diameter) r = extractNum(labels.diameter, r * 2) / 2;
    let h = extractNum(labels.height, 85);
    const sf = Math.min(130 / (r * 2), 120 / h);
    r = Math.max(25, Math.min(65, r * sf));
    h = Math.max(35, Math.min(130, h * sf));

    const rx = r, ry = r * 0.28;
    const cx = 110, cyBase = 110 + h / 2, cyTop = 110 - h / 2;

    // Body cylinder fill (between cyTop and cyBase):
    svgBody += `<path d="M ${cx - rx} ${cyTop} L ${cx + rx} ${cyTop} L ${cx + rx} ${cyBase} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cyBase} Z" fill="${fillColor}" fill-opacity="0.65"/>`;

    // Base back dashed, front solid
    svgBody += `<path d="M ${cx - rx} ${cyBase} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cyBase}" fill="none" stroke="${strokeColor}" stroke-width="1.6" stroke-dasharray="4,4"/>`;
    svgBody += `<path d="M ${cx - rx} ${cyBase} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cyBase}" fill="none" stroke="${strokeColor}" stroke-width="2.2"/>`;

    // Side edges
    svgBody += `<line x1="${cx - rx}" y1="${cyBase}" x2="${cx - rx}" y2="${cyTop}" stroke="${strokeColor}" stroke-width="2.2"/>`;
    svgBody += `<line x1="${cx + rx}" y1="${cyBase}" x2="${cx + rx}" y2="${cyTop}" stroke="${strokeColor}" stroke-width="2.2"/>`;

    // Top face ellipse (illuminated from above)
    svgBody += `<ellipse cx="${cx}" cy="${cyTop}" rx="${rx}" ry="${ry}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.2" fill-opacity="0.8"/>`;

    // Center point & Radius line on top:
    svgBody += `<circle cx="${cx}" cy="${cyTop}" r="2.5" fill="${strokeColor}"/>`;
    svgBody += `<line x1="${cx}" y1="${cyTop}" x2="${cx + rx}" y2="${cyTop}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;

    // Height vertical line (axis or dimension bracket)
    if (labels.height) {
      svgBody += `<line x1="${cx}" y1="${cyTop}" x2="${cx}" y2="${cyBase}" stroke="${strokeColor}" stroke-width="1.2" stroke-dasharray="3,3" stroke-opacity="0.7"/>`;
    }

    if (showLines) {
      if (labels.radius) svgBody += drawLabel(cx + rx / 2, cyTop - 12, labels.radius);
      if (labels.diameter) {
        svgBody += `<line x1="${cx - rx}" y1="${cyTop}" x2="${cx + rx}" y2="${cyTop}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
        svgBody += drawLabel(cx, cyTop - 14, labels.diameter);
      }
      if (labels.height) svgBody += drawLabel(cx + rx + 20, 110, labels.height);
    }
  } else if (shape === "cone") {
    let r = extractNum(labels.radius, 48);
    if (labels.diameter) r = extractNum(labels.diameter, r * 2) / 2;
    let h = extractNum(labels.height, 95);
    const sf = Math.min(130 / (r * 2), 125 / h);
    r = Math.max(25, Math.min(65, r * sf));
    h = Math.max(40, Math.min(130, h * sf));

    const rx = r, ry = r * 0.28;
    const cx = 110, cyBase = 110 + h / 2, cyApex = 110 - h / 2;

    // Body fill (cone triangle + base arc)
    svgBody += `<path d="M ${cx - rx} ${cyBase} L ${cx} ${cyApex} L ${cx + rx} ${cyBase} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cyBase} Z" fill="${fillColor}" fill-opacity="0.65"/>`;

    // Base back dashed, front solid
    svgBody += `<path d="M ${cx - rx} ${cyBase} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cyBase}" fill="none" stroke="${strokeColor}" stroke-width="1.6" stroke-dasharray="4,4"/>`;
    svgBody += `<path d="M ${cx - rx} ${cyBase} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cyBase}" fill="none" stroke="${strokeColor}" stroke-width="2.2"/>`;

    // Slant edges
    svgBody += `<line x1="${cx - rx}" y1="${cyBase}" x2="${cx}" y2="${cyApex}" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round"/>`;
    svgBody += `<line x1="${cx + rx}" y1="${cyBase}" x2="${cx}" y2="${cyApex}" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round"/>`;

    // Apex dot
    svgBody += `<circle cx="${cx}" cy="${cyApex}" r="2.5" fill="${strokeColor}"/>`;

    // Altitude line (Apex to center base)
    svgBody += `<line x1="${cx}" y1="${cyApex}" x2="${cx}" y2="${cyBase}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
    // Radius line
    svgBody += `<line x1="${cx}" y1="${cyBase}" x2="${cx + rx}" y2="${cyBase}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
    svgBody += `<circle cx="${cx}" cy="${cyBase}" r="2" fill="${strokeColor}"/>`;
    // Right-angle symbol at center base
    svgBody += `<polyline points="${cx},${cyBase - 8} ${cx + 8},${cyBase - 8} ${cx + 8},${cyBase}" fill="none" stroke="${strokeColor}" stroke-width="1.2"/>`;

    if (showLines) {
      if (labels.radius) svgBody += drawLabel(cx + rx / 2, cyBase + 14, labels.radius);
      if (labels.height) svgBody += drawLabel(cx - 16, 110, labels.height);
      if (labels.slant || labels.side || labels.garisPelukis) {
        svgBody += drawLabel(cx + rx / 2 + 18, 110 - h / 4, labels.slant || labels.side || labels.garisPelukis);
      }
    }
  } else if (shape === "sphere") {
    let r = extractNum(labels.radius, 58);
    r = Math.max(30, Math.min(70, r));
    const cx = 110, cy = 110;
    const ry = r * 0.28;

    // 3D subtle lighting gradient
    const gradId = "sphereGrad_main";
    svgBody += `
      <defs>
        <radialGradient id="${gradId}" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
          <stop offset="70%" stop-color="${fillColor}" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.25"/>
        </radialGradient>
      </defs>
    `;

    // Outer circle
    svgBody += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gradId})" stroke="${strokeColor}" stroke-width="2.2"/>`;

    // Equator dashed back, solid front
    svgBody += `<path d="M ${cx - r} ${cy} A ${r} ${ry} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    svgBody += `<path d="M ${cx - r} ${cy} A ${r} ${ry} 0 0 0 ${cx + r} ${cy}" fill="none" stroke="${strokeColor}" stroke-width="1.8"/>`;

    // Center point & Radius line
    svgBody += `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${strokeColor}"/>`;
    svgBody += `<line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;

    if (showLines && (labels.radius || labels.r)) {
      svgBody += drawLabel(cx + r / 2, cy - 12, labels.radius || labels.r);
    }
  } else if (shape === "pyramid") {
    let w = extractNum(labels.side || labels.width || labels.base, 85);
    let h = extractNum(labels.height, 85);
    let d = extractNum(labels.depth, 42);
    const sf = Math.min(130 / (w + d * 0.5), 120 / (h + d * 0.35));
    w = Math.max(50, Math.min(120, w * sf));
    h = Math.max(45, Math.min(115, h * sf));
    d = Math.max(25, Math.min(60, d * sf));

    const dx = d * 0.5, dy = d * 0.35;
    const ox = Math.round(110 - (w + dx) / 2);
    const oy = Math.round(110 + (h / 2) - (dy / 2));
    const apexX = Math.round(ox + w / 2 + dx / 2);
    const apexY = Math.round(oy - h - dy / 2);

    // Base vertices:
    const p1 = { x: ox, y: oy };            // A (front-left)
    const p2 = { x: ox + w, y: oy };        // B (front-right)
    const p3 = { x: ox + w + dx, y: oy - dy }; // C (back-right)
    const p4 = { x: ox + dx, y: oy - dy };  // D (back-left, hidden)
    const pCenter = { x: (p1.x + p3.x) / 2, y: (p1.y + p3.y) / 2 };

    // Hidden base lines (AD, CD) and hidden edge TD:
    svgBody += `<line x1="${p1.x}" y1="${p1.y}" x2="${p4.x}" y2="${p4.y}" stroke="${strokeColor}" stroke-width="1.6" stroke-dasharray="4,4" stroke-linecap="round"/>`;
    svgBody += `<line x1="${p4.x}" y1="${p4.y}" x2="${p3.x}" y2="${p3.y}" stroke="${strokeColor}" stroke-width="1.6" stroke-dasharray="4,4" stroke-linecap="round"/>`;
    svgBody += `<line x1="${p4.x}" y1="${p4.y}" x2="${apexX}" y2="${apexY}" stroke="${strokeColor}" stroke-width="1.6" stroke-dasharray="4,4" stroke-linecap="round"/>`;

    // Visible pyramid faces:
    // Right triangle face (TBC)
    svgBody += `<polygon points="${p2.x},${p2.y} ${p3.x},${p3.y} ${apexX},${apexY}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" fill-opacity="0.8" stroke-linejoin="round"/>`;
    // Front triangle face (TAB)
    svgBody += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${apexX},${apexY}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.2" fill-opacity="0.65" stroke-linejoin="round"/>`;

    // Altitude vertical line (Apex to center base):
    svgBody += `<line x1="${apexX}" y1="${apexY}" x2="${pCenter.x}" y2="${pCenter.y}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
    // Center base point & right angle
    svgBody += `<circle cx="${pCenter.x}" cy="${pCenter.y}" r="2" fill="${strokeColor}"/>`;

    // Apotema / slant height along front face (Apex to mid AB)
    const midAB = { x: (p1.x + p2.x) / 2, y: p1.y };
    if (labels.slant || labels.apotema) {
      svgBody += `<line x1="${apexX}" y1="${apexY}" x2="${midAB.x}" y2="${midAB.y}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
      svgBody += drawLabel((apexX + midAB.x) / 2 - 14, (apexY + midAB.y) / 2, labels.slant || labels.apotema);
    }

    if (showLines) {
      if (labels.side || labels.width || labels.base) svgBody += drawLabel(ox + w / 2, oy + 16, labels.side || labels.width || labels.base);
      if (labels.height) svgBody += drawLabel(apexX + 16, apexY + h / 2, labels.height);
    }
  } else if (shape === "prism") {
    // Triangular prism with complete 5 faces & dashed hidden lines
    let w = extractNum(labels.base || labels.width, 75);
    let h = extractNum(labels.height, 65);
    let d = extractNum(labels.depth || labels.length, 50);
    const sf = Math.min(130 / (w + d * 0.5), 120 / (h + d * 0.35));
    w = Math.max(40, Math.min(100, w * sf));
    h = Math.max(35, Math.min(95, h * sf));
    d = Math.max(30, Math.min(80, d * sf));

    const dx = d * 0.5, dy = d * 0.35;
    const ox = Math.round(110 - (w + dx) / 2);
    const oy = Math.round(110 + (h - dy) / 2);

    // Vertices:
    // Front triangle:
    const p1 = { x: ox, y: oy };               // Front bottom-left (A)
    const p2 = { x: ox + w, y: oy };           // Front bottom-right (B)
    const p3 = { x: ox + w / 2, y: oy - h };   // Front apex (C)
    // Back triangle:
    const p4 = { x: ox + dx, y: oy - dy };     // Back bottom-left (D)
    const p5 = { x: ox + w + dx, y: oy - dy }; // Back bottom-right (E)
    const p6 = { x: ox + w / 2 + dx, y: oy - h - dy }; // Back apex (F)

    // Hidden back edges:
    svgBody += `<line x1="${p1.x}" y1="${p1.y}" x2="${p4.x}" y2="${p4.y}" stroke="${strokeColor}" stroke-width="1.6" stroke-dasharray="4,4" stroke-linecap="round"/>`;
    svgBody += `<line x1="${p4.x}" y1="${p4.y}" x2="${p5.x}" y2="${p5.y}" stroke="${strokeColor}" stroke-width="1.6" stroke-dasharray="4,4" stroke-linecap="round"/>`;
    svgBody += `<line x1="${p4.x}" y1="${p4.y}" x2="${p6.x}" y2="${p6.y}" stroke="${strokeColor}" stroke-width="1.6" stroke-dasharray="4,4" stroke-linecap="round"/>`;

    // Sloped faces & triangles:
    // Back triangle top-right edge (EF)
    svgBody += `<line x1="${p5.x}" y1="${p5.y}" x2="${p6.x}" y2="${p6.y}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round"/>`;
    // Top ridge (CF)
    svgBody += `<line x1="${p3.x}" y1="${p3.y}" x2="${p6.x}" y2="${p6.y}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round"/>`;
    // Right sloped face (BCFE)
    svgBody += `<polygon points="${p2.x},${p2.y} ${p5.x},${p5.y} ${p6.x},${p6.y} ${p3.x},${p3.y}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" fill-opacity="0.8" stroke-linejoin="round"/>`;
    // Front triangle (ABC)
    svgBody += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.2" fill-opacity="0.65" stroke-linejoin="round"/>`;

    // Height altitude dashed line inside front triangle (if height given)
    if (labels.height) {
      svgBody += `<line x1="${p3.x}" y1="${p3.y}" x2="${p3.x}" y2="${p1.y}" stroke="${strokeColor}" stroke-width="1.4" stroke-dasharray="3,3"/>`;
      svgBody += `<polyline points="${p3.x},${p1.y - 7} ${p3.x + 7},${p1.y - 7} ${p3.x + 7},${p1.y}" fill="none" stroke="${strokeColor}" stroke-width="1.2"/>`;
    }

    if (showLines) {
      if (labels.base || labels.width || labels.side) svgBody += drawLabel(ox + w / 2, oy + 16, labels.base || labels.width || labels.side);
      if (labels.height) svgBody += drawLabel(p3.x - 18, oy - h / 2, labels.height);
      if (labels.depth || labels.length) svgBody += drawLabel(ox + w + dx / 2 + 16, oy - dy / 2 + 6, labels.depth || labels.length);
    }
  }

  // --------------------------------------------------------------------------
  // 3. BANGUN GABUNGAN (COMPOSITE SHAPES) - 100% RAPAT, MENYATU & PRESISI
  // --------------------------------------------------------------------------
  // A. Rumah 2D (Persegi Panjang + Segitiga)
  else if (shape === "house" || shape === "combined_rect_triangle") {
    let w = extractNum(labels.rectWidth || labels.width, 100);
    let hRect = extractNum(labels.rectHeight || labels.bottom_height, 65);
    let hTri = extractNum(labels.triHeight || labels.top_height, 45);
    const sf = Math.min(130 / w, 130 / (hRect + hTri));
    w *= sf; hRect *= sf; hTri *= sf;

    const ox = 110 - w / 2, oy = 110 + (hRect + hTri) / 2;
    const yRoofBase = oy - hRect;
    const yApex = yRoofBase - hTri;

    // Single unified perimeter path
    svgBody += `<polygon points="${ox},${oy} ${ox + w},${oy} ${ox + w},${yRoofBase} ${ox + w / 2},${yApex} ${ox},${yRoofBase}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round"/>`;
    // Interior dividing contact line (dashed)
    svgBody += `<line x1="${ox}" y1="${yRoofBase}" x2="${ox + w}" y2="${yRoofBase}" stroke="${strokeColor}" stroke-width="1.8" stroke-dasharray="4,4"/>`;
    // Altitude of triangle
    svgBody += `<line x1="${ox + w / 2}" y1="${yApex}" x2="${ox + w / 2}" y2="${yRoofBase}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
    svgBody += `<polyline points="${ox + w / 2},${yRoofBase - 8} ${ox + w / 2 + 8},${yRoofBase - 8} ${ox + w / 2 + 8},${yRoofBase}" fill="none" stroke="${strokeColor}" stroke-width="1"/>`;

    if (showLines) {
      if (labels.rectWidth || labels.width) svgBody += drawLabel(ox + w / 2, oy + 16, labels.rectWidth || labels.width);
      if (labels.rectHeight || labels.bottom_height) svgBody += drawLabel(ox - 18, oy - hRect / 2, labels.rectHeight || labels.bottom_height);
      if (labels.triHeight || labels.top_height) svgBody += drawLabel(ox + w / 2 + 18, yRoofBase - hTri / 2, labels.triHeight || labels.top_height);
      if (labels.triSide) svgBody += drawLabel(ox + w * 0.8 + 14, yRoofBase - hTri / 2, labels.triSide);
    }
  }

  // B. Tabung + Kerucut (Tenda Sirkus / Silo)
  else if (shape === "tube_cone" || shape === "combined_cylinder_cone") {
    let r = extractNum(labels.radius, 42);
    let hCyl = extractNum(labels.cylinderHeight || labels.bottom_height, 55);
    let hCone = extractNum(labels.coneHeight || labels.top_height, 55);
    const sf = Math.min(130 / (r * 2), 130 / (hCyl + hCone));
    r *= sf; hCyl *= sf; hCone *= sf;

    const rx = r, ry = r * 0.28;
    const cx = 110;
    const cyBase = 110 + (hCyl + hCone) / 2;
    const cyMid = cyBase - hCyl;
    const cyApex = cyMid - hCone;

    // Base cylinder bottom arc (dashed back, solid front)
    svgBody += `<path d="M ${cx - rx} ${cyBase} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cyBase}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    svgBody += `<path d="M ${cx - rx} ${cyBase} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cyBase}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>`;

    // Seamless joined body fill (cylinder body + cone)
    svgBody += `<path d="M ${cx - rx} ${cyBase} L ${cx - rx} ${cyMid} L ${cx} ${cyApex} L ${cx + rx} ${cyMid} L ${cx + rx} ${cyBase} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cyBase}" fill="${fillColor}" stroke="none"/>`;

    // Visible outline edges
    svgBody += `<line x1="${cx - rx}" y1="${cyBase}" x2="${cx - rx}" y2="${cyMid}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<line x1="${cx + rx}" y1="${cyBase}" x2="${cx + rx}" y2="${cyMid}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<line x1="${cx - rx}" y1="${cyMid}" x2="${cx}" y2="${cyApex}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<line x1="${cx + rx}" y1="${cyMid}" x2="${cx}" y2="${cyApex}" stroke="${strokeColor}" stroke-width="2.5"/>`;

    // Junction rim at cyMid: SEAMLESS INTERIOR DASHED LINE (never solid or separating!)
    svgBody += `<ellipse cx="${cx}" cy="${cyMid}" rx="${rx}" ry="${ry}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;

    // Altitude lines & radius line
    svgBody += `<line x1="${cx}" y1="${cyApex}" x2="${cx}" y2="${cyMid}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
    svgBody += `<line x1="${cx}" y1="${cyMid}" x2="${cx + rx}" y2="${cyMid}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;

    if (showLines) {
      const lR = labels.radius || "7 cm";
      const lHCyl = labels.cylinderHeight || labels.bottom_height || labels.height || "10 cm";
      const lHCone = labels.coneHeight || labels.top_height || "6 cm";
      if (lR) svgBody += drawLabel(cx + rx / 2, cyMid - 10, lR);
      if (lHCyl) svgBody += drawLabel(cx - rx - 18, cyBase - hCyl / 2, lHCyl);
      if (lHCone) svgBody += drawLabel(cx + 18, cyMid - hCone / 2, lHCone);
    }
  }

  // C. Tabung + Setengah Bola (Kapsul Kubah)
  else if (shape === "capsule" || shape === "combined_cylinder_hemisphere") {
    let r = extractNum(labels.radius, 42);
    let hCyl = extractNum(labels.cylinderHeight || labels.height, 65);
    const sf = Math.min(130 / (r * 2), 130 / (hCyl + r));
    r *= sf; hCyl *= sf;

    const rx = r, ry = r * 0.28;
    const cx = 110;
    const cyBase = 110 + (hCyl + r) / 2;
    const cyMid = cyBase - hCyl;

    // Base cylinder bottom
    svgBody += `<path d="M ${cx - rx} ${cyBase} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cyBase}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    svgBody += `<path d="M ${cx - rx} ${cyBase} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cyBase}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>`;

    // Unified fill
    svgBody += `<path d="M ${cx - rx} ${cyBase} L ${cx - rx} ${cyMid} A ${rx} ${rx} 0 0 1 ${cx + rx} ${cyMid} L ${cx + rx} ${cyBase} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cyBase}" fill="${fillColor}" stroke="none"/>`;

    // Side edges
    svgBody += `<line x1="${cx - rx}" y1="${cyBase}" x2="${cx - rx}" y2="${cyMid}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<line x1="${cx + rx}" y1="${cyBase}" x2="${cx + rx}" y2="${cyMid}" stroke="${strokeColor}" stroke-width="2.5"/>`;

    // Top dome hemisphere arc
    svgBody += `<path d="M ${cx - rx} ${cyMid} A ${rx} ${rx} 0 0 1 ${cx + rx} ${cyMid}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>`;

    // Seamless interior dashed boundary
    svgBody += `<ellipse cx="${cx}" cy="${cyMid}" rx="${rx}" ry="${ry}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    // Radius marker
    svgBody += `<line x1="${cx}" y1="${cyMid}" x2="${cx + rx}" y2="${cyMid}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;

    if (showLines) {
      const lR = labels.radius || "7 cm";
      const lH = labels.cylinderHeight || labels.height || "12 cm";
      if (lR) svgBody += drawLabel(cx + rx / 2, cyMid - 10, lR);
      if (lH) svgBody += drawLabel(cx - rx - 18, cyBase - hCyl / 2, lH);
    }
  }

  // D. Kapsul Lengkap (Tabung + 2x Setengah Bola Atas & Bawah)
  else if (shape === "capsule2" || shape === "combined_capsule_full") {
    let r = extractNum(labels.radius, 38);
    let hCyl = extractNum(labels.cylinderHeight || labels.height, 50);
    const sf = Math.min(130 / (r * 2), 130 / (hCyl + r * 2));
    r *= sf; hCyl *= sf;

    const rx = r, ry = r * 0.28;
    const cx = 110;
    const cyTopMid = 110 - hCyl / 2;
    const cyBotMid = 110 + hCyl / 2;

    // Body fill
    svgBody += `<path d="M ${cx - rx} ${cyTopMid} A ${rx} ${rx} 0 0 1 ${cx + rx} ${cyTopMid} L ${cx + rx} ${cyBotMid} A ${rx} ${rx} 0 0 1 ${cx - rx} ${cyBotMid} Z" fill="${fillColor}" stroke="none"/>`;

    // Side lines
    svgBody += `<line x1="${cx - rx}" y1="${cyTopMid}" x2="${cx - rx}" y2="${cyBotMid}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<line x1="${cx + rx}" y1="${cyTopMid}" x2="${cx + rx}" y2="${cyBotMid}" stroke="${strokeColor}" stroke-width="2.5"/>`;

    // Top dome and bottom dome
    svgBody += `<path d="M ${cx - rx} ${cyTopMid} A ${rx} ${rx} 0 0 1 ${cx + rx} ${cyTopMid}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<path d="M ${cx - rx} ${cyBotMid} A ${rx} ${rx} 0 0 0 ${cx + rx} ${cyBotMid}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>`;

    // Seamless interior dashed boundary lines
    svgBody += `<ellipse cx="${cx}" cy="${cyTopMid}" rx="${rx}" ry="${ry}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    svgBody += `<ellipse cx="${cx}" cy="${cyBotMid}" rx="${rx}" ry="${ry}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;

    if (showLines) {
      if (labels.radius) svgBody += drawLabel(cx, cyTopMid - r - 12, `r = ${labels.radius}`);
      if (labels.height || labels.cylinderHeight) svgBody += drawLabel(cx + rx + 20, 110, labels.height || labels.cylinderHeight);
    }
  }

  // E. Kerucut + Setengah Bola (Es Krim / Bandul)
  else if (shape === "icecream" || shape === "combined_cone_hemisphere") {
    let r = extractNum(labels.radius, 42);
    let hCone = extractNum(labels.coneHeight || labels.height, 65);
    const sf = Math.min(130 / (r * 2), 130 / (hCone + r));
    r *= sf; hCone *= sf;

    const rx = r, ry = r * 0.28;
    const cx = 110;
    const cyMid = 110;
    const cyApex = cyMid + hCone; // Apex facing down

    // Unified fill
    svgBody += `<path d="M ${cx - rx} ${cyMid} A ${rx} ${rx} 0 0 1 ${cx + rx} ${cyMid} L ${cx} ${cyApex} Z" fill="${fillColor}" stroke="none"/>`;

    // Slant edges
    svgBody += `<line x1="${cx - rx}" y1="${cyMid}" x2="${cx}" y2="${cyApex}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<line x1="${cx + rx}" y1="${cyMid}" x2="${cx}" y2="${cyApex}" stroke="${strokeColor}" stroke-width="2.5"/>`;

    // Hemisphere dome on top
    svgBody += `<path d="M ${cx - rx} ${cyMid} A ${rx} ${rx} 0 0 1 ${cx + rx} ${cyMid}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>`;

    // Seamless interior dashed boundary
    svgBody += `<ellipse cx="${cx}" cy="${cyMid}" rx="${rx}" ry="${ry}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    // Cone altitude line
    svgBody += `<line x1="${cx}" y1="${cyMid}" x2="${cx}" y2="${cyApex}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;

    if (showLines) {
      if (labels.radius) svgBody += drawLabel(cx + rx / 2, cyMid - 10, labels.radius);
      if (labels.coneHeight || labels.height) svgBody += drawLabel(cx - 18, cyMid + hCone / 2, labels.coneHeight || labels.height);
      if (labels.side) svgBody += drawLabel(cx + rx / 2 + 16, cyMid + hCone / 2, labels.side);
    }
  }

  // F. Kerucut Ganda (Gasing)
  else if (shape === "cone_cone" || shape === "combined_cone_cone") {
    let r = extractNum(labels.radius, 45);
    let h1 = extractNum(labels.height1, 50);
    let h2 = extractNum(labels.height2, 50);
    const sf = Math.min(130 / (r * 2), 130 / (h1 + h2));
    r *= sf; h1 *= sf; h2 *= sf;

    const rx = r, ry = r * 0.28;
    const cx = 110, cyMid = 110;

    svgBody += `<path d="M ${cx - rx} ${cyMid} L ${cx} ${cyMid - h1} L ${cx + rx} ${cyMid} L ${cx} ${cyMid + h2} Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round"/>`;
    svgBody += `<ellipse cx="${cx}" cy="${cyMid}" rx="${rx}" ry="${ry}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    svgBody += `<line x1="${cx}" y1="${cyMid - h1}" x2="${cx}" y2="${cyMid + h2}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;

    if (showLines) {
      if (labels.radius) svgBody += drawLabel(cx + rx / 2, cyMid - 10, labels.radius);
      if (labels.height1) svgBody += drawLabel(cx + 18, cyMid - h1 / 2, labels.height1);
      if (labels.height2) svgBody += drawLabel(cx + 18, cyMid + h2 / 2, labels.height2);
    }
  }

  // G. Balok / Kubus + Limas Segiempat (Atap Limas)
  else if (shape === "block_pyramid" || shape === "cube_pyramid" || shape === "combined_cuboid_pyramid" || shape === "combined_cube_pyramid") {
    const isCube = shape === "cube_pyramid" || shape === "combined_cube_pyramid";
    let w = extractNum(labels.bottom_width || labels.width || labels.panjang || labels.side || labels.sisi, isCube ? 65 : 80);
    let d = extractNum(labels.bottom_depth || labels.depth || labels.lebar || (isCube ? labels.side || labels.sisi : undefined), isCube ? w : 40);
    let h1 = extractNum(labels.bottom_height || labels.tinggi_balok || labels.height || labels.tinggi || (isCube ? labels.side || labels.sisi : undefined), isCube ? w : 45);
    let h2 = extractNum(labels.top_height || labels.roof_height || labels.pyramid_height || labels.tinggi_limas || labels.tinggi_atap, 50);
    
    // Scale factor to keep the figure neatly proportioned with tight spacing
    const sf = Math.min(85 / (w + d), 66 / (h1 + h2 + d * 0.45));
    w = Math.max(38, Math.round(w * sf));
    d = Math.max(22, Math.round(d * sf));
    h1 = Math.max(26, Math.round(h1 * sf));
    h2 = Math.max(20, Math.round(h2 * sf));

    vMinX = 0;
    vMinY = 0;
    vW = 240;

    const apexY = 27; // Clean clearance above apex for external label
    const yCenter = apexY + h2;
    const oy = Math.round(yCenter + d / 2 + h1);
    const ox = Math.round(115 - (w + d) / 2);
    const apexX = Math.round(ox + w / 2 + d / 2);

    // Tight bottom margin for bottom label
    vH = Math.max(148, oy + 28);

    // Bottom Cuboid Hidden edges
    svgBody += `<line x1="${ox}" y1="${oy}" x2="${ox + d}" y2="${oy - d}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    svgBody += `<line x1="${ox + d}" y1="${oy - d}" x2="${ox + w + d}" y2="${oy - d}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    svgBody += `<line x1="${ox + d}" y1="${oy - d}" x2="${ox + d}" y2="${oy - h1 - d}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;

    // Bottom Cuboid Faces
    svgBody += `<polygon points="${ox},${oy} ${ox + w},${oy} ${ox + w},${oy - h1} ${ox},${oy - h1}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<polygon points="${ox + w},${oy} ${ox + w + d},${oy - d} ${ox + w + d},${oy - h1 - d} ${ox + w},${oy - h1}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" fill-opacity="0.9"/>`;

    // Seamless Shared Junction Face (dashed contact border)
    svgBody += `<line x1="${ox}" y1="${oy - h1}" x2="${ox + w}" y2="${oy - h1}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4"/>`;
    svgBody += `<line x1="${ox + w}" y1="${oy - h1}" x2="${ox + w + d}" y2="${oy - h1 - d}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4"/>`;

    // Top Pyramid Faces (sitting cleanly on top surface)
    svgBody += `<polygon points="${ox},${oy - h1} ${ox + w},${oy - h1} ${apexX},${apexY}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" fill-opacity="0.8"/>`;
    svgBody += `<polygon points="${ox + w},${oy - h1} ${ox + w + d},${oy - h1 - d} ${apexX},${apexY}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" fill-opacity="0.95"/>`;

    // Altitude line & Right angle symbol (Inside pyramid, subtle dashed)
    svgBody += `<line x1="${apexX}" y1="${apexY}" x2="${apexX}" y2="${yCenter}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
    svgBody += `<circle cx="${apexX}" cy="${yCenter}" r="2" fill="${strokeColor}"/>`;
    svgBody += `<polyline points="${apexX},${yCenter - 6} ${apexX + 6},${yCenter - 6} ${apexX + 6},${yCenter}" fill="none" stroke="${strokeColor}" stroke-width="1"/>`;

    if (showLines) {
      const rawW = labels.bottom_width || labels.width || labels.panjang || labels.length || (isCube ? undefined : labels.p) || "12 cm";
      const rawD = labels.bottom_depth || labels.depth || labels.lebar || (isCube ? undefined : labels.l) || (isCube ? undefined : labels.tebal) || (isCube ? undefined : labels.d) || "8 cm";
      const rawH1 = labels.bottom_height || labels.tinggi_balok || labels.height || labels.tinggi || (isCube ? undefined : labels.t) || "10 cm";
      const rawH2 = labels.top_height || labels.roof_height || labels.pyramid_height || labels.tinggi_limas || labels.tinggi_atap || "6 cm";
      const rawSide = labels.side || labels.sisi || labels.s || "10 cm";
      const labelSlant = labels.slant || labels.apotema || labels.garis_pelukis || labels.garisPelukis;

      if (isCube) {
        const lblS = formatDim("s", rawSide);
        const lblH2 = formatDim("t_limas", rawH2);
        // Dimensi ditaruh langsung berupa angka di luar bidang geometri tanpa kontainer
        if (lblS) svgBody += drawLabel(ox + w / 2, oy + 13, lblS);
        if (lblH2) svgBody += drawLabel(apexX, apexY - 9, lblH2);
      } else {
        const lblW = formatDim("p", rawW);
        const lblD = formatDim("l", rawD);
        const lblH1 = formatDim("t", rawH1);
        const lblH2 = formatDim("t_limas", rawH2);

        // 1. Tinggi Limas: di atas puncak atap tanpa kontainer/garis
        if (lblH2) {
          svgBody += drawLabel(apexX, apexY - 9, lblH2);
        }

        // 2. Panjang Balok: di bawah rusuk depan
        if (lblW) {
          svgBody += drawLabel(ox + w / 2, oy + 13, lblW);
        }

        // 3. Lebar Balok: di samping kanan bawah sisi miring
        if (lblD) {
          svgBody += drawLabel(ox + w + d / 2 + 18, oy - d / 2 + 8, lblD);
        }

        // 4. Tinggi Balok: di sisi kiri rusuk tegak
        if (lblH1) {
          svgBody += drawLabel(ox - 20, oy - h1 / 2, lblH1);
        }
      }
      // 5. Apotema / Garis Pelukis (jika ada)
      if (labelSlant) {
        svgBody += drawLabel((ox + w + apexX) / 2 + 18, (oy - h1 + apexY) / 2 - 6, formatDim("s", labelSlant));
      }
    }
  }

  // H. Balok + Prisma Segitiga (Atap Rumah 3D)
  else if (shape === "block_roof" || shape === "combined_cuboid_prism") {
    let w = extractNum(labels.width || labels.bottom_width || labels.panjang, 80);
    let d = extractNum(labels.depth || labels.bottom_depth || labels.lebar, 42);
    let h1 = extractNum(labels.bottom_height || labels.tinggi || labels.height, 45);
    let h2 = extractNum(labels.roof_height || labels.top_height || labels.tinggi_atap, 38);
    const sf = Math.min(85 / (w + d), 66 / (h1 + h2 + d * 0.45));
    w = Math.max(38, Math.round(w * sf));
    d = Math.max(22, Math.round(d * sf));
    h1 = Math.max(26, Math.round(h1 * sf));
    h2 = Math.max(20, Math.round(h2 * sf));

    vMinX = 0;
    vMinY = 0;
    vW = 240;

    const ridgeFrontY = 27;
    const oy = Math.round(ridgeFrontY + h2 + h1);
    const ox = Math.round(115 - (w + d) / 2);
    const ridgeFrontX = ox + w / 2;
    const ridgeBackX = ridgeFrontX + d;
    vH = Math.max(148, oy + 28);

    // Bottom Cuboid
    svgBody += `<polygon points="${ox},${oy} ${ox + w},${oy} ${ox + w},${oy - h1} ${ox},${oy - h1}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<polygon points="${ox + w},${oy} ${ox + w + d},${oy - d} ${ox + w + d},${oy - h1 - d} ${ox + w},${oy - h1}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" fill-opacity="0.9"/>`;

    // Dash contact line
    svgBody += `<line x1="${ox}" y1="${oy - h1}" x2="${ox + w}" y2="${oy - h1}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4"/>`;

    // Front gable triangle
    svgBody += `<polygon points="${ox},${oy - h1} ${ox + w},${oy - h1} ${ridgeFrontX},${ridgeFrontY}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;

    // Sloped roof right plane
    svgBody += `<polygon points="${ox + w},${oy - h1} ${ox + w + d},${oy - h1 - d} ${ridgeBackX},${ridgeFrontY - d * 0.4} ${ridgeFrontX},${ridgeFrontY}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" fill-opacity="0.85"/>`;

    if (showLines) {
      const lW = labels.width || labels.bottom_width || labels.panjang || "12 cm";
      const lH1 = labels.bottom_height || labels.height || labels.tinggi || "8 cm";
      const lH2 = labels.roof_height || labels.top_height || labels.tinggi_atap || "5 cm";
      const lD = labels.depth || labels.bottom_depth || labels.lebar || "6 cm";

      if (lW) svgBody += drawLabel(ox + w / 2, oy + 13, formatDim("p", lW));
      if (lH1) svgBody += drawLabel(ox - 20, oy - h1 / 2, formatDim("t", lH1));
      if (lH2) svgBody += drawLabel(ridgeFrontX, ridgeFrontY - 9, formatDim("t_atap", lH2));
      if (lD) svgBody += drawLabel(ox + w + d / 2 + 18, oy - d / 2 + 8, formatDim("l", lD));
    }
  }

  // I. Balok + Kubus Bertumpuk (Seamless Isometric Top Surface Attachment)
  else if (shape === "combined_cuboid_cube" || shape === "combined_cuboid_cuboid") {
    const w1 = 80, d1 = 40, h1 = 35; // base cuboid
    const w2 = 40, d2 = 40, h2 = 40; // top cube
    const ox = 110 - (w1 + d1) / 2;
    const oy = 110 + (h1 + h2 + d1) / 2 - h2;
    // Top cube is centered along the top face of the cuboid
    const ox2 = ox + (w1 - w2) / 2;
    const oy2 = oy - h1;

    // Bottom Cuboid
    svgBody += `<polygon points="${ox},${oy} ${ox + w1},${oy} ${ox + w1},${oy - h1} ${ox},${oy - h1}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<polygon points="${ox + w1},${oy} ${ox + w1 + d1},${oy - d1} ${ox + w1 + d1},${oy - h1 - d1} ${ox + w1},${oy - h1}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" fill-opacity="0.9"/>`;

    // Base cuboid top face (around the cube)
    svgBody += `<polygon points="${ox},${oy - h1} ${ox + w1},${oy - h1} ${ox + w1 + d1},${oy - h1 - d1} ${ox + d1},${oy - h1 - d1}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-dasharray="4,4"/>`;

    // Top Cube (mounted flush onto the top face)
    svgBody += `<polygon points="${ox2},${oy2} ${ox2 + w2},${oy2} ${ox2 + w2},${oy2 - h2} ${ox2},${oy2 - h2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<polygon points="${ox2 + w2},${oy2} ${ox2 + w2 + d2},${oy2 - d2} ${ox2 + w2 + d2},${oy2 - h2 - d2} ${ox2 + w2},${oy2 - h2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" fill-opacity="0.9"/>`;
    svgBody += `<polygon points="${ox2},${oy2 - h2} ${ox2 + w2},${oy2 - h2} ${ox2 + w2 + d2},${oy2 - h2 - d2} ${ox2 + d2},${oy2 - h2 - d2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" fill-opacity="0.8"/>`;

    if (showLines) {
      const lW1 = labels.bottom_width || labels.width || labels.panjang || "14 cm";
      const lH1 = labels.bottom_height || labels.height || labels.tinggi || "6 cm";
      const lS = labels.top_side || labels.side || labels.sisi || "8 cm";
      if (lW1) svgBody += drawLabel(ox + w1 / 2, oy + 16, formatDim("p", lW1));
      if (lH1) svgBody += drawLabel(ox - 22, oy - h1 / 2, formatDim("t", lH1));
      if (lS) svgBody += drawLabel(ox2 + w2 / 2, oy2 - h2 - 14, formatDim("s_kubus", lS));
    }
  }

  // J. Dua Tabung Bertingkat
  else if (shape === "tube_tubes" || shape === "combined_cylinder_cylinder") {
    const cx = 110;
    const r1 = 48, h1 = 45; // lower wider cylinder
    const r2 = 28, h2 = 40; // upper narrower cylinder
    const rx1 = r1, ry1 = r1 * 0.28;
    const rx2 = r2, ry2 = r2 * 0.28;
    const cyBase = 110 + (h1 + h2) / 2;
    const cyMid = cyBase - h1;
    const cyTop = cyMid - h2;

    // Lower cylinder base
    svgBody += `<path d="M ${cx - rx1} ${cyBase} A ${rx1} ${ry1} 0 0 1 ${cx + rx1} ${cyBase}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    svgBody += `<path d="M ${cx - rx1} ${cyBase} A ${rx1} ${ry1} 0 0 0 ${cx + rx1} ${cyBase}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>`;
    // Lower cylinder sides
    svgBody += `<line x1="${cx - rx1}" y1="${cyBase}" x2="${cx - rx1}" y2="${cyMid}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<line x1="${cx + rx1}" y1="${cyBase}" x2="${cx + rx1}" y2="${cyMid}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    // Lower cylinder top rim
    svgBody += `<ellipse cx="${cx}" cy="${cyMid}" rx="${rx1}" ry="${ry1}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;

    // Upper cylinder sides
    svgBody += `<line x1="${cx - rx2}" y1="${cyMid}" x2="${cx - rx2}" y2="${cyTop}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<line x1="${cx + rx2}" y1="${cyMid}" x2="${cx + rx2}" y2="${cyTop}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    // Upper cylinder bottom junction (dashed inside)
    svgBody += `<ellipse cx="${cx}" cy="${cyMid}" rx="${rx2}" ry="${ry2}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
    // Upper cylinder top rim
    svgBody += `<ellipse cx="${cx}" cy="${cyTop}" rx="${rx2}" ry="${ry2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;

    if (showLines) {
      if (labels.radius1 || labels.radius) svgBody += drawLabel(cx + rx1 / 2, cyMid + 14, labels.radius1 || labels.radius);
      if (labels.radius2) svgBody += drawLabel(cx + rx2 / 2, cyTop - 12, labels.radius2);
      if (labels.height1 || labels.cylinderHeight) svgBody += drawLabel(cx - rx1 - 18, cyBase - h1 / 2, labels.height1 || labels.cylinderHeight);
      if (labels.height2) svgBody += drawLabel(cx + rx2 + 18, cyMid - h2 / 2, labels.height2);
    }
  }

  // K. Persegi Panjang + 1/2 Lingkaran
  else if (shape === "combined_rect_semicircle") {
    const pos = labels.position || "top";
    const w = 90, h = 65;
    const ox = 110 - w / 2, oy = 110 - h / 2 + (pos === "top" ? 20 : (pos === "bottom" ? -20 : 0));
    const r = pos === "left" || pos === "right" ? h / 2 : w / 2;

    // Rectangle
    svgBody += `<rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;

    if (pos === "top") {
      svgBody += `<path d="M ${ox} ${oy} A ${r} ${r} 0 0 1 ${ox + w} ${oy}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;
      svgBody += `<line x1="${ox}" y1="${oy}" x2="${ox + w}" y2="${oy}" stroke="${strokeColor}" stroke-width="1.8" stroke-dasharray="4,4"/>`;
      svgBody += `<circle cx="${ox + w / 2}" cy="${oy}" r="2.5" fill="${strokeColor}"/>`;
    } else if (pos === "bottom") {
      svgBody += `<path d="M ${ox + w} ${oy + h} A ${r} ${r} 0 0 1 ${ox} ${oy + h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;
      svgBody += `<line x1="${ox}" y1="${oy + h}" x2="${ox + w}" y2="${oy + h}" stroke="${strokeColor}" stroke-width="1.8" stroke-dasharray="4,4"/>`;
      svgBody += `<circle cx="${ox + w / 2}" cy="${oy + h}" r="2.5" fill="${strokeColor}"/>`;
    } else if (pos === "right") {
      svgBody += `<path d="M ${ox + w} ${oy} A ${r} ${r} 0 0 1 ${ox + w} ${oy + h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;
      svgBody += `<line x1="${ox + w}" y1="${oy}" x2="${ox + w}" y2="${oy + h}" stroke="${strokeColor}" stroke-width="1.8" stroke-dasharray="4,4"/>`;
      svgBody += `<circle cx="${ox + w}" cy="${oy + h / 2}" r="2.5" fill="${strokeColor}"/>`;
    } else {
      svgBody += `<path d="M ${ox} ${oy + h} A ${r} ${r} 0 0 1 ${ox} ${oy}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;
      svgBody += `<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy + h}" stroke="${strokeColor}" stroke-width="1.8" stroke-dasharray="4,4"/>`;
      svgBody += `<circle cx="${ox}" cy="${oy + h / 2}" r="2.5" fill="${strokeColor}"/>`;
    }

    if (showLines) {
      if (labels.width) svgBody += drawLabel(ox + w / 2, oy + h + 16, labels.width);
      if (labels.height) svgBody += drawLabel(ox - 18, oy + h / 2, labels.height);
      if (labels.radius) svgBody += drawLabel(ox + w / 2, oy - r / 2 - 4, labels.radius);
    }
  }

  // L. Bangun Bentuk L (Poligon L-Shape)
  else if (shape === "combined_l_shape") {
    const ox = 50, oy = 170;
    const w1 = 110, h1 = 50, w2 = 50, h2 = 120;
    const p1 = `${ox},${oy}`;
    const p2 = `${ox + w1},${oy}`;
    const p3 = `${ox + w1},${oy - h1}`;
    const p4 = `${ox + w2},${oy - h1}`;
    const p5 = `${ox + w2},${oy - h2}`;
    const p6 = `${ox},${oy - h2}`;

    svgBody += `<polygon points="${p1} ${p2} ${p3} ${p4} ${p5} ${p6}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round"/>`;
    // Dividing dashed line (to help students calculate area of 2 parts)
    svgBody += `<line x1="${ox + w2}" y1="${oy - h1}" x2="${ox}" y2="${oy - h1}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;

    if (showLines) {
      if (labels.bottom) svgBody += drawLabel(ox + w1 / 2, oy + 16, labels.bottom);
      if (labels.left) svgBody += drawLabel(ox - 18, oy - h2 / 2, labels.left);
      if (labels.right_bottom) svgBody += drawLabel(ox + w1 + 18, oy - h1 / 2, labels.right_bottom);
      if (labels.top) svgBody += drawLabel(ox + w2 / 2, oy - h2 - 14, labels.top);
    }
  }

  // M. Bangun Bentuk T (Dua Persegi Panjang)
  else if (shape === "combined_rect_rect") {
    const ox = 75, oy = 40, w1 = 70, h1 = 45; // top horizontal bar
    const ox2 = 90, oy2 = oy + h1, w2 = 40, h2 = 80; // vertical stem
    svgBody += `<polygon points="${ox},${oy} ${ox + w1},${oy} ${ox + w1},${oy + h1} ${ox2 + w2},${oy + h1} ${ox2 + w2},${oy2 + h2} ${ox2},${oy2 + h2} ${ox2},${oy + h1} ${ox},${oy + h1}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round"/>`;
    svgBody += `<line x1="${ox2}" y1="${oy + h1}" x2="${ox2 + w2}" y2="${oy + h1}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4,4"/>`;

    if (showLines) {
      if (labels.top_width) svgBody += drawLabel(ox + w1 / 2, oy - 14, labels.top_width);
      if (labels.bottom_height) svgBody += drawLabel(ox2 + w2 + 18, oy2 + h2 / 2, labels.bottom_height);
    }
  }

  // N. Daerah Diarsir: Persegi - Lingkaran (Shaded Area Exam Question)
  else if (shape === "shaded_circle_in_square") {
    const s = 120;
    const ox = 110 - s / 2, oy = 110 - s / 2;
    const r = s / 2;
    // Outer shaded square
    svgBody += `<rect x="${ox}" y="${oy}" width="${s}" height="${s}" fill="#94a3b8" fill-opacity="0.35" stroke="${strokeColor}" stroke-width="2.5"/>`;
    // Inner white circle (revealing the 4 shaded corner regions)
    svgBody += `<circle cx="110" cy="110" r="${r}" fill="#ffffff" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += `<circle cx="110" cy="110" r="3" fill="${strokeColor}"/>`;
    svgBody += `<line x1="110" y1="110" x2="${110 + r}" y2="110" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="3,3"/>`;

    if (showLines) {
      if (labels.side) svgBody += drawLabel(ox + s / 2, oy + s + 16, `s = ${labels.side}`);
      if (labels.radius) svgBody += drawLabel(110 + r / 2, 110 - 12, `r = ${labels.radius}`);
    }
  }

  // O. Daerah Diarsir: Lingkaran - Persegi
  else if (shape === "shaded_square_in_circle") {
    const r = 65;
    const s = r * Math.SQRT2;
    const ox = 110 - s / 2, oy = 110 - s / 2;
    // Outer shaded circle
    svgBody += `<circle cx="110" cy="110" r="${r}" fill="#94a3b8" fill-opacity="0.35" stroke="${strokeColor}" stroke-width="2.5"/>`;
    // Inner white square
    svgBody += `<rect x="${ox}" y="${oy}" width="${s}" height="${s}" fill="#ffffff" stroke="${strokeColor}" stroke-width="2.5"/>`;

    if (showLines) {
      if (labels.radius) svgBody += drawLabel(110, 110 - r - 12, `r = ${labels.radius}`);
      if (labels.side) svgBody += drawLabel(ox + s / 2, oy + s + 16, `s = ${labels.side}`);
    }
  }

  // Fallback if unknown shape
  else {
    svgBody += `<rect x="40" y="40" width="140" height="140" rx="8" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    svgBody += drawLabel(110, 110, shape || "Bentuk Geometri");
  }

  const cleanBody = svgBody.replace(/\r?\n\s*/g, " ").trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vMinX} ${vMinY} ${vW} ${vH}" width="100%" height="100%">${cleanBody}</svg>`;
};
