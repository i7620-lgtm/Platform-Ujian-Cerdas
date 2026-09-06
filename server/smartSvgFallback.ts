/**
 * Smart Offline Educational SVG Generator for Server & Client.
 * Provides resilient, zero-quota vector graphic diagrams for Indonesian educational curriculum.
 * Guarantees questions and diagram modals never fail even during AI rate limits (429) or high demand (503).
 */

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(str: string, maxLen: number): string {
  if (!str) return "";
  return str.length > maxLen ? str.slice(0, maxLen - 3) + "..." : str;
}

export function generateContextualEducationalSvg(prompt: string, style?: string): string {
  const p = (prompt || "").toLowerCase();

  if (p.includes("rantai makanan") || p.includes("jaring-jaring makanan") || (p.includes("ekosistem") && (p.includes("konsumen") || p.includes("produsen")))) {
    return createFoodChainSvg(prompt);
  }

  if (p.includes("daur air") || p.includes("siklus air") || p.includes("hidrologi") || p.includes("evaporasi") || p.includes("presipitasi")) {
    return createWaterCycleSvg(prompt);
  }

  if (p.includes("fotosintesis") || (p.includes("tumbuhan") && p.includes("klorofil"))) {
    return createPhotosynthesisSvg(prompt);
  }

  if (p.includes("tata surya") || p.includes("planet") || p.includes("orbit") || p.includes("galaksi") || p.includes("matahari")) {
    return createSolarSystemSvg(prompt);
  }

  if (p.includes("sel hewan") || p.includes("sel tumbuhan") || p.includes("struktur sel") || p.includes("nukleus")) {
    return createCellStructureSvg(prompt);
  }

  if (p.includes("rangkaian listrik") || (p.includes("seri") && p.includes("paralel")) || p.includes("sakelar") || p.includes("arus listrik")) {
    return createElectricCircuitSvg(prompt);
  }

  if (p.includes("wujud zat") || p.includes("mencair") || p.includes("membeku") || p.includes("menguap") || p.includes("mengembun") || p.includes("menyublim")) {
    return createStateOfMatterSvg(prompt);
  }

  if (p.includes("peredaran darah") || p.includes("jantung") || p.includes("bilik") || p.includes("serambi") || p.includes("arteri")) {
    return createCirculatorySystemSvg(prompt);
  }

  if (p.includes("metamorfosis") || p.includes("daur hidup") || p.includes("kupu-kupu") || p.includes("katak")) {
    return createMetamorphosisSvg(prompt);
  }

  if (style === "flowchart" || p.includes("alur") || p.includes("tahap") || p.includes("langkah") || p.includes("proses")) {
    return createFlowchartSvg(prompt);
  }

  // Universal High-Quality Educational Infographic
  return createGenericInfographicSvg(prompt);
}

// 1. Rantai Makanan (Food Chain)
function createFoodChainSvg(prompt: string): string {
  return `<svg viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#ffffff" rx="16" />
  
  <!-- Header -->
  <rect x="40" y="30" width="770" height="70" rx="12" fill="#f0fdf4" stroke="#86efac" stroke-width="1.5" />
  <circle cx="75" cy="65" r="22" fill="#16a34a" />
  <text x="75" y="72" font-family="system-ui, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">🌿</text>
  <text x="115" y="58" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#15803d" letter-spacing="1">DIAGRAM SAINS &amp; BIOLOGI EKOSISTEM</text>
  <text x="115" y="82" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#14532d">Aliran Energi Rantai Makanan</text>

  <!-- Level 1: Produsen -->
  <g id="produsen">
    <rect x="50" y="140" width="160" height="240" rx="12" fill="#ecfdf5" stroke="#34d399" stroke-width="2" />
    <rect x="65" y="155" width="130" height="28" rx="6" fill="#10b981" />
    <text x="130" y="174" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">PRODUSEN</text>
    <circle cx="130" cy="235" r="38" fill="#d1fae5" stroke="#10b981" stroke-width="2" />
    <text x="130" y="248" font-family="system-ui, sans-serif" font-size="34" text-anchor="middle">🌾</text>
    <text x="130" y="300" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="#065f46" text-anchor="middle">Padi / Tumbuhan</text>
    <text x="130" y="322" font-family="system-ui, sans-serif" font-size="11" fill="#047857" text-anchor="middle">Fotosintesis</text>
    <text x="130" y="340" font-family="system-ui, sans-serif" font-size="11" fill="#047857" text-anchor="middle">Menghasilkan Glukosa</text>
    <rect x="65" y="354" width="130" height="18" rx="4" fill="#a7f3d0" />
    <text x="130" y="367" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#065f46" text-anchor="middle">Tingkat Trofik I</text>
  </g>

  <!-- Arrow 1 -->
  <path d="M 215 260 L 245 260" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
  <polygon points="255,260 243,253 243,267" fill="#f59e0b" />
  <text x="235" y="248" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#b45309" text-anchor="middle">Dimakan</text>

  <!-- Level 2: Konsumen I -->
  <g id="konsumen1">
    <rect x="260" y="140" width="160" height="240" rx="12" fill="#fffbeb" stroke="#fcd34d" stroke-width="2" />
    <rect x="275" y="155" width="130" height="28" rx="6" fill="#f59e0b" />
    <text x="340" y="174" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">KONSUMEN I</text>
    <circle cx="340" cy="235" r="38" fill="#fef3c7" stroke="#f59e0b" stroke-width="2" />
    <text x="340" y="248" font-family="system-ui, sans-serif" font-size="34" text-anchor="middle">🦗</text>
    <text x="340" y="300" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="#92400e" text-anchor="middle">Belalang / Herbivora</text>
    <text x="340" y="322" font-family="system-ui, sans-serif" font-size="11" fill="#b45309" text-anchor="middle">Pemakan Produsen</text>
    <text x="340" y="340" font-family="system-ui, sans-serif" font-size="11" fill="#b45309" text-anchor="middle">Energi Primer</text>
    <rect x="275" y="354" width="130" height="18" rx="4" fill="#fde68a" />
    <text x="340" y="367" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#78350f" text-anchor="middle">Tingkat Trofik II</text>
  </g>

  <!-- Arrow 2 -->
  <path d="M 425 260 L 455 260" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
  <polygon points="465,260 453,253 453,267" fill="#f59e0b" />
  <text x="445" y="248" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#b45309" text-anchor="middle">Dimakan</text>

  <!-- Level 3: Konsumen II -->
  <g id="konsumen2">
    <rect x="470" y="140" width="160" height="240" rx="12" fill="#eff6ff" stroke="#93c5fd" stroke-width="2" />
    <rect x="485" y="155" width="130" height="28" rx="6" fill="#3b82f6" />
    <text x="550" y="174" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">KONSUMEN II</text>
    <circle cx="550" cy="235" r="38" fill="#dbeafe" stroke="#3b82f6" stroke-width="2" />
    <text x="550" y="248" font-family="system-ui, sans-serif" font-size="34" text-anchor="middle">🐸</text>
    <text x="550" y="300" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="#1e40af" text-anchor="middle">Katak / Karnivora</text>
    <text x="550" y="322" font-family="system-ui, sans-serif" font-size="11" fill="#2563eb" text-anchor="middle">Pemakan Herbivora</text>
    <text x="550" y="340" font-family="system-ui, sans-serif" font-size="11" fill="#2563eb" text-anchor="middle">Konsumen Sekunder</text>
    <rect x="485" y="354" width="130" height="18" rx="4" fill="#bfdbfe" />
    <text x="550" y="367" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#1e3a8a" text-anchor="middle">Tingkat Trofik III</text>
  </g>

  <!-- Arrow 3 -->
  <path d="M 635 260 L 665 260" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
  <polygon points="675,260 663,253 663,267" fill="#f59e0b" />
  <text x="655" y="248" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#b45309" text-anchor="middle">Dimakan</text>

  <!-- Level 4: Puncak & Pengurai -->
  <g id="puncak">
    <rect x="680" y="140" width="130" height="240" rx="12" fill="#fdf2f8" stroke="#f472b6" stroke-width="2" />
    <rect x="690" y="155" width="110" height="28" rx="6" fill="#e11d48" />
    <text x="745" y="174" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle">KONSUMEN III</text>
    <circle cx="745" cy="235" r="34" fill="#ffe4e6" stroke="#e11d48" stroke-width="2" />
    <text x="745" y="248" font-family="system-ui, sans-serif" font-size="30" text-anchor="middle">🦅</text>
    <text x="745" y="298" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#9f1239" text-anchor="middle">Elang (Puncak)</text>
    <text x="745" y="318" font-family="system-ui, sans-serif" font-size="11" fill="#be123c" text-anchor="middle">Karnivora Akhir</text>
    <rect x="690" y="340" width="110" height="32" rx="4" fill="#f3e8ff" stroke="#c084fc" stroke-width="1" />
    <text x="745" y="354" font-family="system-ui, sans-serif" font-size="9" font-weight="800" fill="#7e22ce" text-anchor="middle">DEKOMPOSER 🍄</text>
    <text x="745" y="367" font-family="system-ui, sans-serif" font-size="9" fill="#6b21a8" text-anchor="middle">Bakteri / Jamur Tanah</text>
  </g>

  <!-- Bottom Summary Banner -->
  <g id="kesimpulan">
    <rect x="40" y="410" width="770" height="115" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
    <circle cx="72" cy="445" r="16" fill="#3b82f6" />
    <text x="72" y="451" font-family="system-ui, sans-serif" font-size="16" fill="#ffffff" text-anchor="middle">💡</text>
    <text x="100" y="442" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#1e293b">KONSEP KUNCI ALIRAN ENERGI EKOSISTEM</text>
    <text x="100" y="465" font-family="system-ui, sans-serif" font-size="12" fill="#475569">
      <tspan x="100" dy="0">• Energi berpindah searah dari Produsen menuju Konsumen Puncak dan berakhir pada Dekomposer.</tspan>
      <tspan x="100" dy="18">• Jika populasi salah satu tingkatan terganggu (misal Katak berkurang), populasi Belalang akan melonjak pesat.</tspan>
      <tspan x="100" dy="18">• Dekomposer menguraikan sisa organisme mati menjadi unsur hara penyubur tanah bagi produsen kembali.</tspan>
    </text>
  </g>
</svg>`;
}

