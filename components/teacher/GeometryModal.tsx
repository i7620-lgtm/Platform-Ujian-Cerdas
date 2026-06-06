import React, { useState } from 'react';

interface GeometryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (svgHtml: string) => void;
}

const SHAPES_2D = [
    { id: 'triangle', name: 'Segitiga' },
    { id: 'square', name: 'Persegi' },
    { id: 'rectangle', name: 'Persegi Panjang' },
    { id: 'parallelogram', name: 'Jajar Genjang' },
    { id: 'kite', name: 'Layang-layang' },
    { id: 'rhombus', name: 'Belah Ketupat' },
    { id: 'trapezoid', name: 'Trapesium Sembarang' },
    { id: 'trapezoid_isosceles', name: 'Trapesium Sama Kaki' },
    { id: 'trapezoid_right', name: 'Trapesium Siku-siku' },
    { id: 'polygon', name: 'Segi Banyak' },
    { id: 'circle', name: 'Lingkaran' }
];

const SHAPES_3D = [
    { id: 'cube', name: 'Kubus' },
    { id: 'cuboid', name: 'Balok' },
    { id: 'prism', name: 'Prisma' },
    { id: 'pyramid', name: 'Limas' },
    { id: 'cylinder', name: 'Tabung' },
    { id: 'cone', name: 'Kerucut' },
    { id: 'sphere', name: 'Bola' }
];

const SHAPES_COMBINED = [
    { id: 'house', name: 'Segiempat + Segitiga' },
    { id: 'capsule', name: 'Tabung + Setengah Bola Atas' },
    { id: 'capsule2', name: 'Kapsul (Tabung + 2 Setengah Bola)' },
    { id: 'icecream', name: 'Kerucut + Setengah Bola' },
    { id: 'tube_cone', name: 'Tabung + Kerucut' },
    { id: 'cone_cone', name: 'Kerucut Ganda (Gasing)' },
    { id: 'cube_pyramid', name: 'Kubus + Limas Segiempat' },
    { id: 'block_pyramid', name: 'Balok + Limas Segiempat' },
    { id: 'block_roof', name: 'Balok + Prisma Segitiga' },
    { id: 'tube_tubes', name: 'Bertingkat (Tabung)' },
    { id: 'tube_sphere', name: 'Tabung + Bola (di dalam)' }
];

const extractNum = (val: any, defaultVal: number): number => {
    if (!val) return defaultVal;
    const match = String(val).replace(',', '.').match(/[\d.]+/);
    const num = match ? parseFloat(match[0]) : defaultVal;
    return isNaN(num) || num <= 0 ? defaultVal : num;
};

