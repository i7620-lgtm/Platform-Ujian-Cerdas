export const processTransparentImage = (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    if (imageUrl.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            
            if (luminance > 180) { // More aggressive threshold to catch light grays
              data[i + 3] = 0; // Transparent
            } else {
              const alpha = Math.min(255, (255 - luminance) * 1.5);
              data[i + 3] = alpha;
              data[i] = Math.max(0, r - 50);
              data[i + 1] = Math.max(0, g - 50);
              data[i + 2] = Math.max(0, b - 50);
            }
          }
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(imageUrl);
        }
      } catch (err) {
        console.error("Failed to process signature transparency", err);
        resolve(imageUrl);
      }
    };
    
    img.onerror = () => {
      resolve(imageUrl);
    };
    
    img.src = imageUrl;
  });
};
