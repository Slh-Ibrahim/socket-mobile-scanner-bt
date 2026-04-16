import { Observable } from '@nativescript/core';

export interface SocketMobileOptions {
  appKey: string;
  developerId: string;
  appId: string;
}

export enum ScannerEvent {
  DeviceArrival = 'deviceArrival',
  DeviceRemoval = 'deviceRemoval',
  DecodedData = 'decodedData',
  Error = 'error',
  BatteryLevel = 'batteryLevel',
  DeviceManagerStarted = 'deviceManagerStarted',
  DeviceManagerStopped = 'deviceManagerStopped',
}

export interface DeviceInfo {
  guid: string;
  name: string;
  type: DeviceType;
  batteryLevel?: number;
}

export enum DeviceType {
  ScannerUnknown = 0,
  ScannerS7 = 1,
  ScannerD7 = 2,
  ScannerS8 = 3,
  ScannerD8 = 4,
  ScannerS9 = 5,
  ScannerS10 = 6,
}

export interface DecodedData {
  data: string;
  dataSourceName: string;
  dataSourceId: number;
  symbology: string;
  deviceGuid: string;
}

export enum DataConfirmationMode {
  Off = 0,
  Device = 1,
  App = 2,
}

export interface ScannerError {
  code: number;
  message: string;
}

export abstract class SocketMobileScannerCommon extends Observable {
  abstract initialize(options: SocketMobileOptions): Promise<void>;
  abstract openDevice(guid: string): Promise<void>;
  abstract closeDevice(guid: string): Promise<void>;
  abstract setDataConfirmation(mode: DataConfirmationMode, device?: string): Promise<void>;
  abstract setSoftScanTrigger(enabled: boolean, device?: string): Promise<number>;
  abstract getBatteryLevel(device: string): Promise<number>;
  abstract setStandMode(enabled: boolean, device?: string): Promise<void>;
  abstract close(): Promise<void>;
}

/**
 * NativeScript resolves to index.ios.ts or index.android.ts at build time.
 * This re-export satisfies TypeScript consumers who import SocketMobileScanner
 * from the package root.
 */
export { SocketMobileScannerCommon as SocketMobileScanner };
