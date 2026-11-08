/**
 * Utility to make outer background pixels of an image transparent using a 4-way BFS Flood Fill.
 * Only pixels connected to the outer edges/corners of the image that match the background color
 * (e.g. near white / light background) are made transparent (alpha = 0).
 * Inner white details inside the emblem/logo are untouched and preserved as solid white.
 */

export async function processImageOuterTransparency(
  fileOrUrl: File | string,
  threshold: number = 220,
  colorTolerance: number = 35
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl));
          return;
        }

        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Helper to get pixel index
        const getIndex = (x: number, y: number) => (y * width + x) * 4;

        // Sample background color from 4 corners
        const cornerIndices = [
          getIndex(0, 0),
          getIndex(width - 1, 0),
          getIndex(0, height - 1),
          getIndex(width - 1, height - 1),
        ];

        let bgR = 0, bgG = 0, bgB = 0, validSamples = 0;

        for (const idx of cornerIndices) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          // Check if corner is near-white or light background
          if (a > 200 && (r >= threshold || g >= threshold || b >= threshold)) {
            bgR += r;
            bgG += g;
            bgB += b;
            validSamples++;
          }
        }

        // If corners are not light background, return original
        if (validSamples === 0) {
          // Fallback: check if corner average is near white (>= 215)
          bgR = 255;
          bgG = 255;
          bgB = 255;
        } else {
          bgR = Math.round(bgR / validSamples);
          bgG = Math.round(bgG / validSamples);
          bgB = Math.round(bgB / validSamples);
        }

        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        // Add all outer border pixels to Queue
        for (let x = 0; x < width; x++) {
          queue.push(x, 0);
          queue.push(x, height - 1);
        }
        for (let y = 1; y < height - 1; y++) {
          queue.push(0, y);
          queue.push(width - 1, y);
        }

        // Color distance check
        const isBgColor = (idx: number) => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a === 0) return false;

          const diffR = Math.abs(r - bgR);
          const diffG = Math.abs(g - bgG);
          const diffB = Math.abs(b - bgB);

          // Check if near background sample color or near white (>= 220)
          return (
            (diffR <= colorTolerance && diffG <= colorTolerance && diffB <= colorTolerance) ||
            (r >= 225 && g >= 225 && b >= 225)
          );
        };

        // BFS traversal
        let head = 0;
        while (head < queue.length) {
          const x = queue[head++];
          const y = queue[head++];

          if (x < 0 || x >= width || y < 0 || y >= height) continue;

          const pIdx = y * width + x;
          if (visited[pIdx]) continue;
          visited[pIdx] = 1;

          const dIdx = pIdx * 4;

          if (isBgColor(dIdx)) {
            // Make transparent
            data[dIdx + 3] = 0;

            // Enqueue 4-way neighbors
            if (x > 0) queue.push(x - 1, y);
            if (x < width - 1) queue.push(x + 1, y);
            if (y > 0) queue.push(x, y - 1);
            if (y < height - 1) queue.push(x, y + 1);
          }
        }

        ctx.putImageData(imgData, 0, 0);

        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      } catch (err) {
        console.warn("Failed to process outer transparency:", err);
        resolve(typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl));
      }
    };

    img.onerror = (err) => {
      console.warn("Image load error for transparency processing:", err);
      resolve(typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl));
    };

    if (typeof fileOrUrl === "string") {
      img.src = fileOrUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        resolve(URL.createObjectURL(fileOrUrl));
      };
      reader.readAsDataURL(fileOrUrl);
    }
  });
}