// 2. Daur Air (Water Cycle)
function createWaterCycleSvg(prompt: string): string {
  return `<svg viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#ffffff" rx="16" />
  
  <!-- Header -->
  <rect x="40" y="25" width="770" height="65" rx="12" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1.5" />
  <circle cx="75" cy="57" r="20" fill="#0284c7" />
  <text x="75" y="64" font-family="system-ui, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">💧</text>
  <text x="115" y="50" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#0369a1" letter-spacing="1">SIKLUS HIDROLOGI BUMI</text>
  <text x="115" y="73" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#0c4a6e">Tahapan Lengkap Daur Air Alami</text>

  <!-- Landscape Vector -->
  <!-- Sun -->
  <circle cx="120" cy="150" r="35" fill="#facc15" stroke="#eab308" stroke-width="3" />
  <text x="120" y="158" font-family="system-ui, sans-serif" font-size="28" text-anchor="middle">☀️</text>
  <text x="120" y="202" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#854d0e" text-anchor="middle">Panas Matahari</text>

  <!-- Ocean / Water Body -->
  <path d="M 40 370 Q 200 350, 420 380 L 420 440 L 40 440 Z" fill="#38bdf8" opacity="0.8" />
  <text x="160" y="415" font-family="system-ui, sans-serif" font-size="16" font-weight="800" fill="#0369a1">Laut / Danau (Perairan)</text>

  <!-- Mountain -->
  <polygon points="460,440 620,220 780,440" fill="#94a3b8" />
  <polygon points="575,280 620,220 665,280" fill="#e2e8f0" />
  <text x="620" y="320" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#334155" text-anchor="middle">Pegunungan</text>

  <!-- Clouds (Kondensasi) -->
  <g id="awan-kondensasi">
    <ellipse cx="380" cy="150" rx="55" ry="28" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2" />
    <ellipse cx="420" cy="140" rx="45" ry="25" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2" />
    <rect x="330" y="105" width="140" height="26" rx="6" fill="#0284c7" />
    <text x="400" y="123" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle">2. KONDENSASI</text>
    <text x="400" y="195" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#0369a1" text-anchor="middle">Uap Air Membentuk Awan</text>
  </g>

  <!-- Rain Clouds (Presipitasi) -->
  <g id="awan-presipitasi">
    <ellipse cx="620" cy="160" rx="60" ry="30" fill="#94a3b8" opacity="0.6" />
    <rect x="550" y="110" width="140" height="26" rx="6" fill="#1e293b" />
    <text x="620" y="128" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle">3. PRESIPITASI</text>
    <!-- Rain drops -->
    <line x1="580" y1="200" x2="575" y2="225" stroke="#0284c7" stroke-width="3" stroke-dasharray="4 3" />
    <line x1="610" y1="200" x2="605" y2="225" stroke="#0284c7" stroke-width="3" stroke-dasharray="4 3" />
    <line x1="640" y1="200" x2="635" y2="225" stroke="#0284c7" stroke-width="3" stroke-dasharray="4 3" />
    <text x="620" y="240" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#0f172a" text-anchor="middle">Turun Hujan 🌧️</text>
  </g>

  <!-- Arrow Evaporasi -->
  <path d="M 180 360 C 200 280, 260 220, 320 180" stroke="#f59e0b" stroke-width="3.5" fill="none" stroke-dasharray="6 4" />
  <polygon points="325,175 315,185 312,172" fill="#f59e0b" />
  <rect x="190" y="270" width="125" height="42" rx="6" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5" />
  <text x="252" y="288" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#b45309" text-anchor="middle">1. EVAPORASI</text>
  <text x="252" y="304" font-family="system-ui, sans-serif" font-size="9" fill="#92400e" text-anchor="middle">Penguapan Air Laut</text>

  <!-- Infiltrasi & Aliran Permukaan -->
  <path d="M 680 370 C 620 400, 520 420, 420 405" stroke="#0284c7" stroke-width="3.5" fill="none" />
  <polygon points="415,405 425,398 425,412" fill="#0284c7" />
  <rect x="490" y="380" width="130" height="40" rx="6" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.5" />
  <text x="555" y="397" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#15803d" text-anchor="middle">4. INFILTRASI</text>
  <text x="555" y="412" font-family="system-ui, sans-serif" font-size="9" fill="#166534" text-anchor="middle">Resapan &amp; Aliran Air</text>

  <!-- Summary Box -->
  <rect x="40" y="455" width="770" height="85" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
  <text x="60" y="480" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#0f172a">KESIMPULAN SIKLUS AIR:</text>
  <text x="60" y="502" font-family="system-ui, sans-serif" font-size="11.5" fill="#475569">
    <tspan x="60" dy="0">• Air di bumi memiliki jumlah yang tetap dan terus bersirkulasi melalui proses penguapan dan pengembunan.</tspan>
    <tspan x="60" dy="18">• Hutan dan tutupan hijau di lereng pegunungan memegang peran penting mempercepat infiltrasi air tanah.</tspan>
  </text>
</svg>`;
}

