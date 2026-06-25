export const extractNum = (val: any, defaultVal: number): number => {
  if (!val) return defaultVal;
  const match = String(val)
    .replace(",", ".")
    .match(/[\d.]+/);
  const num = match ? parseFloat(match[0]) : defaultVal;
  return isNaN(num) || num <= 0 ? defaultVal : num;
};

export const generateGeometrySVG = (
  shape: string,
  labels: any,
  fillColor: string,
  strokeColor: string,
  showAngles: boolean = false,
  simulate: boolean = false,
  showLines: boolean = true,
) => {
  const vMinX = 0,
    vMinY = 0,
    vW = 200,
    vH = 200;
  const labelSt = `fill="${strokeColor}" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle"`;
  const angleLabelSt = `fill="${strokeColor}" font-size="12" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle"`;

  let svgBody = "";

  if (shape === "triangle") {
    let a = 120,
      b = 100,
      c = 100; // default isosceles-like
    if (simulate) {
      a = extractNum(labels.bottom, 120);
      b = extractNum(labels.left, 100);
      c = extractNum(labels.right, 100);
      if (a + b <= c || a + c <= b || b + c <= a) {
        // invalid triangle, fallback
        a = 120;
        b = 100;
        c = 100;
      }
    }
    const cp = (a * a + b * b - c * c) / (2 * a);
    const hp = Math.sqrt(Math.max(0, b * b - cp * cp));

    const sf = Math.min(160 / a, 160 / hp);
    const dw = a * sf,
      dh = hp * sf;
    const dx = cp * sf;

    const ox = (200 - dw) / 2,
      oy = (200 + dh) / 2;
    const pt0 = `${ox},${oy}`,
      pt1 = `${ox + dw},${oy}`,
      pt2 = `${ox + dx},${oy - dh}`;

    svgBody += `<polygon points="${pt0} ${pt1} ${pt2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" stroke-linejoin="round"/>`;

    if (showLines) {
      if (labels.bottom)
        svgBody += `<text x="${ox + dw / 2}" y="${oy + 15}" ${labelSt}>${labels.bottom}</text>`;
      if (labels.left)
        svgBody += `<text x="${ox + dx / 2 - 15}" y="${oy - dh / 2}" ${labelSt}>${labels.left}</text>`;
      if (labels.right)
        svgBody += `<text x="${ox + dx + (dw - dx) / 2 + 15}" y="${oy - dh / 2}" ${labelSt}>${labels.right}</text>`;
    }

    if (showAngles) {
      svgBody += `<text x="${ox + 20}" y="${oy - 10}" ${angleLabelSt}>${labels.angleA || ""}</text>`;
      svgBody += `<text x="${ox + dw - 20}" y="${oy - 10}" ${angleLabelSt}>${labels.angleB || ""}</text>`;
      svgBody += `<text x="${ox + dx}" y="${oy - dh + 20}" ${angleLabelSt}>${labels.angleC || ""}</text>`;
    }
  } else if (shape === "rectangle" || shape === "square") {
    let w = shape === "square" ? 120 : 140;
    let h = shape === "square" ? 120 : 90;
    if (simulate) {
      w = extractNum(labels.bottom, w) || extractNum(labels.top, w);
      h = extractNum(labels.left, h) || extractNum(labels.right, h);
      if (shape === "square") {
        const s =
          extractNum(labels.bottom, 0) ||
          extractNum(labels.top, 0) ||
          extractNum(labels.left, 0) ||
          extractNum(labels.right, 0) ||
          120;
        w = s;
        h = s;
      }
    }
    const sf = Math.min(160 / w, 160 / h);
    w *= sf;
    h *= sf;
    const ox = (200 - w) / 2,
      oy = (200 - h) / 2;

    svgBody += `<rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;

    if (showLines) {
      if (labels.bottom)
        svgBody += `<text x="${ox + w / 2}" y="${oy + h + 15}" ${labelSt}>${labels.bottom}</text>`;
      if (labels.top)
        svgBody += `<text x="${ox + w / 2}" y="${oy - 15}" ${labelSt}>${labels.top}</text>`;
      if (labels.left)
        svgBody += `<text x="${ox - 15}" y="${oy + h / 2}" ${labelSt}>${labels.left}</text>`;
      if (labels.right)
        svgBody += `<text x="${ox + w + 15}" y="${oy + h / 2}" ${labelSt}>${labels.right}</text>`;
      if (labels.diagonal) {
        svgBody += `<line x1="${ox}" y1="${oy + h}" x2="${ox + w}" y2="${oy}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4"/>`;
        svgBody += `<text x="${ox + w / 2}" y="${oy + h / 2 - 10}" ${labelSt}>${labels.diagonal}</text>`;
      }
    }
  } else if (shape === "parallelogram") {
    let base = 120,
      height = 80,
      offset = 30;
    if (simulate) {
      base = extractNum(labels.bottom, base) || extractNum(labels.top, base);
      height =
        extractNum(labels.height, height) ||
        extractNum(labels.left, height) * 0.866;
      const sideStr = extractNum(labels.left, 0) || extractNum(labels.right, 0);
      if (sideStr) {
        if (sideStr > height) {
          offset = Math.sqrt(sideStr * sideStr - height * height);
        } else {
          offset = 30; // fallback
        }
      }
    }
    const totW = base + offset;
    const sf = Math.min(160 / totW, 160 / height);
    base *= sf;
    height *= sf;
    offset *= sf;
    const ox = (200 - totW) / 2,
      oy = (200 - height) / 2;

    const pt0 = `${ox},${oy + height}`,
      pt1 = `${ox + base},${oy + height}`;
    const pt2 = `${ox + base + offset},${oy}`,
      pt3 = `${ox + offset},${oy}`;

    svgBody += `<polygon points="${pt0} ${pt1} ${pt2} ${pt3}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    if (showLines) {
      if (labels.height) {
        svgBody += `<line x1="${ox + offset}" y1="${oy}" x2="${ox + offset}" y2="${oy + height}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;
        svgBody += `<text x="${ox + offset + 15}" y="${oy + height / 2}" ${labelSt}>${labels.height}</text>`;
      }
      if (labels.bottom)
        svgBody += `<text x="${ox + base / 2}" y="${oy + height + 15}" ${labelSt}>${labels.bottom}</text>`;
      if (labels.top)
        svgBody += `<text x="${ox + offset + base / 2}" y="${oy - 15}" ${labelSt}>${labels.top}</text>`;
      if (labels.left)
        svgBody += `<text x="${ox + offset / 2 - 15}" y="${oy + height / 2}" ${labelSt}>${labels.left}</text>`;
      if (labels.right)
        svgBody += `<text x="${ox + base + offset / 2 + 15}" y="${oy + height / 2}" ${labelSt}>${labels.right}</text>`;
    }
    if (showAngles) {
      svgBody += `<text x="${ox + 20}" y="${oy + height - 10}" ${angleLabelSt}>${labels.angleBottomLeft || ""}</text>`;
      svgBody += `<text x="${ox + base - 10}" y="${oy + height - 10}" ${angleLabelSt}>${labels.angleBottomRight || ""}</text>`;
    }
  } else if (shape === "trapezoid") {
    let a = 140,
      b = 80,
      h = 80;
    if (simulate) {
      a = extractNum(labels.bottom, a);
      b = extractNum(labels.top, b);
      h = extractNum(labels.height, h);
    }
    const sf = Math.min(160 / Math.max(a, b), 160 / h);
    a *= sf;
    b *= sf;
    h *= sf;
    const ox = 100 - a / 2,
      oy = 100 - h / 2;
    const dif = (a - b) / 2;

    const pt0 = `${ox},${oy + h}`,
      pt1 = `${ox + a},${oy + h}`;
    const pt2 = `${ox + a - dif},${oy}`,
      pt3 = `${ox + dif},${oy}`;

    svgBody += `<polygon points="${pt0} ${pt1} ${pt2} ${pt3}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    if (showLines) {
      if (labels.bottom)
        svgBody += `<text x="${ox + a / 2}" y="${oy + h + 15}" ${labelSt}>${labels.bottom}</text>`;
      if (labels.top)
        svgBody += `<text x="${ox + dif + b / 2}" y="${oy - 15}" ${labelSt}>${labels.top}</text>`;
      if (labels.height) {
        svgBody += `<line x1="${ox + dif}" y1="${oy}" x2="${ox + dif}" y2="${oy + h}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;
        svgBody += `<text x="${ox + dif + 15}" y="${oy + h / 2}" ${labelSt}>${labels.height}</text>`;
      }
      if (labels.left)
        svgBody += `<text x="${ox + dif / 2 - 15}" y="${oy + h / 2}" ${labelSt}>${labels.left}</text>`;
      if (labels.right)
        svgBody += `<text x="${ox + a - dif / 2 + 15}" y="${oy + h / 2}" ${labelSt}>${labels.right}</text>`;
    }
  } else if (shape === "rhombus" || shape === "kite") {
    let d1 = 140,
      d2 = 100;
    let yOffset = shape === "kite" ? 30 : 0;
    if (simulate) {
      d1 = extractNum(labels.d1, d1);
      d2 = extractNum(labels.d2, d2);
    }
    const sf = Math.min(160 / d1, 160 / d2);
    d1 *= sf;
    d2 *= sf;
    yOffset *= sf;

    const pt0 = `100,${100 - d2 / 2}`;
    const pt1 = `${100 + d1 / 2},${100 + yOffset}`;
    const pt2 = `100,${100 + d2 / 2}`;
    const pt3 = `${100 - d1 / 2},${100 + yOffset}`;

    svgBody += `<polygon points="${pt0} ${pt1} ${pt2} ${pt3}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    if (showLines) {
      if (labels.d1) {
        svgBody += `<line x1="${100 - d1 / 2}" y1="${100 + yOffset}" x2="${100 + d1 / 2}" y2="${100 + yOffset}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;
        svgBody += `<text x="${100 + d1 / 4}" y="${100 + yOffset - 10}" ${labelSt}>${labels.d1}</text>`;
      }
      if (labels.d2) {
        svgBody += `<line x1="100" y1="${100 - d2 / 2}" x2="100" y2="${100 + d2 / 2}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;
        svgBody += `<text x="110" y="${100 - d2 / 4}" ${labelSt}>${labels.d2}</text>`;
      }
      if (shape === "rhombus" && labels.side) {
        svgBody += `<text x="${100 + d1 / 4 + 10}" y="${100 - d2 / 4 - 10}" ${labelSt}>${labels.side}</text>`;
      }
      if (shape === "kite") {
        if (labels.sideTop)
          svgBody += `<text x="${100 + d1 / 4 + 10}" y="${100 - d2 / 4 + yOffset / 2 - 10}" ${labelSt}>${labels.sideTop}</text>`;
        if (labels.sideBottom)
          svgBody += `<text x="${100 + d1 / 4 + 10}" y="${100 + d2 / 4 + yOffset / 2 + 10}" ${labelSt}>${labels.sideBottom}</text>`;
      }
    }
  } else if (shape === "circle") {
    let r = 60;
    if (simulate) {
      r = extractNum(labels.radius, r);
      r = Math.min(r, 80);
    }
    svgBody += `<circle cx="100" cy="100" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<circle cx="100" cy="100" r="2" fill="${strokeColor}"/>`;
    if (showLines) {
      if (labels.radius) {
        svgBody += `<line x1="100" y1="100" x2="${100 + r}" y2="100" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4"/>`;
        svgBody += `<text x="${100 + r / 2}" y="90" ${labelSt}>${labels.radius}</text>`;
      }
      if (labels.diameter) {
        svgBody += `<line x1="${100 - r}" y1="110" x2="${100 + r}" y2="110" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4"/>`;
        svgBody += `<text x="100" y="125" ${labelSt}>${labels.diameter}</text>`;
      }
    }
  } else if (shape === "cube" || shape === "block") {
    let w = shape === "cube" ? 80 : 100;
    let h = shape === "cube" ? 80 : 60;
    let d = shape === "cube" ? 40 : 50;
    if (simulate && shape === "block") {
      w = extractNum(labels.width, w);
      h = extractNum(labels.height, h);
      d = extractNum(labels.depth, d);
    }
    const sf = Math.min(120 / w, 120 / h);
    w *= sf;
    h *= sf;
    d *= sf;
    const ox = 100 - (w + d) / 2,
      oy = 100 - (h + d) / 2 + d;

    svgBody += `<rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<polygon points="${ox},${oy} ${ox + d},${oy - d} ${ox + w + d},${oy - d} ${ox + w},${oy}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<polygon points="${ox + w},${oy} ${ox + w + d},${oy - d} ${ox + w + d},${oy + h - d} ${ox + w},${oy + h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;

    svgBody += `<line x1="${ox}" y1="${oy + h}" x2="${ox + d}" y2="${oy + h - d}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;
    svgBody += `<line x1="${ox + d}" y1="${oy + h - d}" x2="${ox + w + d}" y2="${oy + h - d}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;
    svgBody += `<line x1="${ox + d}" y1="${oy + h - d}" x2="${ox + d}" y2="${oy - d}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;

    if (showLines) {
      const l = shape === "cube" ? labels.side || labels.width : labels.width;
      if (l)
        svgBody += `<text x="${ox + w / 2}" y="${oy + h + 15}" ${labelSt}>${l}</text>`;
      const l2 =
        shape === "cube" ? labels.side || labels.height : labels.height;
      if (l2)
        svgBody += `<text x="${ox - 15}" y="${oy + h / 2}" ${labelSt}>${l2}</text>`;
      const l3 = shape === "cube" ? labels.side || labels.depth : labels.depth;
      if (l3)
        svgBody += `<text x="${ox + w + d / 2 + 15}" y="${oy + h - d / 2}" ${labelSt}>${l3}</text>`;
    }
  } else if (shape === "cylinder") {
    let r = 40,
      h = 100;
    if (simulate) {
      r = extractNum(labels.radius, r);
      h = extractNum(labels.height, h);
    }
    const sf = Math.min(140 / (r * 2), 140 / h);
    r *= sf;
    h *= sf;
    const ry = r * 0.3;

    svgBody += `<path d="M ${100 - r} ${100 - h / 2} A ${r} ${ry} 0 1 0 ${100 + r} ${100 - h / 2} A ${r} ${ry} 0 1 0 ${100 - r} ${100 - h / 2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<path d="M ${100 - r} ${100 - h / 2} L ${100 - r} ${100 + h / 2} A ${r} ${ry} 0 0 0 ${100 + r} ${100 + h / 2} L ${100 + r} ${100 - h / 2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<path d="M ${100 - r} ${100 + h / 2} A ${r} ${ry} 0 0 1 ${100 + r} ${100 + h / 2}" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;

    svgBody += `<circle cx="100" cy="${100 - h / 2}" r="2" fill="${strokeColor}"/>`;

    if (showLines) {
      if (labels.radius) {
        svgBody += `<line x1="100" y1="${100 - h / 2}" x2="${100 + r}" y2="${100 - h / 2}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4"/>`;
        svgBody += `<text x="${100 + r / 2}" y="${100 - h / 2 - 10}" ${labelSt}>${labels.radius}</text>`;
      }
      if (labels.height) {
        svgBody += `<line x1="${100 + r + 10}" y1="${100 - h / 2}" x2="${100 + r + 10}" y2="${100 + h / 2}" stroke="${strokeColor}" stroke-width="1.5"/>`;
        svgBody += `<text x="${100 + r + 25}" y="100" ${labelSt}>${labels.height}</text>`;
      }
    }
  } else if (shape === "cone") {
    let r = 50,
      h = 100;
    if (simulate) {
      r = extractNum(labels.radius, r);
      h = extractNum(labels.height, h);
    }
    const sf = Math.min(140 / (r * 2), 140 / h);
    r *= sf;
    h *= sf;
    const ry = r * 0.3;

    svgBody += `<path d="M ${100 - r} ${100 + h / 2} L 100 ${100 - h / 2} L ${100 + r} ${100 + h / 2} A ${r} ${ry} 0 0 1 ${100 - r} ${100 + h / 2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<path d="M ${100 - r} ${100 + h / 2} A ${r} ${ry} 0 0 0 ${100 + r} ${100 + h / 2}" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;

    svgBody += `<circle cx="100" cy="${100 + h / 2}" r="2" fill="${strokeColor}"/>`;

    if (showLines) {
      if (labels.height) {
        svgBody += `<line x1="100" y1="${100 + h / 2}" x2="100" y2="${100 - h / 2}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;
        svgBody += `<text x="115" y="100" ${labelSt}>${labels.height}</text>`;
      }
      if (labels.radius) {
        svgBody += `<line x1="100" y1="${100 + h / 2}" x2="${100 + r}" y2="${100 + h / 2}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;
        svgBody += `<text x="${100 + r / 2}" y="${100 + h / 2 + 15}" ${labelSt}>${labels.radius}</text>`;
      }
      if (labels.slantCurve) {
        svgBody += `<text x="${100 + r / 2 + 20}" y="100" ${labelSt}>${labels.slantCurve}</text>`;
      }
    }
  } else if (shape === "sphere") {
    const r = 60;
    svgBody += `<circle cx="100" cy="100" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<path d="M ${100 - r} 100 A ${r} ${r * 0.3} 0 0 0 ${100 + r} 100" fill="none" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<path d="M ${100 - r} 100 A ${r} ${r * 0.3} 0 0 1 ${100 + r} 100" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;

    svgBody += `<circle cx="100" cy="100" r="2" fill="${strokeColor}"/>`;
    if (showLines && labels.radius) {
      svgBody += `<line x1="100" y1="100" x2="${100 + r}" y2="100" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="4"/>`;
      svgBody += `<text x="${100 + r / 2}" y="90" ${labelSt}>${labels.radius}</text>`;
    }
  } else if (shape === "pyramid") {
    // Square pyramid
    let w = 80,
      d = 40,
      h = 90;
    if (simulate) {
      const baseType = labels.baseType || "square";
      if (baseType === "square" || baseType === "rectangle") {
        w = extractNum(labels.side, w);
        d = extractNum(labels.side, d);
        h = extractNum(labels.height, h);
      }
    }
    const sf = Math.min(120 / (w + d), 120 / h);
    w *= sf;
    d *= sf;
    h *= sf;
    const ox = 100 - (w + d) / 2,
      oy = 100 + h / 2;

    const apex = `100,${oy - h}`;
    svgBody += `<polygon points="${ox},${oy} ${ox + d},${oy - d} ${ox + w + d},${oy - d} ${ox + w},${oy}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<polygon points="${ox},${oy} ${ox + w},${oy} ${apex}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<polygon points="${ox + w},${oy} ${ox + w + d},${oy - d} ${apex}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;

    svgBody += `<line x1="${ox + d}" y1="${oy - d}" x2="100" y2="${oy - h}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;

    if (showLines) {
      if (labels.side || labels.width)
        svgBody += `<text x="${ox + w / 2}" y="${oy + 15}" ${labelSt}>${labels.side || labels.width}</text>`;
      if (labels.height) {
        svgBody += `<line x1="${ox + w / 2}" y1="${oy - d / 2}" x2="100" y2="${oy - h}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;
        svgBody += `<text x="100" y="${oy - h / 2}" ${labelSt}>${labels.height}</text>`;
      }
    }
  } else if (shape === "prism") {
    // Triangular prism
    const w = 60;
    let h = 50;
    const d = 80;
    let r = 30;
    if (simulate) {
      const baseType = labels.baseType || "triangle";
      if (baseType === "triangle") {
        r = extractNum(labels.side, r);
        h = extractNum(labels.height, h);
      }
    }
    const ox = 50,
      oy = 120;
    svgBody += `<polygon points="${ox},${oy} ${ox + w},${oy} ${ox + w / 2},${oy - h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<polygon points="${ox},${oy} ${ox + d},${oy - d} ${ox + d + w / 2},${oy - h - d} ${ox + w / 2},${oy - h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<polygon points="${ox + w},${oy} ${ox + w + d},${oy - d} ${ox + d + w / 2},${oy - h - d} ${ox + w / 2},${oy - h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<line x1="${ox + d}" y1="${oy - d}" x2="${ox + w + d}" y2="${oy - d}" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4"/>`;

    if (showLines) {
      if (labels.side)
        svgBody += `<text x="${ox + w / 2}" y="${oy + 15}" ${labelSt}>${labels.side}</text>`;
      if (labels.height)
        svgBody += `<text x="${ox + w + d / 2 + 10}" y="${oy - d / 2}" ${labelSt}>${labels.height}</text>`;
    }
  } else {
    svgBody += `<rect x="50" y="50" width="100" height="100" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`;
    svgBody += `<text x="100" y="100" ${labelSt}>Shape Tbd</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vMinX} ${vMinY} ${vW} ${vH}" width="100%" height="100%">${svgBody}</svg>`;
};