export const generateGeometrySVG = (shape: string, labels: any, fillColor: string, strokeColor: string, showAngles: boolean = false, simulate: boolean = false, showLines: boolean = true) => {
    let vMinX = 0, vMinY = 0, vW = 200, vH = 200;
    const labelSt = `fill="${strokeColor}" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle"`;
    const angleLabelSt = `fill="${strokeColor}" font-size="12" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle"`;

    let svgBody = '';
    
    if (shape === 'triangle') {
        let a = 120, b = 100, c = 100; // default isosceles-like
        if (simulate) {
            a = extractNum(labels.bottom, 120);
            b = extractNum(labels.left, 100);
            c = extractNum(labels.right, 100);
            if (a + b <= c || a + c <= b || b + c <= a) {
                // invalid triangle, fallback
                a = 120; b = 100; c = 100;
            }
        }
        let cp = (a*a + b*b - c*c) / (2*a);
        let hp = Math.sqrt(Math.max(0, b*b - cp*cp));

        let minX = Math.min(0, a, cp);
        const maxX = Math.max(0, a, cp);
        let tw = maxX - minX;
        let th = hp;
        
        // Prevent div by zero
        if(tw === 0 || th === 0) { tw = 140; th = 140; }
        
        const scale = Math.min(120 / tw, 120 / th);
        a *= scale; cp *= scale; hp *= scale; tw *= scale; th *= scale; minX *= scale;

        const ox = 100 - tw/2 - minX;
        const oy = 100 + th/2;
        
        const v1x = ox, v1y = oy;
        const v2x = ox + a, v2y = oy;
        const v3x = ox + cp, v3y = oy - hp;

        svgBody = `
            <polygon points="${v1x},${v1y} ${v2x},${v2y} ${v3x},${v3y}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${v3x}" y1="${v3y}" x2="${v3x}" y2="${v2y}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
        `;
        
        if (showLines) {
            if (labels.bottom) svgBody += `<text x="${ox + a/2}" y="${oy + 15}" ${labelSt}>${labels.bottom}</text>`;
            if (labels.left) svgBody += `<text x="${ox + cp/2 - 20}" y="${oy - hp/2}" ${labelSt}>${labels.left}</text>`;
            if (labels.right) svgBody += `<text x="${ox + (a+cp)/2 + 20}" y="${oy - hp/2}" ${labelSt}>${labels.right}</text>`;
            if (labels.height) svgBody += `<text x="${v3x + 15}" y="${oy - hp/2}" ${labelSt}>${labels.height}</text>`;
        }
        
        if (showAngles) {
            const cx = ox + (a + cp) / 3;
            const cy = oy - hp / 3;
            
            const d1 = Math.hypot(cx - v1x, cy - v1y) || 1;
            const a1x = v1x + (cx - v1x) / d1 * 25;
            const a1y = v1y + (cy - v1y) / d1 * 25;
            
            const d2 = Math.hypot(cx - v2x, cy - v2y) || 1;
            const a2x = v2x + (cx - v2x) / d2 * 25;
            const a2y = v2y + (cy - v2y) / d2 * 25;
            
            const d3 = Math.hypot(cx - v3x, cy - v3y) || 1;
            const a3x = v3x + (cx - v3x) / d3 * 25;
            const a3y = v3y + (cy - v3y) / d3 * 25;

            svgBody += `
                ${labels.angleA ? `<text x="${a1x}" y="${a1y}" ${angleLabelSt}>${labels.angleA}</text>` : ''}
                ${labels.angleB ? `<text x="${a2x}" y="${a2y}" ${angleLabelSt}>${labels.angleB}</text>` : ''}
                ${labels.angleC ? `<text x="${a3x}" y="${a3y}" ${angleLabelSt}>${labels.angleC}</text>` : ''}
            `;
        }
    } else if (shape === 'square' || shape === 'rectangle') {
        let w = 120, h = 120;
        if (shape === 'rectangle') { w = 160; h = 100; }
        
        if (simulate) {
            w = extractNum(labels.bottom, w) || extractNum(labels.top, w);
            h = extractNum(labels.left, h) || extractNum(labels.right, h);
            if (shape === 'square') {
                const s = extractNum(labels.bottom, 0) || extractNum(labels.top, 0) || extractNum(labels.left, 0) || extractNum(labels.right, 0) || 120;
                w = s; h = s;
            }
        }
        
        const scale = Math.min(120 / w, 120 / h);
        w *= scale; h *= scale;
        
        const x = 100 - w/2, y = 100 - h/2;
        
        svgBody = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />`;
        
        if (showLines) {
            if (labels.top) svgBody += `<text x="${100}" y="${y - 15}" ${labelSt}>${labels.top}</text>`;
            if (labels.bottom) svgBody += `<text x="${100}" y="${y + h + 15}" ${labelSt}>${labels.bottom}</text>`;
            if (labels.left) svgBody += `<text x="${x - 20}" y="${100}" ${labelSt}>${labels.left}</text>`;
            if (labels.right) svgBody += `<text x="${x + w + 20}" y="${100}" ${labelSt}>${labels.right}</text>`;
        }
        
        if (shape === 'square' && showAngles) {
            svgBody += `<text x="${100}" y="${100}" ${angleLabelSt}>Semua 90°</text>`;
        } else if (shape === 'rectangle' && showAngles) {
            svgBody += `<text x="${100}" y="${100}" ${angleLabelSt}>Semua 90°</text>`;
        }
    } else if (shape === 'parallelogram') {
        let base = 140, height = 80, shift = 40;
        if (simulate) {
            base = extractNum(labels.bottom, base) || extractNum(labels.top, base);
            height = extractNum(labels.height, height) || extractNum(labels.left, height) * 0.866; 
            const sideStr = extractNum(labels.left, 0) || extractNum(labels.right, 0);
            if (sideStr > height) {
                shift = Math.sqrt(sideStr*sideStr - height*height);
            } else {
                shift = height * 0.577;
            }
        }
        let tw = base + shift;
        const scale = Math.min(120 / (tw || 1), 120 / (height || 1));
        base *= scale; height *= scale; shift *= scale; tw *= scale;
        
        const ox = 100 - tw/2, oy = 100 + height/2;
        
        svgBody = `
            <polygon points="${ox+shift},${oy-height} ${ox+tw},${oy-height} ${ox+base},${oy} ${ox},${oy}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${ox+shift}" y1="${oy-height}" x2="${ox+shift}" y2="${oy}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
        `;
        if (showLines) {
            if (labels.top) svgBody += `<text x="${ox + shift + base/2}" y="${oy - height - 15}" ${labelSt}>${labels.top}</text>`;
            if (labels.bottom) svgBody += `<text x="${ox + base/2}" y="${oy + 15}" ${labelSt}>${labels.bottom}</text>`;
            if (labels.left) svgBody += `<text x="${ox + shift/2 - 20}" y="${oy - height/2}" ${labelSt}>${labels.left}</text>`;
            if (labels.right) svgBody += `<text x="${ox + tw - shift/2 + 20}" y="${oy - height/2}" ${labelSt}>${labels.right}</text>`;
            if (labels.height) svgBody += `<text x="${ox + shift + 15}" y="${oy - height/2}" ${labelSt}>${labels.height}</text>`;
        }
        
        if (showAngles) {
            if (labels.angleA) svgBody += `<text x="${ox + 15}" y="${oy - 10}" ${angleLabelSt}>${labels.angleA}</text>`;
            if (labels.angleB) svgBody += `<text x="${ox + base - 15}" y="${oy - 10}" ${angleLabelSt}>${labels.angleB}</text>`;
            if (labels.angleD) svgBody += `<text x="${ox + shift + 15}" y="${oy - height + 15}" ${angleLabelSt}>${labels.angleD}</text>`;
            if (labels.angleC) svgBody += `<text x="${ox + tw - 15}" y="${oy - height + 15}" ${angleLabelSt}>${labels.angleC}</text>`;
        }
    } else if (shape === 'trapezoid' || shape === 'trapezoid_isosceles' || shape === 'trapezoid_right') {
        let a = 120, b = 60, h = 80;
        let sLeft = 20, sRight = 40;
        if (shape === 'trapezoid_right') { sLeft = 0; sRight = 60; }
        else if (shape === 'trapezoid_isosceles') { sLeft = 30; sRight = 30; }

        if (simulate) {
            a = extractNum(labels.bottom, a);
            b = extractNum(labels.top, b);
            h = extractNum(labels.height, h);
            if (b > a) { const tmp = a; a = b; b = tmp; }
            if (shape === 'trapezoid_right') {
                sLeft = 0; sRight = Math.max(0, a - b);
            } else if (shape === 'trapezoid_isosceles') {
                sLeft = Math.max(0, (a - b) / 2);
                sRight = Math.max(0, (a - b) / 2);
            } else {
                sLeft = Math.max(0, (a - b) * 0.3);
                sRight = Math.max(0, (a - b) * 0.7);
            }
        }
        const scale = Math.min(120 / a, 120 / h);
        a *= scale; b *= scale; h *= scale; sLeft *= scale; sRight *= scale;
        
        const ox = 100 - a/2, oy = 100 + h/2;
        svgBody = `
            <polygon points="${ox},${oy} ${ox+a},${oy} ${ox+a-sRight},${oy-h} ${ox+sLeft},${oy-h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${ox+sLeft}" y1="${oy-h}" x2="${ox+sLeft}" y2="${oy}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
        `;
        if (showLines) {
            if (labels.bottom) svgBody += `<text x="${100}" y="${oy + 15}" ${labelSt}>${labels.bottom}</text>`;
            if (labels.top) svgBody += `<text x="${ox + sLeft + b/2}" y="${oy - h - 15}" ${labelSt}>${labels.top}</text>`;
            if (labels.height) svgBody += `<text x="${ox + sLeft + 15}" y="${oy - h/2}" ${labelSt}>${labels.height}</text>`;
            if (labels.left) svgBody += `<text x="${ox + sLeft/2 - 20}" y="${oy - h/2}" ${labelSt}>${labels.left}</text>`;
            if (labels.right) svgBody += `<text x="${ox + a - sRight/2 + 20}" y="${oy - h/2}" ${labelSt}>${labels.right}</text>`;
        }
        
        if (showAngles) {
            if(labels.angleA) svgBody += `<text x="${ox+20}" y="${oy-10}" ${angleLabelSt}>${labels.angleA}</text>`;
            if(labels.angleB) svgBody += `<text x="${ox+a-20}" y="${oy-10}" ${angleLabelSt}>${labels.angleB}</text>`;
            if(labels.angleD) svgBody += `<text x="${ox+sLeft+15}" y="${oy-h+15}" ${angleLabelSt}>${labels.angleD}</text>`;
            if(labels.angleC) svgBody += `<text x="${ox+a-sRight-15}" y="${oy-h+15}" ${angleLabelSt}>${labels.angleC}</text>`;
        }
    } else if (shape === 'kite' || shape === 'rhombus') {
        let d1 = 120, d2 = 80;
        let cY = 70;
        if (shape === 'rhombus') cY = 60; // relative prop
        
        if (simulate) {
            d1 = extractNum(labels.d1, d1);
            d2 = extractNum(labels.d2, d2);
            if (shape === 'rhombus') {
                cY = d1 / 2;
            } else {
                cY = d1 * 0.3;
            }
        }
        const scale = Math.min(120 / d2, 120 / d1);
        d1 *= scale; d2 *= scale; cY *= scale;
        if(shape === 'rhombus') cY = d1 / 2;
        
        const cx = 100, cy = 100 - d1/2 + cY;
        const vTop = cy - cY, vBot = cy + (d1 - cY);
        const vLeft = cx - d2/2, vRight = cx + d2/2;
        
        svgBody = `
            <polygon points="${cx},${vTop} ${vRight},${cy} ${cx},${vBot} ${vLeft},${cy}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${vLeft}" y1="${cy}" x2="${vRight}" y2="${cy}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="${cx}" y1="${vTop}" x2="${cx}" y2="${vBot}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
        `;
        
        if (showLines) {
            if (labels.topLeft) svgBody += `<text x="${vLeft/2 + cx/2 - 20}" y="${vTop/2 + cy/2 - 10}" ${labelSt}>${labels.topLeft}</text>`;
            if (labels.topRight) svgBody += `<text x="${vRight/2 + cx/2 + 20}" y="${vTop/2 + cy/2 - 10}" ${labelSt}>${labels.topRight}</text>`;
            if (labels.bottomLeft) svgBody += `<text x="${vLeft/2 + cx/2 - 20}" y="${vBot/2 + cy/2 + 10}" ${labelSt}>${labels.bottomLeft}</text>`;
            if (labels.bottomRight) svgBody += `<text x="${vRight/2 + cx/2 + 20}" y="${vBot/2 + cy/2 + 10}" ${labelSt}>${labels.bottomRight}</text>`;
            if (labels.d1) svgBody += `<text x="${cx + 15}" y="${vBot - 20}" ${labelSt}>${labels.d1}</text>`;
            if (labels.d2) svgBody += `<text x="${vRight - 20}" y="${cy - 10}" ${labelSt}>${labels.d2}</text>`;
        }
        
        if (showAngles) {
            if(labels.angleA) svgBody += `<text x="${cx}" y="${vTop + 20}" ${angleLabelSt}>${labels.angleA}</text>`;
            if(labels.angleB) svgBody += `<text x="${cx}" y="${vBot - 20}" ${angleLabelSt}>${labels.angleB}</text>`;
            if(labels.angleC) svgBody += `<text x="${vLeft + 20}" y="${cy}" ${angleLabelSt}>${labels.angleC}</text>`;
            if(labels.angleD) svgBody += `<text x="${vRight - 20}" y="${cy}" ${angleLabelSt}>${labels.angleD}</text>`;
        }
    } else if (shape === 'polygon') {
        let n = parseInt(labels.nSides) || 6;
        if (n < 3) n = 3;
        if (n > 20) n = 20;

        const points = [];
        const cx = 100, cy = 100, r = 80;
        for (let i = 0; i < n; i++) {
            const theta = -Math.PI / 2 + (i * 2 * Math.PI / n);
            points.push(`${cx + r * Math.cos(theta)},${cy + r * Math.sin(theta)}`);
        }

         svgBody = `
            <polygon points="${points.join(' ')}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            ${(showLines && labels.side) ? `<text x="100" y="195" ${labelSt}>${labels.side}</text>` : ''}
            ${labels.angle && showAngles ? `<text x="100" y="100" ${angleLabelSt}>${labels.angle}</text>` : ''}
        `;
    } else if (shape === 'circle') {
        let r = 80;
        if(simulate) { r = extractNum(labels.radius, r); r = Math.min(r, 80); } 
        // Force r=80 normally, unless they want small relative to others? Default to 80.
        r = 80; 
        svgBody = `
            <circle cx="100" cy="100" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <circle cx="100" cy="100" r="3" fill="${strokeColor}" />
            <line x1="100" y1="100" x2="180" y2="100" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            ${(showLines && labels.radius) ? `<text x="140" y="90" ${labelSt}>${labels.radius}</text>` : ''}
        `;
    } else if (shape === 'cube' || shape === 'cuboid') {
        let w = 100, h = 100, d = 100;
        if (shape === 'cuboid') { w = 120; h = 80; d = 60; }
        
        if (simulate) {
            w = extractNum(labels.width, w);
            h = extractNum(labels.height, h);
            d = extractNum(labels.depth, d);
        }
        const projectedD = d * 0.5; // cavalier projection factor
        let dx = projectedD * Math.cos(Math.PI/6), dy = projectedD * Math.sin(Math.PI/6);
        let tw = w + dx, th = h + dy;
        const scale = Math.min(110 / tw, 110 / th);
        w*=scale; h*=scale; dx*=scale; dy*=scale; tw*=scale; th*=scale;
        
        // Centering
        const ox = 100 - tw/2 + 25, oy = 100 + th/2;
        
        svgBody = `
            <polygon points="${ox},${oy} ${ox+w},${oy} ${ox+w},${oy-h} ${ox},${oy-h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="${ox},${oy-h} ${ox+w},${oy-h} ${ox+w+dx},${oy-h-dy} ${ox+dx},${oy-h-dy}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="${ox+w},${oy} ${ox+w+dx},${oy-dy} ${ox+w+dx},${oy-h-dy} ${ox+w},${oy-h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${ox}" y1="${oy}" x2="${ox+dx}" y2="${oy-dy}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="${ox+dx}" y1="${oy-dy}" x2="${ox+w+dx}" y2="${oy-dy}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="${ox+dx}" y1="${oy-dy}" x2="${ox+dx}" y2="${oy-h-dy}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
        `;
        if (showLines) {
            if(labels.width) svgBody += `<text x="${ox + w/2}" y="${oy + 15}" ${labelSt}>${labels.width}</text>`;
            if(labels.height) svgBody += `<text x="${ox - 20}" y="${oy - h/2}" ${labelSt}>${labels.height}</text>`;
            if(labels.depth) svgBody += `<text x="${ox + w + dx/2 + 15}" y="${oy - dy/2 + 10}" ${labelSt}>${labels.depth}</text>`;
        }
    } else if (shape === 'cylinder') {
        let r = 60, h = 120;
        if (simulate) {
            r = extractNum(labels.radius, r);
            h = extractNum(labels.height, h);
        }
        let ry = r * 0.3;
        let tw = r * 2, th = h + ry * 2;
        const scale = Math.min(120 / tw, 120 / th);
        r*=scale; h*=scale; ry*=scale; tw*=scale; th*=scale;
        
        const cx = 100, cyTop = 100 - th/2 + ry + 10, cyBot = 100 + th/2 - ry + 10;
        
        svgBody = `
            <ellipse cx="${cx}" cy="${cyBot}" rx="${r}" ry="${ry}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <path d="M${cx-r},${cyTop} L${cx-r},${cyBot} A${r},${ry} 0 0,1 ${cx+r},${cyBot} L${cx+r},${cyTop}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <ellipse cx="${cx}" cy="${cyTop}" rx="${r}" ry="${ry}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${cx}" y1="${cyBot}" x2="${cx+r}" y2="${cyBot}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="${cx}" y1="${cyTop}" x2="${cx}" y2="${cyBot}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
        `;
        if (showLines) {
            if(labels.radius) svgBody += `<text x="${cx + r/2}" y="${cyBot - 10}" ${labelSt}>${labels.radius}</text>`;
            if(labels.height) svgBody += `<text x="${cx - Math.max(r + 15, 25)}" y="${(cyTop+cyBot)/2}" ${labelSt}>${labels.height}</text>`;
        }
    } else if (shape === 'cone') {
        let r = 60, h = 120;
        if (simulate) {
            r = extractNum(labels.radius, r);
            h = extractNum(labels.height, h);
        }
        let ry = r * 0.3;
        let tw = r*2, th = h + ry;
        const scale = Math.min(120 / tw, 120 / th);
        r*=scale; h*=scale; ry*=scale; tw*=scale; th*=scale;
        
        const cx = 100, cyTop = 100 - th/2, cyBot = 100 + th/2 - ry;
        
        svgBody = `
            <ellipse cx="${cx}" cy="${cyBot}" rx="${r}" ry="${ry}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <path d="M${cx-r},${cyBot} A${r},${ry} 0 0,1 ${cx+r},${cyBot} L${cx},${cyTop} Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="${cx}" y1="${cyTop}" x2="${cx}" y2="${cyBot}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="${cx}" y1="${cyBot}" x2="${cx+r}" y2="${cyBot}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
        `;
        if (showLines) {
            if(labels.radius) svgBody += `<text x="${cx + r/2}" y="${cyBot - 10}" ${labelSt}>${labels.radius}</text>`;
            if(labels.height) svgBody += `<text x="${cx - 15}" y="${(cyTop+cyBot)/2}" ${labelSt}>${labels.height}</text>`;
            if(labels.side) svgBody += `<text x="${cx + r/2 + 20}" y="${(cyTop+cyBot)/2}" ${labelSt}>${labels.side}</text>`;
        }
    } else if (shape === 'sphere') {
        const r = 80;
        svgBody = `
            <circle cx="100" cy="100" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <ellipse cx="100" cy="100" rx="${r}" ry="${r*0.3}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <circle cx="100" cy="100" r="3" fill="${strokeColor}" />
            <line x1="100" y1="100" x2="180" y2="100" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            ${(showLines && labels.radius) ? `<text x="140" y="90" ${labelSt}>${labels.radius}</text>` : ''}
        `;
    } else if (shape === 'prism' || shape === 'pyramid') {
        let n = parseInt(labels.nSides) || (shape === 'prism' ? 3 : 4);
        if (n < 3) n = 3;
        if (n > 20) n = 20;

        if (n === 4) {
            let w = 100, d = 100, h = 120;
            if(simulate) {
                w = extractNum(labels.side, w);
                d = extractNum(labels.side, d);
                h = extractNum(labels.height, h);
            }
            let dx = d * 0.5, dy = d * 0.3;
            let tw = w + dx, th = h + dy;
            const scale = Math.min(110/tw, 110/th);
            w*=scale; d*=scale; h*=scale; dx*=scale; dy*=scale; tw*=scale; th*=scale;
            
            const ox = 100 - tw/2 + 25, oy = 100 + th/2;
            const cx = ox + w/2 + dx/2;
            const cyTop = oy - dy/2 - h;
            const cyBot = oy - dy/2;
            
            if (shape === 'pyramid') {
                svgBody = `
                    <polygon points="${ox},${oy} ${ox+w},${oy} ${cx},${cyTop}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
                    <polygon points="${ox+w},${oy} ${ox+w+dx},${oy-dy} ${cx},${cyTop}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
                    <line x1="${ox}" y1="${oy}" x2="${ox+dx}" y2="${oy-dy}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
                    <line x1="${ox+dx}" y1="${oy-dy}" x2="${ox+w+dx}" y2="${oy-dy}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
                    <line x1="${ox+dx}" y1="${oy-dy}" x2="${cx}" y2="${cyTop}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
                    <line x1="${cx}" y1="${cyTop}" x2="${cx}" y2="${cyBot}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
                `;
                if (showLines) {
                    if(labels.side) svgBody += `<text x="${ox + w/2}" y="${oy + 15}" ${labelSt}>${labels.side}</text>`;
                    if(labels.height) svgBody += `<text x="${cx - 15}" y="${cyTop + h/2}" ${labelSt}>${labels.height}</text>`;
                }
            } else {
                svgBody = `
                    <polygon points="${ox},${oy} ${ox+w},${oy} ${ox+w},${oy-h} ${ox},${oy-h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
                    <polygon points="${ox},${oy-h} ${ox+w},${oy-h} ${ox+w+dx},${oy-h-dy} ${ox+dx},${oy-h-dy}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
                    <polygon points="${ox+w},${oy} ${ox+w+dx},${oy-dy} ${ox+w+dx},${oy-h-dy} ${ox+w},${oy-h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
                    <line x1="${ox}" y1="${oy}" x2="${ox+dx}" y2="${oy-dy}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
                    <line x1="${ox+dx}" y1="${oy-dy}" x2="${ox+w+dx}" y2="${oy-dy}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
                    <line x1="${ox+dx}" y1="${oy-dy}" x2="${ox+dx}" y2="${oy-h-dy}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
                `;
                if (showLines) {
                    if(labels.side) svgBody += `<text x="${ox + w/2}" y="${oy + 15}" ${labelSt}>${labels.side}</text>`;
                    if(labels.height) svgBody += `<text x="${ox - 20}" y="${oy - h/2}" ${labelSt}>${labels.height}</text>`;
                }
            }
        } else {
            let r = 80, h = 120;
            if(simulate) {
                r = extractNum(labels.side, r);
                h = extractNum(labels.height, h);
            }
            let ry = r * 0.4;
            let tw = r * 2, th = h + ry * 2;
            if (shape === 'pyramid') th = h + ry;
            
            const scale = Math.min(120/tw, 120/th);
            r*=scale; h*=scale; ry*=scale; tw*=scale; th*=scale;
            
            const cx = 100;
            let cyTop = 100 - th/2 + ry, cyBot = 100 + th/2 - ry;
            if (shape === 'pyramid') {
                cyTop = 100 - th/2;
                cyBot = 100 + th/2 - ry;
            }

            const ptsBot = [], ptsTop = [];
            for (let i = 0; i < n; i++) {
                const theta = (i * 2 * Math.PI) / n + (n % 2 !== 0 ? Math.PI / 2 : Math.PI / n);

                const px = cx + r * Math.cos(theta);
                const py = ry * Math.sin(theta);
                ptsBot.push({x: px, y: cyBot + py, isBack: Math.sin(theta) < -0.01});
                ptsTop.push({x: px, y: cyTop + py, isBack: Math.sin(theta) < -0.01});
            }
            
            svgBody = '';
            
            if (shape === 'prism') {
                // Draw back lines
                ptsBot.forEach((p, i) => {
                    const pnu = ptsBot[(i+1)%n];
                    if (p.isBack || pnu.isBack) svgBody += `<line x1="${p.x}" y1="${p.y}" x2="${pnu.x}" y2="${pnu.y}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />`;
                });
                ptsBot.forEach((p, i) => {
                    if (p.isBack) svgBody += `<line x1="${p.x}" y1="${p.y}" x2="${ptsTop[i].x}" y2="${ptsTop[i].y}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />`;
                });
                
                // Draw top face
                const topStr = ptsTop.map(p => `${p.x},${p.y}`).join(' ');
                svgBody += `<polygon points="${topStr}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />`;
                
                // Draw front faces
                ptsBot.forEach((p, i) => {
                    const pnu = ptsBot[(i+1)%n];
                    if (!p.isBack || !pnu.isBack) {
                        svgBody += `<polygon points="${p.x},${p.y} ${pnu.x},${pnu.y} ${ptsTop[(i+1)%n].x},${ptsTop[(i+1)%n].y} ${ptsTop[i].x},${ptsTop[i].y}" fill="${fillColor}" fill-opacity="0.6" stroke="${strokeColor}" stroke-width="2" />`;
                    }
                });
            } else {
                // Draw back lines of base
                ptsBot.forEach((p, i) => {
                    const pnu = ptsBot[(i+1)%n];
                    if (p.isBack || pnu.isBack) svgBody += `<line x1="${p.x}" y1="${p.y}" x2="${pnu.x}" y2="${pnu.y}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />`;
                });
                // Draw back edges to apex
                ptsBot.forEach((p, i) => {
                    if (p.isBack) svgBody += `<line x1="${p.x}" y1="${p.y}" x2="${cx}" y2="${cyTop}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />`;
                });
                
                // Draw height line
                svgBody += `<line x1="${cx}" y1="${cyTop}" x2="${cx}" y2="${cyBot}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />`;
                
                // Draw front faces
                ptsBot.forEach((p, i) => {
                    const pnu = ptsBot[(i+1)%n];
                    if (!p.isBack || !pnu.isBack) {
                        svgBody += `<polygon points="${p.x},${p.y} ${pnu.x},${pnu.y} ${cx},${cyTop}" fill="${fillColor}" fill-opacity="0.6" stroke="${strokeColor}" stroke-width="2" />`;
                    }
                });
            }

            if (showLines) {
                if(labels.side) svgBody += `<text x="${cx + r/2 + 5}" y="${cyBot + ry/2 + 12}" ${labelSt}>${labels.side}</text>`;
                if(labels.height) svgBody += `<text x="${cx - 10}" y="${(cyTop + cyBot)/2}" ${labelSt}>${labels.height}</text>`;
            }
        }
    } else if (shape === 'house') {
        svgBody = `
            <path d="M50,180 L150,180 L150,100 L100,40 L50,100 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <line x1="50" y1="100" x2="150" y2="100" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            ${(showLines && labels.rectWidth) ? `<text x="100" y="195" ${labelSt}>${labels.rectWidth}</text>` : ''}
            ${(showLines && labels.rectHeight) ? `<text x="35" y="145" ${labelSt}>${labels.rectHeight}</text>` : ''}
            ${(showLines && labels.triHeight) ? `<text x="35" y="75" ${labelSt}>${labels.triHeight}</text>` : ''}
            ${(showLines && labels.triSide) ? `<text x="155" y="65" ${labelSt}>${labels.triSide}</text>` : ''}
        `;
    } else if (shape === 'capsule') {
        svgBody = `
            <path d="M40,100 A60,60 0 0,1 160,100 L160,160 A60,20 0 0,1 40,160 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,100 A60,20 0 0,1 160,100" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <path d="M40,100 A60,20 0 0,0 160,100" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,160 A60,20 0 0,0 160,160" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,160 A60,20 0 0,1 160,160" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="100" x2="100" y2="160" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="160" x2="160" y2="160" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            ${(showLines && labels.radius) ? `<text x="130" y="150" ${labelSt}>${labels.radius}</text>` : ''}
            ${(showLines && labels.height) ? `<text x="25" y="135" ${labelSt}>${labels.height}</text>` : ''}
        `;
    } else if (shape === 'capsule2') {
        svgBody = `
            <path d="M40,100 A60,60 0 0,1 160,100 L160,160 A60,60 0 0,1 40,160 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,100 A60,20 0 0,1 160,100" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <path d="M40,100 A60,20 0 0,0 160,100" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,160 A60,20 0 0,1 160,160" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <path d="M40,160 A60,20 0 0,0 160,160" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <line x1="100" y1="100" x2="100" y2="160" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="160" x2="160" y2="160" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="100" x2="160" y2="100" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            ${(showLines && labels.radius) ? `<text x="130" y="150" ${labelSt}>${labels.radius}</text>` : ''}
            ${(showLines && labels.height) ? `<text x="25" y="135" ${labelSt}>${labels.height}</text>` : ''}
        `;
    } else if (shape === 'icecream') {
        svgBody = `
            <path d="M40,80 A60,60 0 0,1 160,80 L100,180 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,80 A60,20 0 0,1 160,80" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <path d="M40,80 A60,20 0 0,0 160,80" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <line x1="100" y1="80" x2="160" y2="80" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="80" x2="100" y2="180" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            ${(showLines && labels.radius) ? `<text x="130" y="70" ${labelSt}>${labels.radius}</text>` : ''}
            ${(showLines && labels.side) ? `<text x="145" y="130" ${labelSt}>${labels.side}</text>` : ''}
            ${(showLines && labels.height) ? `<text x="90" y="140" ${labelSt}>${labels.height}</text>` : ''}
        `;
    } else if (shape === 'tube_cone') {
        svgBody = `
            <path d="M40,100 L100,30 L160,100 L160,160 A60,20 0 0,1 40,160 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,100 A60,20 0 0,0 160,100" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,100 A60,20 0 0,1 160,100" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <path d="M40,160 A60,20 0 0,0 160,160" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,160 A60,20 0 0,1 160,160" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="30" x2="100" y2="100" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="100" x2="100" y2="160" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="160" x2="160" y2="160" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="100" x2="160" y2="100" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            ${(showLines && labels.coneHeight) ? `<text x="85" y="65" ${labelSt}>${labels.coneHeight}</text>` : ''}
            ${(showLines && labels.coneSide) ? `<text x="145" y="60" ${labelSt}>${labels.coneSide}</text>` : ''}
            ${(showLines && labels.tubeHeight) ? `<text x="25" y="130" ${labelSt}>${labels.tubeHeight}</text>` : ''}
            ${(showLines && labels.radius) ? `<text x="130" y="90" ${labelSt}>${labels.radius}</text>` : ''}
        `;
    } else if (shape === 'cone_cone') {
        svgBody = `
            <path d="M100,20 L40,100 L100,180 L160,100 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,100 A60,20 0 0,0 160,100" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,100 A60,20 0 0,1 160,100" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="20" x2="100" y2="100" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="100" x2="100" y2="180" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="100" x2="160" y2="100" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            ${(showLines && labels.radius) ? `<text x="130" y="90" ${labelSt}>${labels.radius}</text>` : ''}
            ${(showLines && labels.topHeight) ? `<text x="85" y="60" ${labelSt}>${labels.topHeight}</text>` : ''}
            ${(showLines && labels.botHeight) ? `<text x="85" y="140" ${labelSt}>${labels.botHeight}</text>` : ''}
            ${(showLines && labels.topSide) ? `<text x="145" y="60" ${labelSt}>${labels.topSide}</text>` : ''}
            ${(showLines && labels.botSide) ? `<text x="145" y="140" ${labelSt}>${labels.botSide}</text>` : ''}
        `;
    } else if (shape === 'cube_pyramid') {
        svgBody = `
            <polygon points="50,110 50,170 120,170 120,110" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="50,110 80,90 150,90 120,110" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="120,110 150,90 150,150 120,170" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="50,110 100,30 120,110" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="120,110 100,30 150,90" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            
            <polyline points="50,170 80,150 150,150" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="80" y1="90" x2="80" y2="150" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="80" y1="90" x2="100" y2="30" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="30" x2="100" y2="100" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="50" y1="110" x2="80" y2="90" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            
            <line x1="120" y1="110" x2="120" y2="170" stroke="${strokeColor}" stroke-width="2" />
            <line x1="120" y1="110" x2="150" y2="90" stroke="${strokeColor}" stroke-width="2" />
            <line x1="120" y1="110" x2="100" y2="30" stroke="${strokeColor}" stroke-width="2" />
            <line x1="50" y1="110" x2="120" y2="110" stroke="${strokeColor}" stroke-width="2" />
            
            ${(showLines && labels.side) ? `<text x="85" y="180" ${labelSt}>${labels.side}</text>` : ''}
            ${(showLines && labels.pyramidHeight) ? `<text x="85" y="65" ${labelSt}>${labels.pyramidHeight}</text>` : ''}
            ${(showLines && labels.pyramidSide) ? `<text x="125" y="65" ${labelSt}>${labels.pyramidSide}</text>` : ''}
        `;
    } else if (shape === 'block_pyramid') {
        svgBody = `
            <polygon points="40,110 40,150 140,150 140,110" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="40,110 80,80 180,80 140,110" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="140,110 180,80 180,120 140,150" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="40,110 110,20 140,110" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="140,110 110,20 180,80" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            
            <polyline points="40,150 80,120 180,120" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="80" y1="80" x2="80" y2="120" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="80" y1="80" x2="110" y2="20" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="110" y1="20" x2="110" y2="95" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="40" y1="110" x2="80" y2="80" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            
            <line x1="140" y1="110" x2="140" y2="150" stroke="${strokeColor}" stroke-width="2" />
            <line x1="140" y1="110" x2="180" y2="80" stroke="${strokeColor}" stroke-width="2" />
            <line x1="140" y1="110" x2="110" y2="20" stroke="${strokeColor}" stroke-width="2" />
            <line x1="40" y1="110" x2="140" y2="110" stroke="${strokeColor}" stroke-width="2" />
            
            ${(showLines && labels.length) ? `<text x="90" y="160" ${labelSt}>${labels.length}</text>` : ''}
            ${(showLines && labels.width) ? `<text x="175" y="145" ${labelSt}>${labels.width}</text>` : ''}
            ${(showLines && labels.height) ? `<text x="25" y="130" ${labelSt}>${labels.height}</text>` : ''}
            ${(showLines && labels.pyramidHeight) ? `<text x="95" y="60" ${labelSt}>${labels.pyramidHeight}</text>` : ''}
            ${(showLines && labels.pyramidSide) ? `<text x="135" y="60" ${labelSt}>${labels.pyramidSide}</text>` : ''}
        `;
    } else if (shape === 'block_roof') {
        svgBody = `
            <polygon points="40,120 140,120 140,160 40,160" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="140,120 170,100 170,140 140,160" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="40,120 90,60 140,120" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <polygon points="140,120 170,100 120,40 90,60" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            
            <polyline points="40,160 70,140 170,140" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <polyline points="40,120 70,100 170,100" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="70" y1="140" x2="70" y2="100" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="70" y1="100" x2="120" y2="40" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            
            <line x1="140" y1="120" x2="140" y2="160" stroke="${strokeColor}" stroke-width="2" />
            <line x1="140" y1="120" x2="170" y2="100" stroke="${strokeColor}" stroke-width="2" />
            
            ${(showLines && labels.length) ? `<text x="90" y="170" ${labelSt}>${labels.length}</text>` : ''}
            ${(showLines && labels.width) ? `<text x="165" y="155" ${labelSt}>${labels.width}</text>` : ''}
            ${(showLines && labels.height) ? `<text x="25" y="140" ${labelSt}>${labels.height}</text>` : ''}
            ${(showLines && labels.roofHeight) ? `<text x="80" y="70" ${labelSt}>${labels.roofHeight}</text>` : ''}
        `;
    } else if (shape === 'tube_tubes') {
        svgBody = `
            <path d="M40,140 L40,180 A60,15 0 0,0 160,180 L160,140 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,180 A60,15 0 0,0 160,180" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <path d="M40,180 A60,15 0 0,1 160,180" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <ellipse cx="100" cy="140" rx="60" ry="15" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            
            <path d="M60,80 L60,140 A40,10 0 0,0 140,140 L140,80 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <path d="M60,140 A40,10 0 0,0 140,140" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <path d="M60,140 A40,10 0 0,1 140,140" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            
            <ellipse cx="100" cy="80" rx="40" ry="10" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            
            <line x1="100" y1="80" x2="100" y2="140" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="140" x2="100" y2="180" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="180" x2="160" y2="180" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="140" x2="160" y2="140" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="80" x2="140" y2="80" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            
            ${(showLines && labels.radius1) ? `<text x="130" y="130" ${labelSt}>${labels.radius1}</text>` : ''}
            ${(showLines && labels.radius2) ? `<text x="120" y="70" ${labelSt}>${labels.radius2}</text>` : ''}
            ${(showLines && labels.height1) ? `<text x="25" y="160" ${labelSt}>${labels.height1}</text>` : ''}
            ${(showLines && labels.height2) ? `<text x="45" y="110" ${labelSt}>${labels.height2}</text>` : ''}
        `;
    } else if (shape === 'tube_sphere') {
        svgBody = `
            <path d="M50,110 L50,170 A50,15 0 0,0 150,170 L150,110 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <path d="M50,110 A50,50 0 0,0 150,110" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <path d="M50,110 A50,50 0 0,1 150,110" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
            <path d="M50,110 A50,15 0 0,0 150,110" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <path d="M50,110 A50,15 0 0,1 150,110" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            
            <path d="M50,170 A50,15 0 0,0 150,170" fill="none" stroke="${strokeColor}" stroke-width="2" />
            <path d="M50,170 A50,15 0 0,1 150,170" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            
            <line x1="100" y1="110" x2="100" y2="170" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="170" x2="150" y2="170" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            <line x1="100" y1="110" x2="150" y2="110" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4,4" />
            
            ${(showLines && labels.tubeHeight) ? `<text x="35" y="140" ${labelSt}>${labels.tubeHeight}</text>` : ''}
            ${(showLines && labels.radius) ? `<text x="125" y="100" ${labelSt}>${labels.radius}</text>` : ''}
        `;
    }

    // --- Auto Bounding Box Algorithm ---
    let bMinX = Infinity, bMaxX = -Infinity, bMinY = Infinity, bMaxY = -Infinity;

    const updateBounds = (x: number, y: number) => {
        if (!isNaN(x) && !isNaN(y)) {
            if (x < bMinX) bMinX = x;
            if (x > bMaxX) bMaxX = x;
            if (y < bMinY) bMinY = y;
            if (y > bMaxY) bMaxY = y;
        }
    };

    // 1. Scan texts
    const textRegex = /<text[^>]*x="(-?\d+(?:\.\d+)?)"[^>]*y="(-?\d+(?:\.\d+)?)"[^>]*>(.*?)<\/text>/g;
    let match;
    while ((match = textRegex.exec(svgBody)) !== null) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        const text = match[3];
        const halfW = (text.length * 8) / 2 + 15; // approximate text width + padding buffer
        updateBounds(x - halfW, y - 15);
        updateBounds(x + halfW, y + 15);
    }

    // 2. Scan circles, ellipses
    const circleRegex = /c?x="(-?\d+(?:\.\d+)?)"\s+c?y="(-?\d+(?:\.\d+)?)"(?:\s+r="(-?\d+(?:\.\d+)?)")?(?:\s+rx="(-?\d+(?:\.\d+)?)")?(?:\s+ry="(-?\d+(?:\.\d+)?)")?/g;
    while ((match = circleRegex.exec(svgBody)) !== null) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        if (!isNaN(x) && !isNaN(y)) {
            const rx = parseFloat(match[3] || match[4] || '0');
            const ry = parseFloat(match[3] || match[5] || '0');
            updateBounds(x - rx, y - ry);
            updateBounds(x + rx, y + ry);
        }
    }

    // 3. Scan polygons and polylines points
    const pointsRegex = /points="([^"]+)"/g;
    while ((match = pointsRegex.exec(svgBody)) !== null) {
        const pts = match[1].split(/[\s,]+/);
        for (let i = 0; i < pts.length; i += 2) {
            if (pts[i] && pts[i+1]) {
                updateBounds(parseFloat(pts[i]), parseFloat(pts[i+1]));
            }
        }
    }

    // 4. Scan regular lines
    const lineRegex = /x1="(-?\d+(?:\.\d+)?)"\s+y1="(-?\d+(?:\.\d+)?)"\s+x2="(-?\d+(?:\.\d+)?)"\s+y2="(-?\d+(?:\.\d+)?)"/g;
    while ((match = lineRegex.exec(svgBody)) !== null) {
        updateBounds(parseFloat(match[1]), parseFloat(match[2]));
        updateBounds(parseFloat(match[3]), parseFloat(match[4]));
    }

    // 5. Scan rects
    const rectRegex = /<rect[^>]*x="(-?\d+(?:\.\d+)?)"[^>]*y="(-?\d+(?:\.\d+)?)"[^>]*width="(-?\d+(?:\.\d+)?)"[^>]*height="(-?\d+(?:\.\d+)?)"/g;
    while ((match = rectRegex.exec(svgBody)) !== null) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        const w = parseFloat(match[3]);
        const h = parseFloat(match[4]);
        updateBounds(x, y);
        updateBounds(x + w, y + h);
    }
    
    // 6. Scan paths (simple M and L extraction)
    const pathRegex = /d="([^"]+)"/g;
    while ((match = pathRegex.exec(svgBody)) !== null) {
        const dStr = match[1];
        const mlRegex = /[ML]\s*(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/gi;
        let mlMatch;
        while((mlMatch = mlRegex.exec(dStr)) !== null) {
            updateBounds(parseFloat(mlMatch[1]), parseFloat(mlMatch[2]));
        }
        
        // rudimentary extraction for curves (A, C, Q)
        // just extract all numbers and assume they are inside the main bounding box roughly
        const anyNumRegex = /(-?\d+(?:\.\d+)?)/g;
        let anyMatch;
        const nums = [];
        while((anyMatch = anyNumRegex.exec(dStr)) !== null) {
             nums.push(parseFloat(anyMatch[1]));
        }
        for (let i = 0; i < nums.length - 1; i += 2) {
             // to avoid rx ry from A commands messing up bounds too much, we only update bounds if they look like reasonable coords
             if (nums[i] > -100 && nums[i] < 300 && nums[i+1] > -100 && nums[i+1] < 300) {
                 updateBounds(nums[i], nums[i+1]);
             }
        }
    }

    if (bMinX === Infinity) bMinX = 0;
    if (bMaxX === -Infinity) bMaxX = 200;
    if (bMinY === Infinity) bMinY = 0;
    if (bMaxY === -Infinity) bMaxY = 200;

    // Add extra padding
    bMinX -= 10;
    bMaxX += 10;
    bMinY -= 10;
    bMaxY += 10;

    vMinX = bMinX;
    vMinY = bMinY;
    vW = bMaxX - bMinX;
    vH = bMaxY - bMinY;

    const viewBox = `${vMinX.toFixed(1)} ${vMinY.toFixed(1)} ${vW.toFixed(1)} ${vH.toFixed(1)}`;
    
    const maxDimension = 160;
    let actualWidth = maxDimension;
    let actualHeight = maxDimension;
    if (vW >= vH) {
        actualWidth = maxDimension;
        actualHeight = (vH / vW) * maxDimension;
    } else {
        actualHeight = maxDimension;
        actualWidth = (vW / vH) * maxDimension;
    }

    return `<svg viewBox="${viewBox}" width="${actualWidth}" height="${actualHeight}" style="max-width: 100%; display: inline-block; vertical-align: middle; margin: 4px; overflow: visible;">${svgBody}</svg>`;
};