// 3. Fotosintesis (Photosynthesis)
function createPhotosynthesisSvg(prompt: string): string {
  return `<svg viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#ffffff" rx="16" />
  
  <!-- Header -->
  <rect x="40" y="25" width="770" height="65" rx="12" fill="#f0fdf4" stroke="#86efac" stroke-width="1.5" />
  <circle cx="75" cy="57" r="20" fill="#16a34a" />
  <text x="75" y="64" font-family="system-ui, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">🍃</text>
  <text x="115" y="50" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#15803d" letter-spacing="1">PROSES BIOLOGI TUMBUHAN</text>
  <text x="115" y="73" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#14532d">Mekanisme Fotosintesis pada Daun</text>

  <!-- Big Green Leaf in Center -->
  <path d="M 280 280 C 280 160, 520 150, 580 270 C 620 370, 400 400, 280 280 Z" fill="#22c55e" stroke="#15803d" stroke-width="4" />
  <!-- Leaf Veins -->
  <path d="M 280 280 Q 420 275, 580 270" stroke="#166534" stroke-width="3" fill="none" />
  <path d="M 360 278 Q 400 230, 440 210" stroke="#166534" stroke-width="2" fill="none" />
  <path d="M 450 276 Q 490 235, 530 220" stroke="#166534" stroke-width="2" fill="none" />
  <path d="M 370 279 Q 410 320, 440 340" stroke="#166534" stroke-width="2" fill="none" />
  <text x="440" y="275" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="middle">KLOROFIL (Zat Hijau Daun)</text>

  <!-- Input 1: Cahaya Matahari -->
  <circle cx="120" cy="150" r="30" fill="#facc15" stroke="#eab308" stroke-width="2" />
  <text x="120" y="157" font-family="system-ui, sans-serif" font-size="24" text-anchor="middle">☀️</text>
  <path d="M 160 170 L 320 220" stroke="#eab308" stroke-width="4" stroke-linecap="round" />
  <polygon points="330,223 318,214 316,227" fill="#eab308" />
  <rect x="180" y="145" width="130" height="30" rx="6" fill="#fef9c3" stroke="#facc15" stroke-width="1.5" />
  <text x="245" y="165" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#854d0e" text-anchor="middle">Cahaya Matahari</text>

  <!-- Input 2: Karbon Dioksida (CO2) -->
  <path d="M 120 300 L 260 290" stroke="#64748b" stroke-width="4" stroke-linecap="round" />
  <polygon points="270,289 258,283 258,296" fill="#64748b" />
  <rect x="70" y="275" width="140" height="46" rx="8" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5" />
  <text x="140" y="295" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#1e293b" text-anchor="middle">Karbon Dioksida</text>
  <text x="140" y="312" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#475569" text-anchor="middle">(CO₂ dari udara)</text>

  <!-- Input 3: Air (H2O) -->
  <path d="M 280 430 L 340 340" stroke="#0284c7" stroke-width="4" stroke-linecap="round" />
  <polygon points="345,332 334,338 344,347" fill="#0284c7" />
  <rect x="190" y="425" width="140" height="46" rx="8" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5" />
  <text x="260" y="445" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#0369a1" text-anchor="middle">Air &amp; Mineral</text>
  <text x="260" y="462" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#0284c7" text-anchor="middle">(H₂O dari akar)</text>

  <!-- Output 1: Oksigen (O2) -->
  <path d="M 540 220 L 680 170" stroke="#10b981" stroke-width="4" stroke-linecap="round" />
  <polygon points="690,166 677,165 682,177" fill="#10b981" />
  <rect x="650" y="130" width="150" height="46" rx="8" fill="#ecfdf5" stroke="#34d399" stroke-width="2" />
  <text x="725" y="150" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#065f46" text-anchor="middle">Oksigen (O₂) 💨</text>
  <text x="725" y="167" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#047857" text-anchor="middle">Dilepas ke atmosfer</text>

  <!-- Output 2: Glukosa (Energi) -->
  <path d="M 560 320 L 670 360" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
  <polygon points="680,364 670,354 666,366" fill="#f59e0b" />
  <rect x="640" y="340" width="160" height="46" rx="8" fill="#fffbeb" stroke="#fcd34d" stroke-width="2" />
  <text x="720" y="360" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#92400e" text-anchor="middle">Glukosa (C₆H₁₂O₆) 🍎</text>
  <text x="720" y="377" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#b45309" text-anchor="middle">Cadangan makanan</text>

  <!-- Chemical Equation Footer -->
  <rect x="40" y="480" width="770" height="60" rx="10" fill="#0f172a" />
  <text x="425" y="505" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#94a3b8" text-anchor="middle">PERSAMAAN REAKSI KIMIA FOTOSINTESIS:</text>
  <text x="425" y="525" font-family="monospace, sans-serif" font-size="14" font-weight="800" fill="#4ade80" text-anchor="middle">6 CO₂ + 6 H₂O  +  [Cahaya &amp; Klorofil]  ➔  C₆H₁₂O₆  +  6 O₂</text>
</svg>`;
}

// 4. Tata Surya (Solar System)
function createSolarSystemSvg(prompt: string): string {
  return `<svg viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <!-- Deep Space Background -->
  <rect width="100%" height="100%" fill="#090d16" rx="16" />
  
  <!-- Header Banner -->
  <rect x="40" y="25" width="770" height="60" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
  <text x="65" y="50" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#38bdf8" letter-spacing="1">ASTRONOMI &amp; FISIKA BUMI</text>
  <text x="65" y="72" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#f8fafc">Urutan Planet dalam Tata Surya (Berdasarkan Jarak dari Matahari)</text>

  <!-- The Sun on Left Edge -->
  <circle cx="20" cy="270" r="110" fill="#f59e0b" stroke="#fde047" stroke-width="6" />
  <text x="60" y="278" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#78350f">MATAHARI</text>

  <!-- Orbits & Planets -->
  <!-- 1. Merkurius -->
  <circle cx="160" cy="270" r="10" fill="#94a3b8" />
  <text x="160" y="300" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#cbd5e1" text-anchor="middle">1. Merkurius</text>
  <text x="160" y="315" font-family="system-ui, sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">Terkecil</text>

  <!-- 2. Venus -->
  <circle cx="225" cy="270" r="16" fill="#fb923c" />
  <text x="225" y="306" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#fed7aa" text-anchor="middle">2. Venus</text>
  <text x="225" y="321" font-family="system-ui, sans-serif" font-size="9" fill="#fdba74" text-anchor="middle">Terpanas</text>

  <!-- 3. Bumi -->
  <circle cx="300" cy="270" r="17" fill="#38bdf8" stroke="#22c55e" stroke-width="3" />
  <text x="300" y="308" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#7dd3fc" text-anchor="middle">3. Bumi 🌍</text>
  <text x="300" y="323" font-family="system-ui, sans-serif" font-size="9" fill="#bae6fd" text-anchor="middle">Kehidupan</text>

  <!-- 4. Mars -->
  <circle cx="375" cy="270" r="13" fill="#ef4444" />
  <text x="375" y="302" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#fca5a5" text-anchor="middle">4. Mars</text>
  <text x="375" y="317" font-family="system-ui, sans-serif" font-size="9" fill="#f87171" text-anchor="middle">Planet Merah</text>

  <!-- Asteroid Belt Line -->
  <line x1="420" y1="140" x2="420" y2="400" stroke="#475569" stroke-width="2" stroke-dasharray="3 5" />
  <text x="420" y="130" font-family="system-ui, sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">Sabuk Asteroid</text>

  <!-- 5. Jupiter -->
  <circle cx="490" cy="270" r="36" fill="#d97706" stroke="#fbbf24" stroke-width="2" />
  <text x="490" y="326" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#fde68a" text-anchor="middle">5. Jupiter</text>
  <text x="490" y="342" font-family="system-ui, sans-serif" font-size="9" fill="#fcd34d" text-anchor="middle">Terbesar</text>

  <!-- 6. Saturnus -->
  <ellipse cx="600" cy="270" rx="42" ry="12" fill="none" stroke="#fcd34d" stroke-width="4" transform="rotate(-15 600 270)" />
  <circle cx="600" cy="270" r="26" fill="#ca8a04" />
  <text x="600" y="320" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#fef08a" text-anchor="middle">6. Saturnus</text>
  <text x="600" y="336" font-family="system-ui, sans-serif" font-size="9" fill="#fef9c3" text-anchor="middle">Cincin Indah</text>

  <!-- 7. Uranus -->
  <circle cx="700" cy="270" r="20" fill="#2dd4bf" />
  <text x="700" y="312" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#99f6e4" text-anchor="middle">7. Uranus</text>
  <text x="700" y="327" font-family="system-ui, sans-serif" font-size="9" fill="#5eead4" text-anchor="middle">Rotasi Miring</text>

  <!-- 8. Neptunus -->
  <circle cx="780" cy="270" r="18" fill="#3b82f6" />
  <text x="780" y="310" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#93c5fd" text-anchor="middle">8. Neptunus</text>
  <text x="780" y="325" font-family="system-ui, sans-serif" font-size="9" fill="#60a5fa" text-anchor="middle">Terjauh / Dingin</text>

  <!-- Classification Footer -->
  <rect x="40" y="440" width="770" height="90" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
  <text x="60" y="468" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#38bdf8">PENGELOMPOKAN PLANET:</text>
  <text x="60" y="492" font-family="system-ui, sans-serif" font-size="11" fill="#cbd5e1">
    <tspan x="60" dy="0">• Planet Dalam (Kebumian/Terestrial): Merkurius, Venus, Bumi, Mars (berpermukaan batuan padat).</tspan>
    <tspan x="60" dy="18">• Planet Luar (Raksasa Gas): Jupiter, Saturnus, Uranus, Neptunus (berukuran besar tersusun dari gas).</tspan>
  </text>
</svg>`;
}

