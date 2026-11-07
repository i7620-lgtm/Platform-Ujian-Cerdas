export interface LightboxData {
  src?: string;
  svgHtml?: string;
  htmlContent?: string;
  title?: string;
  alt?: string;
}

// Global helper to trigger the lightbox from any component
export function openVisualLightbox(data: LightboxData) {
  window.dispatchEvent(new CustomEvent("open-visual-lightbox", { detail: data }));
}