export const GeometryModal: React.FC<GeometryModalProps> = ({ isOpen, onClose, onInsert }) => {
    const [category, setCategory] = useState<'2d' | '3d' | 'combined'>('2d');
    const [shape, setShape] = useState<string>('triangle');
    const [labels, setLabels] = useState<any>({});
    
    // Fill/Stroke state
    const [fillColor, setFillColor] = useState('#f8fafc');
    const [strokeColor, setStrokeColor] = useState('#0f172a');
    const [showAngles, setShowAngles] = useState(false);
    const [simulate, setSimulate] = useState(false);
    const [showLines, setShowLines] = useState(true);

    if (!isOpen) return null;

    const shapes = category === '2d' ? SHAPES_2D : (category === '3d' ? SHAPES_3D : SHAPES_COMBINED);
    
    // When category changes, reset shape
    const handleCategoryChange = (cat: '2d' | '3d' | 'combined') => {
        setCategory(cat);
        setShape(cat === '2d' ? SHAPES_2D[0].id : (cat === '3d' ? SHAPES_3D[0].id : SHAPES_COMBINED[0].id));
        setLabels({});
        setShowAngles(false);
        setShowLines(true);
    };

    const handleLabelChange = (key: string, value: string) => {
        setLabels({ ...labels, [key]: value });
    };

    const handleInsert = () => {
        const svgContent = generateGeometrySVG(shape, labels, fillColor, strokeColor, showAngles, simulate, showLines);
        const html = `<span class="geometry-shape" contenteditable="false" style="display: inline-block; vertical-align: middle; margin: 0 0.5rem; text-align: center; line-height: 1;">${svgContent}</span>`;
        onInsert(html);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-gray-700 dark:text-slate-200">Bangun Datar & Ruang</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-700 rounded-lg mb-4">
                            <button 
                                onClick={() => handleCategoryChange('2d')} 
                                className={`flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${category === '2d' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                            >
                                B. Datar
                            </button>
                            <button 
                                onClick={() => handleCategoryChange('3d')} 
                                className={`flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${category === '3d' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                            >
                                B. Ruang
                            </button>
                            <button 
                                onClick={() => handleCategoryChange('combined')} 
                                className={`flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${category === 'combined' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                            >
                                Gabungan
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Bentuk Geometri</label>
                            <select 
                                value={shape} 
                                onChange={(e) => { setShape(e.target.value); setLabels({}); }}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
                            >
                                {shapes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Warna Garis</label>
                                <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-full h-8 p-0 border-0 rounded cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Warna Isi</label>
                                <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-full h-8 p-0 border-0 rounded cursor-pointer" />
                            </div>
                        </div>

                        <div className="mb-4 flex flex-col gap-2">
                            {category === '2d' && shape !== 'circle' && (
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="showAngles" checked={showAngles} onChange={(e) => setShowAngles(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                                    <label htmlFor="showAngles" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer">Tampilkan Sudut</label>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="showLines" checked={showLines} onChange={(e) => setShowLines(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                                <label htmlFor="showLines" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer">Tampilkan Panjang Garis</label>
                            </div>
                            {shape !== 'house' && !['capsule', 'capsule2', 'icecream'].includes(shape) && (
                                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded border border-indigo-100 dark:border-indigo-800">
                                    <input type="checkbox" id="simulateSize" checked={simulate} onChange={(e) => setSimulate(e.target.checked)} className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600" />
                                    <label htmlFor="simulateSize" className="text-sm font-bold text-indigo-700 dark:text-indigo-400 cursor-pointer">Simulasikan Proporsi Garis</label>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase border-b border-gray-100 dark:border-slate-700 pb-1">Label Garis / Dimensi {showAngles ? '& Sudut' : ''}</label>
                            <div className="space-y-2">
                                {['square', 'rectangle'].includes(shape) && (
                                    <>
                                        <input type="text" placeholder="Sisi Atas" value={labels.top || ''} onChange={(e) => handleLabelChange('top', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Bawah (Alas)" value={labels.bottom || ''} onChange={(e) => handleLabelChange('bottom', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Kiri" value={labels.left || ''} onChange={(e) => handleLabelChange('left', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Kanan" value={labels.right || ''} onChange={(e) => handleLabelChange('right', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                    </>
                                )}
                                {shape === 'triangle' && (
                                    <>
                                        <input type="text" placeholder="Alas" value={labels.bottom || ''} onChange={(e) => handleLabelChange('bottom', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Kiri" value={labels.left || ''} onChange={(e) => handleLabelChange('left', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Kanan" value={labels.right || ''} onChange={(e) => handleLabelChange('right', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi" value={labels.height || ''} onChange={(e) => handleLabelChange('height', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        {showAngles && (
                                            <div className="grid grid-cols-3 gap-2 mt-2">
                                                <input type="text" placeholder="Sudut Kiri" value={labels.angleA || ''} onChange={(e) => handleLabelChange('angleA', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                                <input type="text" placeholder="Sudut Atas" value={labels.angleC || ''} onChange={(e) => handleLabelChange('angleC', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                                <input type="text" placeholder="Sudut Kanan" value={labels.angleB || ''} onChange={(e) => handleLabelChange('angleB', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                            </div>
                                        )}
                                    </>
                                )}
                                {['parallelogram', 'trapezoid', 'trapezoid_isosceles', 'trapezoid_right'].includes(shape) && (
                                    <>
                                        <input type="text" placeholder="Sisi Atas" value={labels.top || ''} onChange={(e) => handleLabelChange('top', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Bawah (Alas)" value={labels.bottom || ''} onChange={(e) => handleLabelChange('bottom', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Kiri" value={labels.left || ''} onChange={(e) => handleLabelChange('left', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Kanan" value={labels.right || ''} onChange={(e) => handleLabelChange('right', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi" value={labels.height || ''} onChange={(e) => handleLabelChange('height', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        {showAngles && (
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <input type="text" placeholder="Sudut Kiri Bawah" value={labels.angleA || ''} onChange={(e) => handleLabelChange('angleA', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                                <input type="text" placeholder="Sudut Kanan Bawah" value={labels.angleB || ''} onChange={(e) => handleLabelChange('angleB', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                                <input type="text" placeholder="Sudut Kiri Atas" value={labels.angleD || ''} onChange={(e) => handleLabelChange('angleD', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                                <input type="text" placeholder="Sudut Kanan Atas" value={labels.angleC || ''} onChange={(e) => handleLabelChange('angleC', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                            </div>
                                        )}
                                    </>
                                )}
                                {['kite', 'rhombus'].includes(shape) && (
                                    <>
                                        <input type="text" placeholder="Sisi Kiri Atas" value={labels.topLeft || ''} onChange={(e) => handleLabelChange('topLeft', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Kanan Atas" value={labels.topRight || ''} onChange={(e) => handleLabelChange('topRight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Kiri Bawah" value={labels.bottomLeft || ''} onChange={(e) => handleLabelChange('bottomLeft', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Kanan Bawah" value={labels.bottomRight || ''} onChange={(e) => handleLabelChange('bottomRight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Diagonal Vertikal (d1)" value={labels.d1 || ''} onChange={(e) => handleLabelChange('d1', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Diagonal Horizontal (d2)" value={labels.d2 || ''} onChange={(e) => handleLabelChange('d2', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        {showAngles && (
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <input type="text" placeholder="Sudut Atas" value={labels.angleA || ''} onChange={(e) => handleLabelChange('angleA', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                                <input type="text" placeholder="Sudut Bawah" value={labels.angleB || ''} onChange={(e) => handleLabelChange('angleB', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                                <input type="text" placeholder="Sudut Kiri" value={labels.angleC || ''} onChange={(e) => handleLabelChange('angleC', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                                <input type="text" placeholder="Sudut Kanan" value={labels.angleD || ''} onChange={(e) => handleLabelChange('angleD', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                            </div>
                                        )}
                                    </>
                                )}
                                {shape === 'polygon' && (
                                    <>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Jumlah Sisi:</span>
                                            <input type="number" min="3" max="20" placeholder="6" value={labels.nSides || ''} onChange={(e) => handleLabelChange('nSides', e.target.value)} className="w-16 px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        </div>
                                        <input type="text" placeholder="Panjang Sisi" value={labels.side || ''} onChange={(e) => handleLabelChange('side', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        {showAngles && (
                                            <div className="mt-2">
                                                <input type="text" placeholder="Besar Tiap Sudut Dalam" value={labels.angle || ''} onChange={(e) => handleLabelChange('angle', e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400" />
                                            </div>
                                        )}
                                    </>
                                )}
                                {shape === 'circle' && (
                                    <input type="text" placeholder="Jari-jari (r)" value={labels.radius || ''} onChange={(e) => handleLabelChange('radius', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                )}

                                {['cube', 'cuboid'].includes(shape) && (
                                    <>
                                        <input type="text" placeholder="Panjang (alas)" value={labels.width || ''} onChange={(e) => handleLabelChange('width', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Lebar (samping)" value={labels.depth || ''} onChange={(e) => handleLabelChange('depth', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi" value={labels.height || ''} onChange={(e) => handleLabelChange('height', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                    </>
                                )}
                                {['cylinder', 'cone'].includes(shape) && (
                                    <>
                                        <input type="text" placeholder="Jari-jari Alas (r)" value={labels.radius || ''} onChange={(e) => handleLabelChange('radius', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi (t)" value={labels.height || ''} onChange={(e) => handleLabelChange('height', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        {shape === 'cone' && <input type="text" placeholder="Garis Pelukis (s)" value={labels.side || ''} onChange={(e) => handleLabelChange('side', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />}
                                    </>
                                )}
                                {shape === 'sphere' && (
                                    <input type="text" placeholder="Jari-jari (r)" value={labels.radius || ''} onChange={(e) => handleLabelChange('radius', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                )}
                                {['prism', 'pyramid'].includes(shape) && (
                                    <>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Banyak Sisi Alas:</span>
                                            <input type="number" min="3" max="20" placeholder={shape === 'prism' ? "3" : "4"} value={labels.nSides || ''} onChange={(e) => handleLabelChange('nSides', e.target.value)} className="w-16 px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        </div>
                                        <input type="text" placeholder="Panjang Sisi Alas" value={labels.side || ''} onChange={(e) => handleLabelChange('side', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder={shape === 'prism' ? "Tinggi Prisma" : "Tinggi Limas"} value={labels.height || ''} onChange={(e) => handleLabelChange('height', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                    </>
                                )}
                                {shape === 'house' && (
                                    <>
                                        <input type="text" placeholder="Lebar Alas (P.panjang)" value={labels.rectWidth || ''} onChange={(e) => handleLabelChange('rectWidth', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Persegi Panjang" value={labels.rectHeight || ''} onChange={(e) => handleLabelChange('rectHeight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Segitiga" value={labels.triHeight || ''} onChange={(e) => handleLabelChange('triHeight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Miring Segitiga" value={labels.triSide || ''} onChange={(e) => handleLabelChange('triSide', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                    </>
                                )}
                                {['capsule', 'capsule2', 'icecream'].includes(shape) && (
                                    <>
                                        <input type="text" placeholder="Jari-jari (r)" value={labels.radius || ''} onChange={(e) => handleLabelChange('radius', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Tabung/Kerucut (t)" value={labels.height || ''} onChange={(e) => handleLabelChange('height', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        {shape === 'icecream' && <input type="text" placeholder="Garis Pelukis (s)" value={labels.side || ''} onChange={(e) => handleLabelChange('side', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />}
                                    </>
                                )}
                                {shape === 'tube_cone' && (
                                    <>
                                        <input type="text" placeholder="Jari-jari Alas (r)" value={labels.radius || ''} onChange={(e) => handleLabelChange('radius', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Tabung" value={labels.tubeHeight || ''} onChange={(e) => handleLabelChange('tubeHeight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Kerucut" value={labels.coneHeight || ''} onChange={(e) => handleLabelChange('coneHeight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Garis Pelukis (s)" value={labels.coneSide || ''} onChange={(e) => handleLabelChange('coneSide', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                    </>
                                )}
                                {shape === 'cone_cone' && (
                                    <>
                                        <input type="text" placeholder="Jari-jari Alas Tengah (r)" value={labels.radius || ''} onChange={(e) => handleLabelChange('radius', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Kerucut Atas" value={labels.topHeight || ''} onChange={(e) => handleLabelChange('topHeight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Kerucut Bawah" value={labels.botHeight || ''} onChange={(e) => handleLabelChange('botHeight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="G. Pelukis Atas" value={labels.topSide || ''} onChange={(e) => handleLabelChange('topSide', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="G. Pelukis Bawah" value={labels.botSide || ''} onChange={(e) => handleLabelChange('botSide', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                    </>
                                )}
                                {shape === 'cube_pyramid' && (
                                    <>
                                        <input type="text" placeholder="Sisi Kubus" value={labels.side || ''} onChange={(e) => handleLabelChange('side', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Limas" value={labels.pyramidHeight || ''} onChange={(e) => handleLabelChange('pyramidHeight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Miring Limas" value={labels.pyramidSide || ''} onChange={(e) => handleLabelChange('pyramidSide', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                    </>
                                )}
                                {shape === 'block_pyramid' && (
                                    <>
                                        <input type="text" placeholder="Panjang Balok" value={labels.length || ''} onChange={(e) => handleLabelChange('length', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Lebar Balok" value={labels.width || ''} onChange={(e) => handleLabelChange('width', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Balok" value={labels.height || ''} onChange={(e) => handleLabelChange('height', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Limas" value={labels.pyramidHeight || ''} onChange={(e) => handleLabelChange('pyramidHeight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Sisi Miring Limas" value={labels.pyramidSide || ''} onChange={(e) => handleLabelChange('pyramidSide', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                    </>
                                )}
                                {shape === 'block_roof' && (
                                    <>
                                        <input type="text" placeholder="Panjang Balok" value={labels.length || ''} onChange={(e) => handleLabelChange('length', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Lebar Balok" value={labels.width || ''} onChange={(e) => handleLabelChange('width', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Balok" value={labels.height || ''} onChange={(e) => handleLabelChange('height', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Atap Prisma" value={labels.roofHeight || ''} onChange={(e) => handleLabelChange('roofHeight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                    </>
                                )}
                                {shape === 'tube_tubes' && (
                                    <>
                                        <input type="text" placeholder="Jari-jari Bawah (R)" value={labels.radius1 || ''} onChange={(e) => handleLabelChange('radius1', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Tabung Bawah" value={labels.height1 || ''} onChange={(e) => handleLabelChange('height1', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Jari-jari Atas (r)" value={labels.radius2 || ''} onChange={(e) => handleLabelChange('radius2', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Tabung Atas" value={labels.height2 || ''} onChange={(e) => handleLabelChange('height2', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                    </>
                                )}
                                {shape === 'tube_sphere' && (
                                    <>
                                        <input type="text" placeholder="Jari-jari Bola & Tabung" value={labels.radius || ''} onChange={(e) => handleLabelChange('radius', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                        <input type="text" placeholder="Tinggi Tabung" value={labels.tubeHeight || ''} onChange={(e) => handleLabelChange('tubeHeight', e.target.value)} className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400" />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col">
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Pratinjau</label>
                        <div 
                            className="flex-1 bg-white border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-lg flex items-center justify-center p-4 min-h-[250px]"
                            dangerouslySetInnerHTML={{ __html: generateGeometrySVG(shape, labels, fillColor, strokeColor, showAngles, simulate, showLines) }}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2 bg-gray-50 dark:bg-slate-800/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Batal</button>
                    <button onClick={handleInsert} className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">Sisipkan ke Editor</button>
                </div>
            </div>
        </div>
    );
};