// 5. Struktur Sel (Cell Structure)
function createCellStructureSvg(prompt: string): string {
  return `<svg viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#ffffff" rx="16" />
  
  <!-- Header -->
  <rect x="40" y="25" width="770" height="65" rx="12" fill="#faf5ff" stroke="#e9d5ff" stroke-width="1.5" />
  <circle cx="75" cy="57" r="20" fill="#9333ea" />
  <text x="75" y="64" font-family="system-ui, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">🔬</text>
  <text x="115" y="50" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#7e22ce" letter-spacing="1">BIOLOGI SELULER</text>
  <text x="115" y="73" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#581c87">Struktur Organel Utama Sel</text>

  <!-- Big Cell Body -->
  <rect x="80" y="120" width="380" height="300" rx="40" fill="#f0fdf4" stroke="#22c55e" stroke-width="6" />
  <rect x="90" y="130" width="360" height="280" rx="32" fill="#dcfce7" stroke="#86efac" stroke-width="3" />
  <text x="110" y="160" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#166534">Sitoplasma</text>

  <!-- Nucleus (Inti Sel) -->
  <circle cx="270" cy="270" r="55" fill="#f3e8ff" stroke="#a855f7" stroke-width="4" />
  <circle cx="270" cy="270" r="25" fill="#c084fc" />
  <text x="270" y="276" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">Nukleus</text>

  <!-- Mitochondria -->
  <ellipse cx="170" cy="210" rx="30" ry="16" fill="#fed7aa" stroke="#f97316" stroke-width="2" transform="rotate(-20 170 210)" />
  <ellipse cx="370" cy="330" rx="30" ry="16" fill="#fed7aa" stroke="#f97316" stroke-width="2" transform="rotate(30 370 330)" />

  <!-- Chloroplast / Vacuole -->
  <ellipse cx="180" cy="330" rx="45" ry="25" fill="#bae6fd" stroke="#0284c7" stroke-width="2" />
  <text x="180" y="335" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#0369a1" text-anchor="middle">Vakuola</text>

  <!-- Labels on the Right -->
  <g id="organel-labels">
    <!-- Label 1: Dinding & Membran Sel -->
    <line x1="80" y1="180" x2="520" y2="150" stroke="#16a34a" stroke-width="2" stroke-dasharray="4 2" />
    <rect x="520" y="130" width="280" height="48" rx="8" fill="#ecfdf5" stroke="#34d399" stroke-width="1.5" />
    <text x="535" y="150" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#065f46">1. Dinding &amp; Membran Sel</text>
    <text x="535" y="166" font-family="system-ui, sans-serif" font-size="10.5" fill="#047857">Pelindung &amp; pengatur transportasi zat</text>

    <!-- Label 2: Nukleus (Inti Sel) -->
    <line x1="325" y1="270" x2="520" y2="220" stroke="#a855f7" stroke-width="2" stroke-dasharray="4 2" />
    <rect x="520" y="200" width="280" height="48" rx="8" fill="#f5f3ff" stroke="#c4b5fd" stroke-width="1.5" />
    <text x="535" y="220" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#5b21b6">2. Nukleus (Inti Sel)</text>
    <text x="535" y="236" font-family="system-ui, sans-serif" font-size="10.5" fill="#6d28d9">Pusat kendali aktivitas &amp; materi genetik (DNA)</text>

    <!-- Label 3: Mitokondria -->
    <line x1="200" y1="210" x2="520" y2="290" stroke="#f97316" stroke-width="2" stroke-dasharray="4 2" />
    <rect x="520" y="270" width="280" height="48" rx="8" fill="#fff7ed" stroke="#fdba74" stroke-width="1.5" />
    <text x="535" y="290" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#9a3412">3. Mitokondria</text>
    <text x="535" y="306" font-family="system-ui, sans-serif" font-size="10.5" fill="#c2410c">Pusat respirasi seluler &amp; penghasil energi (ATP)</text>

    <!-- Label 4: Vakuola / Kloroplas -->
    <line x1="225" y1="335" x2="520" y2="360" stroke="#0284c7" stroke-width="2" stroke-dasharray="4 2" />
    <rect x="520" y="340" width="280" height="48" rx="8" fill="#f0f9ff" stroke="#7dd3fc" stroke-width="1.5" />
    <text x="535" y="360" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#0369a1">4. Vakuola &amp; Kloroplas</text>
    <text x="535" y="376" font-family="system-ui, sans-serif" font-size="10.5" fill="#0284c7">Penyimpan cadangan makanan &amp; tempat fotosintesis</text>
  </g>

  <!-- Summary Box -->
  <rect x="40" y="445" width="770" height="95" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
  <text x="60" y="472" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#0f172a">PERBEDAAN SEL HEWAN DAN TUMBUHAN:</text>
  <text x="60" y="494" font-family="system-ui, sans-serif" font-size="11" fill="#475569">
    <tspan x="60" dy="0">• Sel Tumbuhan memiliki dinding sel kaku dan kloroplas untuk fotosintesis.</tspan>
    <tspan x="60" dy="18">• Sel Hewan tidak memiliki dinding sel dan kloroplas, namun memiliki sentriol.</tspan>
  </text>
</svg>`;
}

