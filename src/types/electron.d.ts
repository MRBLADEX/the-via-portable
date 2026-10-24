declare global {
  type DesktopHidDevice = {
    deviceId: string;
    name: string;
    vendorId: number;
    productId: number;
  };

  type DesktopHidDeviceRequest = {
    requestId: string;
    devices: DesktopHidDevice[];
  };

  type DesktopBridge = {
    onHidDeviceRequest(
      callback: (request: DesktopHidDeviceRequest) => void,
    ): () => void;
    selectHidDevice(requestId: string, deviceId: string | null): void;
  };

  interface Window {
    viaDesktop?: DesktopBridge;
  }
}

export {};
