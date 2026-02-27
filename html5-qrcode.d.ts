declare module "html5-qrcode" {
    export class Html5Qrcode {
        constructor(elementId: string, verbose?: boolean);
        start(
            cameraIdOrConfig: any, 
            configuration: any,
            qrCodeSuccessCallback: (decodedText: string, decodedResult: any) => void,
            qrCodeErrorCallback?: (errorMessage: string, error: any) => void
        ): Promise<void>;
        stop(): Promise<void>;
        clear(): void;
    }
}