// 6. Rangkaian Listrik (Electric Circuit)
function createElectricCircuitSvg(prompt: string): string {
  return `<svg viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#ffffff" rx="16" />
  
  <!-- Header -->
  <rect x="40" y="25" width="770" height="65" rx="12" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5" />
  <circle cx="75" cy="57" r="20" fill="#2563eb" />
  <text x="75" y="64" font-family="system-ui, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">⚡</text>
  <text x="115" y="50" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#1d4ed8" letter-spacing="1">FISIKA &amp; TEKNOLOGI</text>
  <text x="115" y="73" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#1e3a8a">Perbandingan Rangkaian Listrik Seri dan Paralel</text>

  <!-- Circuit 1: Seri (Left) -->
  <g id="rangkaian-seri">
    <rect x="50" y="110" width="360" height="300" rx="12" fill="#f8fafc" stroke="#94a3b8" stroke-width="2" />
    <rect x="70" y="125" width="160" height="28" rx="6" fill="#3b82f6" />
    <text x="150" y="144" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">RANGKAIAN SERI</text>

    <!-- Circuit Wire Loop -->
    <rect x="100" y="180" width="260" height="170" rx="12" fill="none" stroke="#2563eb" stroke-width="4" />
    
    <!-- Battery at Top -->
    <rect x="200" y="172" width="60" height="16" rx="4" fill="#ef4444" />
    <text x="190" y="185" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#ef4444">+</text>
    <text x="270" y="185" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#1e293b">-</text>
    <text x="230" y="165" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#64748b" text-anchor="middle">Baterai (Sumber Listrik)</text>

    <!-- Bulbs along the bottom wire -->
    <!-- Lamp 1 -->
    <circle cx="160" cy="350" r="18" fill="#fef08a" stroke="#ca8a04" stroke-width="2" />
    <text x="160" y="356" font-family="system-ui, sans-serif" font-size="16" text-anchor="middle">💡</text>
    <text x="160" y="385" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#854d0e" text-anchor="middle">Lampu A</text>

    <!-- Lamp 2 -->
    <circle cx="280" cy="350" r="18" fill="#fef08a" stroke="#ca8a04" stroke-width="2" />
    <text x="280" y="356" font-family="system-ui, sans-serif" font-size="16" text-anchor="middle">💡</text>
    <text x="280" y="385" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#854d0e" text-anchor="middle">Lampu B</text>

    <!-- Characteristic Note -->
    <text x="230" y="270" font-family="system-ui, sans-serif" font-size="11" fill="#475569" text-anchor="middle">Satu jalur kabel tunggal.</text>
    <text x="230" y="288" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#dc2626" text-anchor="middle">Jika 1 lampu putus, semua padam!</text>
  </g>

  <!-- Circuit 2: Paralel (Right) -->
  <g id="rangkaian-paralel">
    <rect x="440" y="110" width="360" height="300" rx="12" fill="#f8fafc" stroke="#94a3b8" stroke-width="2" />
    <rect x="460" y="125" width="160" height="28" rx="6" fill="#10b981" />
    <text x="540" y="144" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">RANGKAIAN PARALEL</text>

    <!-- Outer Loop -->
    <rect x="490" y="180" width="260" height="170" rx="12" fill="none" stroke="#059669" stroke-width="4" />
    <!-- Battery at Top -->
    <rect x="590" y="172" width="60" height="16" rx="4" fill="#ef4444" />
    <text x="580" y="185" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#ef4444">+</text>
    <text x="660" y="185" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#1e293b">-</text>
    
    <!-- Branch Wire in Middle -->
    <line x1="490" y1="265" x2="750" y2="265" stroke="#059669" stroke-width="4" />

    <!-- Branch 1 Lamp -->
    <circle cx="620" cy="265" r="18" fill="#fef08a" stroke="#ca8a04" stroke-width="2" />
    <text x="620" y="271" font-family="system-ui, sans-serif" font-size="16" text-anchor="middle">💡</text>
    <text x="620" y="245" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#854d0e" text-anchor="middle">Cabang 1: Lampu 1</text>

    <!-- Branch 2 Lamp -->
    <circle cx="620" cy="350" r="18" fill="#fef08a" stroke="#ca8a04" stroke-width="2" />
    <text x="620" y="356" font-family="system-ui, sans-serif" font-size="16" text-anchor="middle">💡</text>
    <text x="620" y="385" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#854d0e" text-anchor="middle">Cabang 2: Lampu 2</text>

    <!-- Characteristic Note -->
    <text x="620" y="315" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#15803d" text-anchor="middle">Jika 1 lampu padam, lampu lain tetap nyala!</text>
  </g>

  <!-- Summary Comparison Footer -->
  <rect x="40" y="430" width="770" height="105" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="60" y="455" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#1e293b">RINGKASAN PERBANDINGAN:</text>
  <text x="60" y="475" font-family="system-ui, sans-serif" font-size="11" fill="#475569">
    <tspan x="60" dy="0">• Rangkaian Seri: Arus listrik sama besar di setiap beban, nyala lampu lebih redup, kabel hemat.</tspan>
    <tspan x="60" dy="18">• Rangkaian Paralel: Tegangan sama di setiap cabang, lampu menyala sama terang, dipakai di instalasi listrik rumah.</tspan>
  </text>
</svg>`;
}

// 7. Perubahan Wujud Zat (State of Matter)
function createStateOfMatterSvg(prompt: string): string {
  return `<svg viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#ffffff" rx="16" />
  
  <!-- Header -->
  <rect x="40" y="25" width="770" height="65" rx="12" fill="#fff7ed" stroke="#fed7aa" stroke-width="1.5" />
  <circle cx="75" cy="57" r="20" fill="#ea580c" />
  <text x="75" y="64" font-family="system-ui, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">🌡️</text>
  <text x="115" y="50" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#c2410c" letter-spacing="1">FISIKA ZAT &amp; KALOR</text>
  <text x="115" y="73" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#7c2d12">Segitiga Perubahan Wujud Benda</text>

  <!-- 3 States as Triangle Nodes -->
  <!-- 1. PADAT (Top) -->
  <g id="zat-padat">
    <circle cx="425" cy="150" r="48" fill="#ecfdf5" stroke="#10b981" stroke-width="3" />
    <text x="425" y="145" font-family="system-ui, sans-serif" font-size="26" text-anchor="middle">🧊</text>
    <text x="425" y="172" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#065f46" text-anchor="middle">PADAT</text>
  </g>

  <!-- 2. CAIR (Bottom Left) -->
  <g id="zat-cair">
    <circle cx="200" cy="380" r="48" fill="#eff6ff" stroke="#3b82f6" stroke-width="3" />
    <text x="200" y="375" font-family="system-ui, sans-serif" font-size="26" text-anchor="middle">💧</text>
    <text x="200" y="402" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#1e40af" text-anchor="middle">CAIR</text>
  </g>

  <!-- 3. GAS (Bottom Right) -->
  <g id="zat-gas">
    <circle cx="650" cy="380" r="48" fill="#faf5ff" stroke="#a855f7" stroke-width="3" />
    <text x="650" y="375" font-family="system-ui, sans-serif" font-size="26" text-anchor="middle">💨</text>
    <text x="650" y="402" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#6b21a8" text-anchor="middle">GAS</text>
  </g>

  <!-- Connecting Arrows with Process Badges -->
  <!-- Padat -> Cair (Mencair) -->
  <path d="M 380 170 L 250 330" stroke="#ef4444" stroke-width="3" />
  <rect x="270" y="225" width="90" height="24" rx="4" fill="#fee2e2" stroke="#ef4444" stroke-width="1" />
  <text x="315" y="241" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#b91c1c" text-anchor="middle">Mencair (+)</text>

  <!-- Cair -> Padat (Membeku) -->
  <path d="M 230 340 L 360 180" stroke="#3b82f6" stroke-width="3" stroke-dasharray="4 2" />
  <rect x="270" y="260" width="90" height="24" rx="4" fill="#dbeafe" stroke="#3b82f6" stroke-width="1" />
  <text x="315" y="276" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#1d4ed8" text-anchor="middle">Membeku (-)</text>

  <!-- Cair -> Gas (Menguap) -->
  <path d="M 250 380 L 600 380" stroke="#ef4444" stroke-width="3" />
  <rect x="380" y="355" width="90" height="24" rx="4" fill="#fee2e2" stroke="#ef4444" stroke-width="1" />
  <text x="425" y="371" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#b91c1c" text-anchor="middle">Menguap (+)</text>

  <!-- Gas -> Cair (Mengembun) -->
  <path d="M 600 405 L 250 405" stroke="#3b82f6" stroke-width="3" stroke-dasharray="4 2" />
  <rect x="380" y="415" width="90" height="24" rx="4" fill="#dbeafe" stroke="#3b82f6" stroke-width="1" />
  <text x="425" y="431" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#1d4ed8" text-anchor="middle">Mengembun (-)</text>

  <!-- Padat -> Gas (Menyublim) -->
  <path d="M 470 170 L 610 330" stroke="#ef4444" stroke-width="3" />
  <rect x="520" y="225" width="95" height="24" rx="4" fill="#fee2e2" stroke="#ef4444" stroke-width="1" />
  <text x="567" y="241" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#b91c1c" text-anchor="middle">Menyublim (+)</text>

  <!-- Gas -> Padat (Mengkristal/Deposisi) -->
  <path d="M 625 340 L 490 180" stroke="#3b82f6" stroke-width="3" stroke-dasharray="4 2" />
  <rect x="520" y="260" width="95" height="24" rx="4" fill="#dbeafe" stroke="#3b82f6" stroke-width="1" />
  <text x="567" y="276" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#1d4ed8" text-anchor="middle">Mengkristal (-)</text>

  <!-- Legend -->
  <rect x="40" y="485" width="770" height="55" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
  <text x="60" y="516" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#0f172a">KETERANGAN KALOR:</text>
  <text x="210" y="516" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#b91c1c">Panah Merah (+) = Memerlukan Kalor (Menyerap Panas)</text>
  <text x="530" y="516" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#1d4ed8">Panah Biru (-) = Melepaskan Kalor (Mendingin)</text>
</svg>`;
}

