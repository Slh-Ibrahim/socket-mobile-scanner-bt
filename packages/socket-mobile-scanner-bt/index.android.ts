import { SocketMobileScannerCommon, SocketMobileOptions, ScannerEvent, DeviceInfo, DecodedData, DataConfirmationMode, ScannerError } from './common';
import { Application, Utils } from '@nativescript/core';

// Declare Android SDK classes
declare const com: any;

export class SocketMobileScanner extends SocketMobileScannerCommon {
  private captureHelper: any; // com.socketmobile.capture.android.Capture
  private devices: Map<string, any> = new Map();

  constructor() {
    super();
  }

  async initialize(options: SocketMobileOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const context = Utils.android.getApplicationContext();

        // Create Capture instance
        this.captureHelper = new com.socketmobile.capture.android.Capture();

        // Create capture listener
        const captureListener = new com.socketmobile.capture.ICaptureEventListener({
          onCaptureEvent: (event: any, handle: any) => {
            this.handleCaptureEvent(event, handle);
          },
        });

        // Open capture
        const appInfo = new com.socketmobile.capture.AppInfo();
        appInfo.setAppKey(options.appKey);
        appInfo.setDeveloperId(options.developerId);
        appInfo.setAppId(options.appId);

        const property = new com.socketmobile.capture.CaptureProperty();
        property.setID(com.socketmobile.capture.CaptureProperty.PropId.kCapturePropIdOpenClient);
        property.setType(com.socketmobile.capture.CaptureProperty.Types.kNone);
        property.setAppInfo(appInfo);

        this.captureHelper.setProperty(
          property,
          new com.socketmobile.capture.ICapturePropertyCallback({
            onCompletion: (result: number, propertyResult: any) => {
              if (result === com.socketmobile.capture.CaptureError.ESKT_NOERROR) {
                this.captureHelper.setListener(captureListener);
                console.log('✅ Socket Mobile initialized successfully');
                this.notify({
                  eventName: ScannerEvent.DeviceManagerStarted,
                  object: this,
                });
                resolve();
              } else {
                reject(new Error(`Failed to initialize: ${result}`));
              }
            },
          }),
        );
      } catch (error) {
        console.error('❌ Exception during initialization:', error);
        reject(error);
      }
    });
  }

  private handleCaptureEvent(event: any, handle: any): void {
    const eventId = event.getID();
    const CaptureEventIds = com.socketmobile.capture.CaptureProperty.EventId;

    switch (eventId) {
      case CaptureEventIds.kCaptureEventIdDeviceArrival:
        this.handleDeviceArrival(event);
        break;
      case CaptureEventIds.kCaptureEventIdDeviceRemoval:
        this.handleDeviceRemoval(event);
        break;
      case CaptureEventIds.kCaptureEventIdDecodedData:
        this.handleDecodedData(event);
        break;
      case CaptureEventIds.kCaptureEventIdError:
        this.handleError(event);
        break;
      case CaptureEventIds.kCaptureEventIdPower:
        this.handleBatteryLevel(event);
        break;
    }
  }

  private handleDeviceArrival(event: any): void {
    try {
      const deviceInfo = event.getDataDeviceInfo();
      const device = {
        guid: deviceInfo.getGuid(),
        name: deviceInfo.getName(),
        type: deviceInfo.getDeviceType(),
      };

      this.devices.set(device.guid, deviceInfo);

      this.notify({
        eventName: ScannerEvent.DeviceArrival,
        object: this,
        data: device as DeviceInfo,
      });
    } catch (error) {
      console.error('Error handling device arrival:', error);
    }
  }

  private handleDeviceRemoval(event: any): void {
    try {
      const deviceInfo = event.getDataDeviceInfo();
      const guid = deviceInfo.getGuid();

      const device: DeviceInfo = {
        guid: guid,
        name: deviceInfo.getName(),
        type: deviceInfo.getDeviceType(),
      };

      this.devices.delete(guid);

      this.notify({
        eventName: ScannerEvent.DeviceRemoval,
        object: this,
        data: device,
      });
    } catch (error) {
      console.error('Error handling device removal:', error);
    }
  }

  private handleDecodedData(event: any): void {
    try {
      const decodedData = event.getDataDecodedData();
      const deviceInfo = decodedData.getDeviceInfo();

      const dataBytes = decodedData.getData();
      const dataString = new java.lang.String(dataBytes, 'UTF-8').toString();

      const data: DecodedData = {
        data: dataString,
        dataSourceName: decodedData.getDataSourceName() || '',
        dataSourceId: decodedData.getDataSourceId(),
        symbology: this.getSymbologyName(decodedData.getDataSourceId()),
        deviceGuid: deviceInfo.getGuid(),
      };

      this.notify({
        eventName: ScannerEvent.DecodedData,
        object: this,
        data: data,
      });
    } catch (error) {
      console.error('Error handling decoded data:', error);
    }
  }

  private handleError(event: any): void {
    const error = event.getDataError();
    const scannerError: ScannerError = {
      code: error.getCode(),
      message: error.getMessage() || 'Unknown error',
    };

    this.notify({
      eventName: ScannerEvent.Error,
      object: this,
      data: scannerError,
    });
  }

  private handleBatteryLevel(event: any): void {
    try {
      const powerInfo = event.getDataPower();
      const deviceInfo = powerInfo.getDeviceInfo();

      this.notify({
        eventName: ScannerEvent.BatteryLevel,
        object: this,
        data: {
          deviceGuid: deviceInfo.getGuid(),
          batteryLevel: powerInfo.getPercentage(),
          charging: powerInfo.getState() === com.socketmobile.capture.CaptureProperty.PowerState.kCapturePowerStateCharging,
        },
      });
    } catch (error) {
      console.error('Error handling battery level:', error);
    }
  }

  private getSymbologyName(dataSourceId: number): string {
    const SymbologyIds = com.socketmobile.capture.CaptureProperty.SymbologyId;
    const symbologies: { [key: number]: string } = {
      [SymbologyIds.kCaptureSymbologyCode39]: 'Code 39',
      [SymbologyIds.kCaptureSymbologyCode128]: 'Code 128',
      [SymbologyIds.kCaptureSymbologyQRCode]: 'QR Code',
      [SymbologyIds.kCaptureSymbologyDataMatrix]: 'Data Matrix',
      [SymbologyIds.kCaptureSymbologyEan13]: 'EAN-13',
      [SymbologyIds.kCaptureSymbologyUpcA]: 'UPC-A',
    };
    return symbologies[dataSourceId] || `Unknown (${dataSourceId})`;
  }

  async openDevice(guid: string): Promise<void> {
    return Promise.resolve();
  }

  async closeDevice(guid: string): Promise<void> {
    this.devices.delete(guid);
    return Promise.resolve();
  }

  async setDataConfirmation(mode: DataConfirmationMode, deviceGuid?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const property = new com.socketmobile.capture.CaptureProperty();
        property.setID(com.socketmobile.capture.CaptureProperty.PropId.kCapturePropIdDataConfirmationDevice);
        property.setType(com.socketmobile.capture.CaptureProperty.Types.kByte);

        const DataConfirmation = com.socketmobile.capture.CaptureProperty.DataConfirmation;
        let confirmationMode: number;

        switch (mode) {
          case DataConfirmationMode.Off:
            confirmationMode = DataConfirmation.kCaptureDataConfirmationOff;
            break;
          case DataConfirmationMode.Device:
            confirmationMode = DataConfirmation.kCaptureDataConfirmationDevice;
            break;
          case DataConfirmationMode.App:
            confirmationMode = DataConfirmation.kCaptureDataConfirmationApp;
            break;
        }

        property.setByte(confirmationMode);

        this.captureHelper.setProperty(
          property,
          new com.socketmobile.capture.ICapturePropertyCallback({
            onCompletion: (result: number, propertyResult: any) => {
              if (result === com.socketmobile.capture.CaptureError.ESKT_NOERROR) {
                resolve();
              } else {
                reject(new Error(`Failed to set data confirmation: ${result}`));
              }
            },
          }),
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async setSoftScanTrigger(enabled: boolean, deviceGuid?: string): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const property = new com.socketmobile.capture.CaptureProperty();
        property.setID(com.socketmobile.capture.CaptureProperty.PropId.kCapturePropIdTriggerDevice);
        property.setType(com.socketmobile.capture.CaptureProperty.Types.kByte);

        const Trigger = com.socketmobile.capture.CaptureProperty.Trigger;
        property.setByte(enabled ? Trigger.kCaptureTriggerStart : Trigger.kCaptureTriggerStop);

        this.captureHelper.setProperty(
          property,
          new com.socketmobile.capture.ICapturePropertyCallback({
            onCompletion: (result: number, propertyResult: any) => {
              if (result === com.socketmobile.capture.CaptureError.ESKT_NOERROR) {
                resolve(result);
              } else {
                reject(new Error(`Failed to set trigger: ${result}`));
              }
            },
          }),
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async getBatteryLevel(deviceGuid: string): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const property = new com.socketmobile.capture.CaptureProperty();
        property.setID(com.socketmobile.capture.CaptureProperty.PropId.kCapturePropIdBatteryLevelDevice);
        property.setType(com.socketmobile.capture.CaptureProperty.Types.kNone);

        this.captureHelper.getProperty(
          property,
          new com.socketmobile.capture.ICapturePropertyCallback({
            onCompletion: (result: number, propertyResult: any) => {
              if (result === com.socketmobile.capture.CaptureError.ESKT_NOERROR) {
                resolve(propertyResult.getByte());
              } else {
                reject(new Error(`Failed to get battery level: ${result}`));
              }
            },
          }),
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async setStandMode(enabled: boolean, deviceGuid?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const property = new com.socketmobile.capture.CaptureProperty();
        property.setID(com.socketmobile.capture.CaptureProperty.PropId.kCapturePropIdStandConfigDevice);
        property.setType(com.socketmobile.capture.CaptureProperty.Types.kUlong);

        const StandConfig = com.socketmobile.capture.CaptureProperty.StandConfig;
        property.setUlong(enabled ? StandConfig.kCaptureStandConfigMobileMode : StandConfig.kCaptureStandConfigStandMode);

        this.captureHelper.setProperty(
          property,
          new com.socketmobile.capture.ICapturePropertyCallback({
            onCompletion: (result: number, propertyResult: any) => {
              if (result === com.socketmobile.capture.CaptureError.ESKT_NOERROR) {
                resolve();
              } else {
                reject(new Error(`Failed to set stand mode: ${result}`));
              }
            },
          }),
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.captureHelper) {
        const property = new com.socketmobile.capture.CaptureProperty();
        property.setID(com.socketmobile.capture.CaptureProperty.PropId.kCapturePropIdCloseClient);
        property.setType(com.socketmobile.capture.CaptureProperty.Types.kNone);

        this.captureHelper.setProperty(
          property,
          new com.socketmobile.capture.ICapturePropertyCallback({
            onCompletion: (result: number, propertyResult: any) => {
              this.devices.clear();
              this.notify({
                eventName: ScannerEvent.DeviceManagerStopped,
                object: this,
              });
              console.log('Socket Mobile closed');
              resolve();
            },
          }),
        );
      } else {
        resolve();
      }
    });
  }
}
