import { Observable, EventData, Page } from '@nativescript/core';
import { SocketMobileScanner } from '@slh-ibrahim/socket-mobile-scanner-bt';
import { DeveloperID, iosAppKey, iOSAppID } from './socketMobile';

const SCANNER_EVENTS = {
  DeviceArrival: 'deviceArrival',
  DeviceRemoval: 'deviceRemoval',
  DecodedData: 'decodedData',
  BatteryLevel: 'batteryLevel',
  Error: 'error',
} as const;

type DeviceInfoPayload = {
  guid: string;
  name: string;
};

type DecodedDataPayload = {
  data: string;
  symbology: string;
};

type BatteryPayload = {
  deviceGuid: string;
  batteryLevel?: number;
};

type ErrorPayload = {
  code?: number;
  message?: string;
};

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new DemoModel();
}

export function onUnload(args: EventData) {
  const page = args.object as Page;
  const model = page.bindingContext as DemoModel;
  model?.onUnload();
}

export class DemoModel extends Observable {
  private scanner!: SocketMobileScanner;
  private initialized = false;
  private currentDeviceGuid = '';

  public deviceStatus = 'Initializing...';
  public scannedData = 'No data scanned yet';
  public batteryLevel = '';
  public symbology = '';
  public deviceName = '';

  constructor() {
    super();
    this.initScanner();
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private async initScanner() {
    try {
      this.scanner = new SocketMobileScanner();

      // Listen for events
      this.scanner.on(SCANNER_EVENTS.DeviceArrival, (event: any) => {
        const data = (event?.data || {}) as DeviceInfoPayload;
        console.log('Device connected:', data);
        this.currentDeviceGuid = data.guid || '';
        this.set('deviceStatus', `Connected: ${data.name || 'Unknown device'}`);
        this.set('deviceName', data.name || 'Unknown device');
      });

      this.scanner.on(SCANNER_EVENTS.DeviceRemoval, (event: any) => {
        const data = (event?.data || {}) as DeviceInfoPayload;
        console.log('Device disconnected:', data);
        this.currentDeviceGuid = '';
        this.set('deviceStatus', 'No device connected');
        this.set('deviceName', '');
        this.set('batteryLevel', '');
      });

      this.scanner.on(SCANNER_EVENTS.DecodedData, (event: any) => {
        const data = (event?.data || {}) as DecodedDataPayload;
        console.log('Scanned data:', data);
        this.set('scannedData', data.data || '');
        this.set('symbology', data.symbology || 'Unknown');
      });

      this.scanner.on(SCANNER_EVENTS.BatteryLevel, (event: any) => {
        const data = (event?.data || {}) as BatteryPayload;
        console.log('Battery level:', data);
        if (typeof data.batteryLevel === 'number') {
          this.set('batteryLevel', `${data.batteryLevel}%`);
        }
      });

      this.scanner.on(SCANNER_EVENTS.Error, (event: any) => {
        const error = (event?.data || {}) as ErrorPayload;
        console.error('Scanner error:', error);
        this.set('deviceStatus', `Error: ${error.message || 'Unknown scanner error'}`);
      });

      // Initialize
      await this.scanner.initialize({
        appKey: iosAppKey,
        developerId: DeveloperID,
        appId: iOSAppID,
      });

      this.initialized = true;
      this.set('deviceStatus', 'Waiting for device...');

      // 1 = Device confirmation mode
      try {
        await this.scanner.setDataConfirmation(1 as any);
      } catch (error: unknown) {
        // Some scanner models do not support this property; keep scanner usable.
        console.warn('Data confirmation not applied:', this.formatError(error));
      }
    } catch (error: unknown) {
      console.error('Init error:', error);
      this.set('deviceStatus', `Failed: ${this.formatError(error)}`);
    }
  }

  async onSoftScanStart() {
    if (!this.initialized) {
      this.set('deviceStatus', 'Scanner is not initialized yet');
      return;
    }

    try {
      const result = await this.scanner.setSoftScanTrigger(true, this.currentDeviceGuid || undefined);
      console.log('Soft scan started:', result);
      this.set('deviceStatus', 'Soft scan started');
    } catch (error: unknown) {
      console.error('Soft scan error:', error);
      this.set('deviceStatus', `Soft scan error: ${this.formatError(error)}`);
    }
  }

  async onSoftScanStop() {
    if (!this.initialized) {
      this.set('deviceStatus', 'Scanner is not initialized yet');
      return;
    }

    try {
      const result = await this.scanner.setSoftScanTrigger(false, this.currentDeviceGuid || undefined);
      console.log('Soft scan stopped:', result);
      this.set('deviceStatus', 'Soft scan stopped');
    } catch (error: unknown) {
      console.error('Soft scan error:', error);
      this.set('deviceStatus', `Soft scan error: ${this.formatError(error)}`);
    }
  }

  async onGetBattery() {
    try {
      if (!this.initialized) {
        this.set('deviceStatus', 'Scanner is not initialized yet');
        return;
      }

      if (this.currentDeviceGuid) {
        const level = await this.scanner.getBatteryLevel(this.currentDeviceGuid);
        this.set('batteryLevel', `${level}%`);
      } else {
        this.set('deviceStatus', 'No connected device to query battery');
      }
    } catch (error: unknown) {
      console.error('Battery error:', error);
      this.set('deviceStatus', `Battery error: ${this.formatError(error)}`);
    }
  }

  onUnload() {
    if (this.scanner && this.initialized) {
      this.scanner.close().catch(() => {
        // Ignore close errors during page teardown.
      });
    }
  }
}
