import { SocketMobileScannerCommon, SocketMobileOptions, ScannerEvent, DeviceInfo, DecodedData, DataConfirmationMode, ScannerError, DeviceType } from './common';

declare function dispatch_get_main_queue(): any;

@NativeClass()
class CaptureHelperDelegateImpl extends NSObject implements SKTCaptureHelperDelegate {
  public static ObjCProtocols = [SKTCaptureHelperDelegate];

  private _owner!: WeakRef<SocketMobileScanner>;

  public static initWithOwner(owner: SocketMobileScanner): CaptureHelperDelegateImpl {
    const delegate = CaptureHelperDelegateImpl.new() as CaptureHelperDelegateImpl;
    delegate._owner = new WeakRef(owner);
    return delegate;
  }

  didNotifyArrivalForDeviceWithResult(device: SKTCaptureHelperDevice, result: SKTCaptureErrors): void {
    const owner = this._owner?.deref();
    if (!owner || result !== SKTCaptureErrors.E_NOERROR) return;

    owner.rememberDevice(device);

    const deviceInfo: DeviceInfo = {
      guid: device.guid,
      name: device.friendlyName,
      type: this.mapDeviceType(device.deviceType),
    };

    owner.notify({
      eventName: ScannerEvent.DeviceArrival,
      object: owner,
      data: deviceInfo,
    });
  }

  didNotifyRemovalForDeviceWithResult(device: SKTCaptureHelperDevice, result: SKTCaptureErrors): void {
    const owner = this._owner?.deref();
    if (!owner || result !== SKTCaptureErrors.E_NOERROR) return;

    owner.forgetDevice(device.guid);

    const deviceInfo: DeviceInfo = {
      guid: device.guid,
      name: device.friendlyName,
      type: this.mapDeviceType(device.deviceType),
    };

    owner.notify({
      eventName: ScannerEvent.DeviceRemoval,
      object: owner,
      data: deviceInfo,
    });
  }

  didReceiveDecodedDataFromDeviceWithResult(decodedData: SKTCaptureDecodedData, device: SKTCaptureHelperDevice, result: SKTCaptureErrors): void {
    const owner = this._owner?.deref();
    if (!owner || result !== SKTCaptureErrors.E_NOERROR) return;

    try {
      const dataString = decodedData.stringFromDecodedData() || '';

      const data: DecodedData = {
        data: dataString,
        dataSourceName: decodedData.DataSourceName || '',
        dataSourceId: decodedData.DataSourceID,
        symbology: this.getSymbologyName(decodedData.DataSourceID),
        deviceGuid: device.guid,
      };

      owner.notify({
        eventName: ScannerEvent.DecodedData,
        object: owner,
        data: data,
      });
    } catch (error) {
      console.error('Error processing decoded data:', error);
    }
  }

  didReceiveErrorWithMessage(error: SKTCaptureErrors, message: string): void {
    const owner = this._owner?.deref();
    if (!owner) return;

    const scannerError: ScannerError = {
      code: error,
      message: message || 'Unknown error',
    };

    owner.notify({
      eventName: ScannerEvent.Error,
      object: owner,
      data: scannerError,
    });
  }

  didChangeBatteryLevelForDeviceWithResult(batteryPercentage: number, device: SKTCaptureHelperDevice, result: SKTCaptureErrors): void {
    const owner = this._owner?.deref();
    if (!owner || result !== SKTCaptureErrors.E_NOERROR) return;

    owner.notify({
      eventName: ScannerEvent.BatteryLevel,
      object: owner,
      data: {
        deviceGuid: device.guid,
        batteryLevel: batteryPercentage,
      },
    });
  }

  didChangePowerStateForDevice(powerState: SKTCapturePowerState, device: SKTCaptureHelperDevice): void {
    const owner = this._owner?.deref();
    if (!owner) return;

    owner.notify({
      eventName: ScannerEvent.BatteryLevel,
      object: owner,
      data: {
        deviceGuid: device.guid,
        charging: powerState === SKTCapturePowerState.OnCradle || powerState === SKTCapturePowerState.OnAc,
      },
    });
  }