// 8. Sistem Peredaran Darah (Circulatory System)
function createCirculatorySystemSvg(prompt: string): string {
  return `<svg viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#ffffff" rx="16" />
  
  <!-- Header -->
  <rect x="40" y="25" width="770" height="65" rx="12" fill="#fff1f2" stroke="#fecdd3" stroke-width="1.5" />
  <circle cx="75" cy="57" r="20" fill="#e11d48" />
  <text x="75" y="64" font-family="system-ui, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">❤️</text>
  <text x="115" y="50" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#be123c" letter-spacing="1">ANATOMI &amp; FISIOLOGI MANUSIA</text>
  <text x="115" y="73" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#881337">Sistem Peredaran Darah Ganda (Kecil &amp; Besar)</text>

  <!-- Top Organ: Paru-paru -->
  <rect x="330" y="110" width="190" height="60" rx="12" fill="#e0f2fe" stroke="#0284c7" stroke-width="2" />
  <text x="425" y="135" font-family="system-ui, sans-serif" font-size="18" text-anchor="middle">🫁</text>
  <text x="425" y="155" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#0369a1" text-anchor="middle">PARU-PARU</text>

  <!-- Center Organ: Jantung 4 Ruang -->
  <rect x="310" y="220" width="230" height="150" rx="16" fill="#f8fafc" stroke="#e11d48" stroke-width="3" />
  <text x="425" y="242" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#881337" text-anchor="middle">JANTUNG (4 RUANG)</text>
  <line x1="310" y1="250" x2="540" y2="250" stroke="#fecdd3" stroke-width="2" />
  <line x1="425" y1="250" x2="425" y2="370" stroke="#fecdd3" stroke-width="2" />
  
  <!-- Serambi Kanan & Kiri -->
  <rect x="320" y="260" width="95" height="45" rx="6" fill="#dbeafe" />
  <text x="367" y="280" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#1e40af" text-anchor="middle">Serambi Kanan</text>
  <text x="367" y="295" font-family="system-ui, sans-serif" font-size="9" fill="#2563eb" text-anchor="middle">(Kaya CO₂)</text>

  <rect x="435" y="260" width="95" height="45" rx="6" fill="#fee2e2" />
  <text x="482" y="280" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#991b1b" text-anchor="middle">Serambi Kiri</text>
  <text x="482" y="295" font-family="system-ui, sans-serif" font-size="9" fill="#dc2626" text-anchor="middle">(Kaya O₂)</text>

  <!-- Bilik Kanan & Kiri -->
  <rect x="320" y="315" width="95" height="45" rx="6" fill="#dbeafe" />
  <text x="367" y="335" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#1e40af" text-anchor="middle">Bilik Kanan</text>
  <text x="367" y="350" font-family="system-ui, sans-serif" font-size="9" fill="#2563eb" text-anchor="middle">(Pompa ke Paru)</text>

  <rect x="435" y="315" width="95" height="45" rx="6" fill="#fee2e2" />
  <text x="482" y="335" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#991b1b" text-anchor="middle">Bilik Kiri</text>
  <text x="482" y="350" font-family="system-ui, sans-serif" font-size="9" fill="#dc2626" text-anchor="middle">(Pompa ke Tubuh)</text>

  <!-- Bottom Organ: Seluruh Tubuh -->
  <rect x="330" y="420" width="190" height="60" rx="12" fill="#f1f5f9" stroke="#64748b" stroke-width="2" />
  <text x="425" y="445" font-family="system-ui, sans-serif" font-size="18" text-anchor="middle">🧍</text>
  <text x="425" y="465" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#334155" text-anchor="middle">SELURUH TUBUH</text>

  <!-- Labels on Sides -->
  <rect x="50" y="190" width="220" height="80" rx="8" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.5" />
  <text x="160" y="215" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#1e40af" text-anchor="middle">PEREDARAN DARAH KECIL</text>
  <text x="160" y="235" font-family="system-ui, sans-serif" font-size="10.5" fill="#2563eb" text-anchor="middle">Bilik Kanan ➔ Arteri Pulmonalis ➔</text>
  <text x="160" y="252" font-family="system-ui, sans-serif" font-size="10.5" fill="#2563eb" text-anchor="middle">Paru-paru ➔ Vena Pulmonalis ➔ Serambi Kiri</text>

  <rect x="580" y="190" width="220" height="80" rx="8" fill="#fff1f2" stroke="#fca5a5" stroke-width="1.5" />
  <text x="690" y="215" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#991b1b" text-anchor="middle">PEREDARAN DARAH BESAR</text>
  <text x="690" y="235" font-family="system-ui, sans-serif" font-size="10.5" fill="#dc2626" text-anchor="middle">Bilik Kiri ➔ Aorta (Seluruh Tubuh) ➔</text>
  <text x="690" y="252" font-family="system-ui, sans-serif" font-size="10.5" fill="#dc2626" text-anchor="middle">Vena Cava ➔ Serambi Kanan</text>

  <!-- Footer Legend -->
  <rect x="40" y="495" width="770" height="45" rx="8" fill="#0f172a" />
  <text x="150" y="522" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#f87171">■ Darah Bersih (Kaya O₂): Dari Paru ke Tubuh</text>
  <text x="500" y="522" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#60a5fa">■ Darah Kotor (Kaya CO₂): Dari Tubuh ke Paru</text>
</svg>`;
}

