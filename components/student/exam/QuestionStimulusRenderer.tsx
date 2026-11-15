import React from "react";
import type { ChartData } from "../../../types";
import { AudioPlayer } from "../../AudioPlayer";
import { ChartRenderer } from "../../ChartRenderer";

export const renderQuestionTextWithChart = (
  html: string,
  chartData: ChartData | undefined,
  audioUrl: string | undefined,
  listeningScript: string | undefined,
  optimizeHtml: (h: string) => string,
) => {
  let optimized = optimizeHtml(html);
  if (/\\?\[\s*ai_svg/i.test(optimized)) {
    optimized = optimized.replace(
      /(?:<p[^>]*>)?\s*\\?\[\s*ai_svg(?::\s*[^\]]*)?\s*\\?\]\s*(?:<\/p>)?/gi,
      "",
    );
  }
  if (/\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]/i.test(optimized)) {
    optimized = optimized.replace(
      /(?:<p>)?\s*\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]\s*(?:<\/p>)?/gi,
      '<span data-chart="true"></span>',
    );
  }

  const hasAudio = Boolean(audioUrl || listeningScript);
  const hasInlineAudioMarker =
    hasAudio &&
    (/\[AUDIO_STIMULUS\]/i.test(optimized) || /data-audio="true"/i.test(optimized));

  if (hasInlineAudioMarker) {
    optimized = optimized.replace(
      /(?:<p[^>]*>)?\s*(?:\[AUDIO_STIMULUS\]|<span[^>]*data-audio="true"[^>]*><\/span>)\s*(?:<\/p>)?/gi,
      '<span data-audio-marker="true"></span>',
    );
  }

  if (!chartData && !hasInlineAudioMarker) {
    return (
      <div
        className="question-content min-w-0"
        dangerouslySetInnerHTML={{ __html: optimized }}
      ></div>
    );
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(optimized, "text/html");

  const chartNode = doc.querySelector('[data-chart="true"]');
  const audioNode = doc.querySelector('[data-audio-marker="true"]');

  if (audioNode) {
    audioNode.insertAdjacentText("beforebegin", "___AUDIO_MARKER___");
    audioNode.remove();
  }

  if (chartNode) {
    chartNode.insertAdjacentText("beforebegin", "___CHART_MARKER___");
    chartNode.remove();
  }

  const newHtml = doc.body.innerHTML;
  const audioParts = newHtml.split("___AUDIO_MARKER___");

  return (
    <>
      {audioParts.map((audioPart, aIdx) => {
        const chartParts = audioPart.split("___CHART_MARKER___");
        return (
          <React.Fragment key={aIdx}>
            {chartParts.map((cPart, cIdx) => (
              <React.Fragment key={cIdx}>
                <div
                  className="question-content min-w-0"
                  dangerouslySetInnerHTML={{ __html: cPart }}
                ></div>
                {cIdx < chartParts.length - 1 && (
                  <div className="my-6 w-full max-w-3xl mx-auto">
                    <ChartRenderer data={chartData} />
                  </div>
                )}
              </React.Fragment>
            ))}
            {aIdx < audioParts.length - 1 && (
              <div className="my-4">
                <AudioPlayer
                  src={audioUrl}
                  script={listeningScript}
                  isTeacher={false}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};