  private getSymbologyName(dataSourceId: SKTCaptureDataSourceID): string {
    const symbologies: { [key: number]: string } = {
      [SKTCaptureDataSourceID.SymbologyCode39]: 'Code 39',
      [SKTCaptureDataSourceID.SymbologyCode128]: 'Code 128',
      [SKTCaptureDataSourceID.SymbologyQRCode]: 'QR Code',
      [SKTCaptureDataSourceID.SymbologyDataMatrix]: 'Data Matrix',
      [SKTCaptureDataSourceID.SymbologyEan13]: 'EAN-13',
      [SKTCaptureDataSourceID.SymbologyUpcA]: 'UPC-A',
    };
    return symbologies[dataSourceId] || `Unknown (${dataSourceId})`;
  }

  private mapDeviceType(type: SKTCaptureDeviceType): DeviceType {
    switch (type) {
      case SKTCaptureDeviceType.Scanner7:
      case SKTCaptureDeviceType.Scanner7x:
      case SKTCaptureDeviceType.Scanner7xi:
      case SKTCaptureDeviceType.ScannerS700:
      case SKTCaptureDeviceType.ScannerS720:
      case SKTCaptureDeviceType.ScannerS730:
      case SKTCaptureDeviceType.ScannerS740:
      case SKTCaptureDeviceType.ScannerS750:
      case SKTCaptureDeviceType.ScannerS760:
        return DeviceType.ScannerS7;
      case SKTCaptureDeviceType.ScannerD700:
      case SKTCaptureDeviceType.ScannerD720:
      case SKTCaptureDeviceType.ScannerD730:
      case SKTCaptureDeviceType.ScannerD740:
      case SKTCaptureDeviceType.ScannerD750:
      case SKTCaptureDeviceType.ScannerD760:
        return DeviceType.ScannerD7;
      case SKTCaptureDeviceType.ScannerS800:
      case SKTCaptureDeviceType.ScannerS820:
      case SKTCaptureDeviceType.ScannerS840:
      case SKTCaptureDeviceType.ScannerS850:
      case SKTCaptureDeviceType.ScannerS860:
        return DeviceType.ScannerS8;
      case SKTCaptureDeviceType.Scanner9:
        return DeviceType.ScannerS9;
      default:
        return DeviceType.ScannerUnknown;
    }
  }
}

export class SocketMobileScanner extends SocketMobileScannerCommon {
  private captureHelper!: SKTCaptureHelper;
  private delegate!: CaptureHelperDelegateImpl;
  private devices: Map<string, SKTCaptureHelperDevice> = new Map();

  constructor() {
    super();
  }

  public rememberDevice(device: SKTCaptureHelperDevice): void {
    this.devices.set(device.guid, device);
  }

  public forgetDevice(guid: string): void {
    this.devices.delete(guid);
  }

  private resolveDevice(deviceGuid?: string): SKTCaptureHelperDevice | undefined {
    if (deviceGuid) {
      return this.devices.get(deviceGuid);
    }

    const first = this.devices.values().next();
    return first.done ? undefined : first.value;
  }

