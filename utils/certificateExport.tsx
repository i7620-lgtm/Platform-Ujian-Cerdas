import React from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';

export interface CertData {
    studentName: string;
    score: number | string;
    qrLink: string;
    verifyCode: string;
}

export const downloadCertificateAsPdf = async (
    certDataList: CertData[], 
    examType: string, 
    subject: string, 
    classLevel: string, 
    dateStr: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    certConfig: Record<string, any>,
    fileName: string
): Promise<void> => {
        const { jsPDF } = await import('jspdf');
        const { CertificateDOM } = await import('../components/CertificateDOM');

        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = '-9999px';
        div.style.left = '0';
        div.style.width = '1000px';
        div.style.height = '707px'; 
        div.style.zIndex = '-1';
        document.body.appendChild(div);

        const root = createRoot(div);
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        
        const renderSinglePdfContent = (data: CertData): Promise<void> => {
            return new Promise((res, rej) => {
                const handleRendered = async () => {
                    try {
                        await new Promise(r => setTimeout(r, 500));
                        
                        // Select the rendered content element rather than the offset parent div (which has top: -9999px)
                        // This prevents the SVG cloned image from inheriting fixed top: -9999px and rendering out of bounds (blank).
                        const captureTarget = (div.firstElementChild || div) as HTMLElement;
                        
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const renderOptions: any = {
                            pixelRatio: 2.5,
                            cacheBust: true,
                            backgroundColor: '#ffffff',
                            styleSheetsFilter: (css: CSSStyleSheet) => {
                                // Exclude cross-origin Google Fonts style rules that can fail to download and block SVG rendering
                                try {
                                    if (css.href && !css.href.startsWith(window.location.origin)) {
                                        return false;
                                    }
                                    return true;
                                } catch {
                                    return false;
                                }
                            }
                        };
                        
                        const imgData = await toPng(captureTarget, renderOptions);
                        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
                        res();
                    } catch (err) {
                        rej(err);
                    }
                };

                root.render(
                    <CertificateDOM 
                        studentName={data.studentName}
                        score={data.score}
                        examType={examType}
                        subject={subject}
                        classLevel={classLevel}
                        date={dateStr}
                        qrLink={data.qrLink}
                        verifyCode={data.verifyCode}
                        config={certConfig}
                        onRendered={handleRendered}
                    />
                );
            });
        };

        for (let i = 0; i < certDataList.length; i++) {
            if (i > 0) pdf.addPage();
            await renderSinglePdfContent(certDataList[i]);
        }
        
        pdf.save(fileName);
        root.unmount();
        document.body.removeChild(div);
};