// 9. Metamorfosis (Metamorphosis)
function createMetamorphosisSvg(prompt: string): string {
  return `<svg viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#ffffff" rx="16" />
  
  <!-- Header -->
  <rect x="40" y="25" width="770" height="65" rx="12" fill="#f0fdf4" stroke="#86efac" stroke-width="1.5" />
  <circle cx="75" cy="57" r="20" fill="#16a34a" />
  <text x="75" y="64" font-family="system-ui, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">🦋</text>
  <text x="115" y="50" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#15803d" letter-spacing="1">DAUR HIDUP HEWAN</text>
  <text x="115" y="73" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#14532d">Metamorfosis Sempurna Kupu-Kupu (4 Tahap)</text>

  <!-- Cycle Arrangement in 4 Quadrants -->
  <!-- 1. Telur (Top Left) -->
  <g id="tahap-telur">
    <circle cx="260" cy="180" r="50" fill="#fefce8" stroke="#facc15" stroke-width="3" />
    <text x="260" y="178" font-family="system-ui, sans-serif" font-size="28" text-anchor="middle">🥚</text>
    <rect x="205" y="240" width="110" height="24" rx="4" fill="#fef08a" />
    <text x="260" y="256" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#854d0e" text-anchor="middle">1. TELUR</text>
  </g>

  <!-- Arrow 1 -> 2 -->
  <path d="M 330 180 C 400 150, 450 150, 520 180" stroke="#16a34a" stroke-width="3.5" fill="none" />
  <polygon points="525,182 513,176 517,189" fill="#16a34a" />

  <!-- 2. Larva / Ulat (Top Right) -->
  <g id="tahap-larva">
    <circle cx="590" cy="180" r="50" fill="#ecfdf5" stroke="#10b981" stroke-width="3" />
    <text x="590" y="178" font-family="system-ui, sans-serif" font-size="28" text-anchor="middle">🐛</text>
    <rect x="535" y="240" width="110" height="24" rx="4" fill="#a7f3d0" />
    <text x="590" y="256" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#065f46" text-anchor="middle">2. LARVA (ULAT)</text>
  </g>

  <!-- Arrow 2 -> 3 -->
  <path d="M 590 280 C 620 330, 620 370, 590 410" stroke="#16a34a" stroke-width="3.5" fill="none" />
  <polygon points="586,415 595,405 583,403" fill="#16a34a" />

  <!-- 3. Pupa / Kepompong (Bottom Right) -->
  <g id="tahap-pupa">
    <circle cx="590" cy="380" r="50" fill="#fff7ed" stroke="#f97316" stroke-width="3" />
    <text x="590" y="378" font-family="system-ui, sans-serif" font-size="28" text-anchor="middle">🍂</text>
    <rect x="520" y="440" width="140" height="24" rx="4" fill="#fed7aa" />
    <text x="590" y="456" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#9a3412" text-anchor="middle">3. PUPA (KEPOMPONG)</text>
  </g>

  <!-- Arrow 3 -> 4 -->
  <path d="M 520 380 C 450 410, 400 410, 330 380" stroke="#16a34a" stroke-width="3.5" fill="none" />
  <polygon points="325,378 337,384 333,371" fill="#16a34a" />

  <!-- 4. Imago / Kupu-Kupu (Bottom Left) -->
  <g id="tahap-imago">
    <circle cx="260" cy="380" r="50" fill="#fdf2f8" stroke="#ec4899" stroke-width="3" />
    <text x="260" y="378" font-family="system-ui, sans-serif" font-size="30" text-anchor="middle">🦋</text>
    <rect x="195" y="440" width="130" height="24" rx="4" fill="#fbcfe8" />
    <text x="260" y="456" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#9d174d" text-anchor="middle">4. IMAGO (DEWASA)</text>
  </g>

  <!-- Arrow 4 -> 1 -->
  <path d="M 260 310 C 230 270, 230 230, 260 210" stroke="#16a34a" stroke-width="3.5" fill="none" />
  <polygon points="263,205 253,212 265,216" fill="#16a34a" />

  <!-- Center Circle -->
  <circle cx="425" cy="285" r="45" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
  <text x="425" y="280" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#0f172a" text-anchor="middle">SIKLUS</text>
  <text x="425" y="296" font-family="system-ui, sans-serif" font-size="9.5" fill="#64748b" text-anchor="middle">BERULANG</text>

  <!-- Footer -->
  <rect x="40" y="485" width="770" height="55" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="60" y="516" font-family="system-ui, sans-serif" font-size="11" fill="#334155">
    <tspan font-weight="800">Ciri Metamorfosis Sempurna:</tspan> Mengalami fase kepompong (pupa) dengan bentuk fisik larva yang sangat berbeda dari bentuk dewasa.
  </text>
</svg>`;
}