  async initialize(options: SocketMobileOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use SDK singleton helper instance for stable lifecycle behavior.
        this.captureHelper = SKTCaptureHelper.sharedInstance();
        if (typeof dispatch_get_main_queue === 'function') {
          this.captureHelper.setDispatchQueue(dispatch_get_main_queue());
        }

        // Create and set delegate
        this.delegate = CaptureHelperDelegateImpl.initWithOwner(this);
        this.captureHelper.pushDelegate(this.delegate);

        // Create app info
        const appInfo = SKTAppInfo.alloc().init();
        appInfo.AppKey = options.appKey;
        appInfo.DeveloperID = options.developerId;
        appInfo.AppID = options.appId;

        const bundleId = NSBundle.mainBundle.bundleIdentifier;
        const appIdSuffix = options.appId?.startsWith('ios:') ? options.appId.substring(4) : options.appId;
        const appIdMatchesBundle = appIdSuffix === bundleId;
        const verifyResult = appInfo.verifyWithBundleId(bundleId);
        console.log('[SocketMobile] AppInfo validation:', {
          configuredAppId: options.appId,
          bundleId,
          appIdMatchesBundle,
          verifyResult,
          developerId: options.developerId,
        });

        // Open capture
        this.captureHelper.openWithAppInfoCompletionHandler(appInfo, (result: SKTCaptureErrors) => {
          if (result === SKTCaptureErrors.E_NOERROR) {
            console.log('✅ Socket Mobile initialized successfully');
            this.notify({
              eventName: ScannerEvent.DeviceManagerStarted,
              object: this,
            });
            resolve();
          } else {
            let errorMsg = `Failed to initialize Socket Mobile: ${result}`;
            if (result === SKTCaptureErrors.E_INVALIDAPPINFO) {
              errorMsg = `Failed to initialize Socket Mobile: ${result} (E_INVALIDAPPINFO). Verify AppKey + DeveloperID + AppID tuple and ensure AppID bundle suffix matches '${bundleId}'.`;
            }
            console.error('❌', errorMsg);
            reject(new Error(errorMsg));
          }
        });
      } catch (error) {
        console.error('❌ Exception during initialization:', error);
        reject(error);
      }
    });
  }

  async openDevice(guid: string): Promise<void> {
    // Devices are opened automatically on arrival in Socket Mobile SDK
    return Promise.resolve();
  }

  async closeDevice(guid: string): Promise<void> {
    // Devices are closed automatically on removal in Socket Mobile SDK
    this.devices.delete(guid);
    return Promise.resolve();
  }

  async setDataConfirmation(mode: DataConfirmationMode, deviceGuid?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let confirmationMode: SKTCaptureDataConfirmationMode = SKTCaptureDataConfirmationMode.ModeOff;
        switch (mode) {
          case DataConfirmationMode.Off:
            confirmationMode = SKTCaptureDataConfirmationMode.ModeOff;
            break;
          case DataConfirmationMode.Device:
            confirmationMode = SKTCaptureDataConfirmationMode.ModeDevice;
            break;
          case DataConfirmationMode.App:
            confirmationMode = SKTCaptureDataConfirmationMode.ModeApp;
            break;
        }

        this.captureHelper.setConfirmationModeCompletionHandler(confirmationMode, (result: SKTCaptureErrors) => {
          if (result === SKTCaptureErrors.E_NOERROR) {
            resolve();
          } else {
            reject(new Error(`Failed to set data confirmation: ${result}`));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async setSoftScanTrigger(enabled: boolean, deviceGuid?: string): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const device = this.resolveDevice(deviceGuid);
        if (!device) {
          reject(new Error('No connected scanner device found'));
          return;
        }

        const trigger = enabled ? SKTCaptureTrigger.Start : SKTCaptureTrigger.Stop;
        device.setTriggerCompletionHandler(trigger, (result: SKTCaptureErrors, _prop: SKTCaptureProperty) => {
          if (result === SKTCaptureErrors.E_NOERROR) {
            resolve(result);
          } else {
            reject(new Error(`Failed to set trigger: ${result}`));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async getBatteryLevel(deviceGuid: string): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const device = this.resolveDevice(deviceGuid);
        if (!device) {
          reject(new Error(`No connected scanner device found for guid: ${deviceGuid}`));
          return;
        }

        device.getBatteryLevelWithCompletionHandler((result: SKTCaptureErrors, batteryLevel: number) => {
          if (result === SKTCaptureErrors.E_NOERROR) {
            resolve(batteryLevel);
          } else {
            reject(new Error(`Failed to get battery level: ${result}`));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async setStandMode(enabled: boolean, deviceGuid?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const device = this.resolveDevice(deviceGuid);
        if (!device) {
          reject(new Error('No connected scanner device found'));
          return;
        }

        const config = enabled ? SKTCaptureStandConfig.MobileMode : SKTCaptureStandConfig.StandMode;
        device.setStandConfigCompletionHandler(config, (result: SKTCaptureErrors) => {
          if (result === SKTCaptureErrors.E_NOERROR) {
            resolve();
          } else {
            reject(new Error(`Failed to set stand mode: ${result}`));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.captureHelper) {
        this.captureHelper.closeWithCompletionHandler((_result: SKTCaptureErrors) => {
          this.devices.clear();
          this.captureHelper.popDelegate(this.delegate);
          this.notify({
            eventName: ScannerEvent.DeviceManagerStopped,
            object: this,
          });
          console.log('Socket Mobile closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