// 10. Flowchart Umum (4 Langkah Proses)
function createFlowchartSvg(prompt: string): string {
  const safeTitle = escapeXml(truncate(prompt, 55));
  return `<svg viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#ffffff" rx="16" />
  
  <!-- Header -->
  <rect x="40" y="25" width="770" height="70" rx="12" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5" />
  <circle cx="75" cy="60" r="20" fill="#2563eb" />
  <text x="75" y="67" font-family="system-ui, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">📊</text>
  <text x="115" y="50" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#1d4ed8" letter-spacing="1">BAGAN ALUR &amp; PROSES SISTEMATIS</text>
  <text x="115" y="74" font-family="system-ui, sans-serif" font-size="17" font-weight="800" fill="#1e3a8a">${safeTitle}</text>

  <!-- 4 Step Boxes Horizontally / Vertically -->
  <!-- Step 1 -->
  <g id="langkah1">
    <rect x="60" y="140" width="150" height="230" rx="12" fill="#f8fafc" stroke="#3b82f6" stroke-width="2" />
    <rect x="75" y="155" width="120" height="28" rx="6" fill="#3b82f6" />
    <text x="135" y="174" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle">TAHAP 1</text>
    <circle cx="135" cy="225" r="30" fill="#dbeafe" />
    <text x="135" y="233" font-family="system-ui, sans-serif" font-size="24" text-anchor="middle">🔍</text>
    <text x="135" y="280" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#1e3a8a" text-anchor="middle">Identifikasi</text>
    <text x="135" y="305" font-family="system-ui, sans-serif" font-size="10.5" fill="#475569" text-anchor="middle">Pengamatan &amp;</text>
    <text x="135" y="322" font-family="system-ui, sans-serif" font-size="10.5" fill="#475569" text-anchor="middle">Pengumpulan Data</text>
  </g>

  <!-- Arrow 1 -> 2 -->
  <path d="M 215 255 L 245 255" stroke="#3b82f6" stroke-width="4" />
  <polygon points="255,255 243,248 243,262" fill="#3b82f6" />

  <!-- Step 2 -->
  <g id="langkah2">
    <rect x="260" y="140" width="150" height="230" rx="12" fill="#f8fafc" stroke="#10b981" stroke-width="2" />
    <rect x="275" y="155" width="120" height="28" rx="6" fill="#10b981" />
    <text x="335" y="174" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle">TAHAP 2</text>
    <circle cx="335" cy="225" r="30" fill="#d1fae5" />
    <text x="335" y="233" font-family="system-ui, sans-serif" font-size="24" text-anchor="middle">⚙️</text>
    <text x="335" y="280" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#065f46" text-anchor="middle">Pemrosesan</text>
    <text x="335" y="305" font-family="system-ui, sans-serif" font-size="10.5" fill="#475569" text-anchor="middle">Analisis Masalah &amp;</text>
    <text x="335" y="322" font-family="system-ui, sans-serif" font-size="10.5" fill="#475569" text-anchor="middle">Uji Mekanisme</text>
  </g>

  <!-- Arrow 2 -> 3 -->
  <path d="M 415 255 L 445 255" stroke="#10b981" stroke-width="4" />
  <polygon points="455,255 443,248 443,262" fill="#10b981" />

  <!-- Step 3 -->
  <g id="langkah3">
    <rect x="460" y="140" width="150" height="230" rx="12" fill="#f8fafc" stroke="#f59e0b" stroke-width="2" />
    <rect x="475" y="155" width="120" height="28" rx="6" fill="#f59e0b" />
    <text x="535" y="174" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle">TAHAP 3</text>
    <circle cx="535" cy="225" r="30" fill="#fef3c7" />
    <text x="535" y="233" font-family="system-ui, sans-serif" font-size="24" text-anchor="middle">🎯</text>
    <text x="535" y="280" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#92400e" text-anchor="middle">Penerapan</text>
    <text x="535" y="305" font-family="system-ui, sans-serif" font-size="10.5" fill="#475569" text-anchor="middle">Implementasi Nyata</text>
    <text x="535" y="322" font-family="system-ui, sans-serif" font-size="10.5" fill="#475569" text-anchor="middle">&amp; Pengukuran</text>
  </g>

  <!-- Arrow 3 -> 4 -->
  <path d="M 615 255 L 645 255" stroke="#f59e0b" stroke-width="4" />
  <polygon points="655,255 643,248 643,262" fill="#f59e0b" />

  <!-- Step 4 -->
  <g id="langkah4">
    <rect x="660" y="140" width="140" height="230" rx="12" fill="#f8fafc" stroke="#8b5cf6" stroke-width="2" />
    <rect x="670" y="155" width="120" height="28" rx="6" fill="#8b5cf6" />
    <text x="730" y="174" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle">TAHAP 4</text>
    <circle cx="730" cy="225" r="30" fill="#ede9fe" />
    <text x="730" y="233" font-family="system-ui, sans-serif" font-size="24" text-anchor="middle">🏆</text>
    <text x="730" y="280" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#5b21b6" text-anchor="middle">Hasil Akhir</text>
    <text x="730" y="305" font-family="system-ui, sans-serif" font-size="10.5" fill="#475569" text-anchor="middle">Evaluasi Kualitas</text>
    <text x="730" y="322" font-family="system-ui, sans-serif" font-size="10.5" fill="#475569" text-anchor="middle">&amp; Kesimpulan</text>
  </g>

  <!-- Summary Banner -->
  <rect x="40" y="400" width="770" height="120" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
  <circle cx="70" cy="435" r="16" fill="#2563eb" />
  <text x="70" y="442" font-family="system-ui, sans-serif" font-size="16" fill="#ffffff" text-anchor="middle">📌</text>
  <text x="100" y="435" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#0f172a">PRINSIP PENYELESAIAN TERSTRUKTUR:</text>
  <text x="100" y="460" font-family="system-ui, sans-serif" font-size="11.5" fill="#475569">
    <tspan x="100" dy="0">• Setiap tahapan saling berkaitan dan membentuk urutan logis berkesinambungan.</tspan>
    <tspan x="100" dy="18">• Kesalahan pada tahap identifikasi awal dapat memengaruhi hasil keputusan pada tahap akhir.</tspan>
    <tspan x="100" dy="18">• Evaluasi berkala memastikan tujuan pembelajaran atau eksperimen tercapai secara optimal.</tspan>
  </text>
</svg>`;
}

// 11. Generic Educational Infographic (Fallback Utama Bergaransi)
function createGenericInfographicSvg(prompt: string): string {
  const safeTitle = escapeXml(truncate(prompt, 60));

  return `<svg viewBox="0 0 850 560" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#ffffff" rx="16" />
  
  <!-- Header Card -->
  <rect x="40" y="25" width="770" height="75" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
  <circle cx="78" cy="62" r="22" fill="#3b82f6" />
  <text x="78" y="70" font-family="system-ui, sans-serif" font-size="22" fill="#ffffff" text-anchor="middle">📚</text>
  <text x="115" y="52" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#2563eb" letter-spacing="1">INFOGRAFIS MATERI EDUKATIF</text>
  <text x="115" y="76" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#0f172a">${safeTitle}</text>

  <!-- 3 Symmetric Cards -->
  <!-- Card 1 -->
  <g id="kartu1">
    <rect x="40" y="125" width="240" height="270" rx="12" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.5" />
    <rect x="55" y="140" width="210" height="34" rx="6" fill="#3b82f6" />
    <text x="160" y="162" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">1. KONSEP DASAR</text>
    
    <circle cx="160" cy="220" r="32" fill="#dbeafe" />
    <text x="160" y="230" font-family="system-ui, sans-serif" font-size="28" text-anchor="middle">💡</text>
    
    <text x="60" y="280" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#1e40af">• Definisi &amp; Karakteristik</text>
    <text x="60" y="305" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#1e40af">• Unsur Pembentuk Utama</text>
    <text x="60" y="330" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#1e40af">• Sifat &amp; Klasifikasi</text>
    <text x="60" y="355" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#1e40af">• Landasan Teori Ilmiah</text>
  </g>

  <!-- Card 2 -->
  <g id="kartu2">
    <rect x="305" y="125" width="240" height="270" rx="12" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.5" />
    <rect x="320" y="140" width="210" height="34" rx="6" fill="#10b981" />
    <text x="425" y="162" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">2. PROSES &amp; FUNGSI</text>
    
    <circle cx="425" cy="220" r="32" fill="#d1fae5" />
    <text x="425" y="230" font-family="system-ui, sans-serif" font-size="28" text-anchor="middle">⚙️</text>
    
    <text x="325" y="280" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#065f46">• Cara Kerja &amp; Tahapan</text>
    <text x="325" y="305" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#065f46">• Peran dalam Ekosistem/Sistem</text>
    <text x="325" y="330" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#065f46">• Interaksi Antar Komponen</text>
    <text x="325" y="355" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#065f46">• Manfaat bagi Kehidupan</text>
  </g>

  <!-- Card 3 -->
  <g id="kartu3">
    <rect x="570" y="125" width="240" height="270" rx="12" fill="#faf5ff" stroke="#d8b4fe" stroke-width="1.5" />
    <rect x="585" y="140" width="210" height="34" rx="6" fill="#8b5cf6" />
    <text x="690" y="162" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">3. DAMPAK &amp; APLIKASI</text>
    
    <circle cx="690" cy="220" r="32" fill="#ede9fe" />
    <text x="690" y="230" font-family="system-ui, sans-serif" font-size="28" text-anchor="middle">🌱</text>
    
    <text x="590" y="280" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#5b21b6">• Contoh Kehidupan Sehari-hari</text>
    <text x="590" y="305" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#5b21b6">• Pemecahan Masalah Nyata</text>
    <text x="590" y="330" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#5b21b6">• Pelestarian &amp; Pengelolaan</text>
    <text x="590" y="355" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#5b21b6">• Evaluasi &amp; Refleksi</text>
  </g>

  <!-- Bottom Summary Banner -->
  <g id="rangkuman">
    <rect x="40" y="420" width="770" height="110" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
    <circle cx="70" cy="455" r="16" fill="#10b981" />
    <text x="70" y="462" font-family="system-ui, sans-serif" font-size="16" fill="#ffffff" text-anchor="middle">✓</text>
    <text x="100" y="452" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#0f172a">KESIMPULAN PEMBELAJARAN</text>
    <text x="100" y="476" font-family="system-ui, sans-serif" font-size="12" fill="#475569">
      <tspan x="100" dy="0">• Pemahaman komprehensif konsep diperoleh melalui keterkaitan teori dengan penerapan kontekstual.</tspan>
      <tspan x="100" dy="18">• Amati setiap diagram dan data pendukung untuk menyimpulkan prinsip atau jawaban yang paling tepat.</tspan>
    </text>
  </g>
</svg>`;
}
