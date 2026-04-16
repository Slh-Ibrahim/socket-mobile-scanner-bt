# @slh-ibrahim/socket-mobile-scanner-bt

NativeScript plugin for [Socket Mobile](https://www.socketmobile.com/) Bluetooth barcode scanners (S700/S720/S730/S740/S750/S760, D700-series, S800-series, S9, and more). Wraps the native CaptureSDK on iOS and the Android Capture SDK.

## Installation

```bash
npm install @slh-ibrahim/socket-mobile-scanner-bt
```

### iOS — CocoaPods

The plugin's `platforms/ios/Podfile` fragment is auto-applied by NativeScript. No extra steps needed.

### Android — permissions

Add Bluetooth permissions to your `App_Resources/Android/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<!-- Android 12+ -->
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
```

## Setup

Register your app with Socket Mobile's developer portal to obtain:

| Credential    | Description                                                                          |
| ------------- | ------------------------------------------------------------------------------------ |
| `appKey`      | App-specific key generated in the Socket Mobile portal                               |
| `developerId` | Your developer GUID                                                                  |
| `appId`       | Bundle ID prefixed with platform — `ios:com.example.app` / `android:com.example.app` |

## Usage

```typescript
import { SocketMobileScanner, ScannerEvent, DataConfirmationMode } from '@slh-ibrahim/socket-mobile-scanner-bt';

const scanner = new SocketMobileScanner();

// Listen for events before initialising
scanner.on(ScannerEvent.DeviceArrival, (event) => {
  console.log('Device connected:', event.data.name, event.data.guid);
});

scanner.on(ScannerEvent.DeviceRemoval, (event) => {
  console.log('Device disconnected:', event.data.guid);
});

scanner.on(ScannerEvent.DecodedData, (event) => {
  const { data, symbology, deviceGuid } = event.data;
  console.log(`Scanned [${symbology}]: ${data}`);
});

scanner.on(ScannerEvent.BatteryLevel, (event) => {
  console.log('Battery:', event.data.batteryLevel, '%');
});

scanner.on(ScannerEvent.Error, (event) => {
  console.error('Scanner error:', event.data.code, event.data.message);
});

// Initialise — call once, e.g. on page load
await scanner.initialize({
  appKey: 'MC0CFD...', // from Socket Mobile portal
  developerId: 'your-developer-guid',
  appId: 'ios:com.example.myapp', // or 'android:com.example.myapp'
});

// Soft-scan trigger (starts/stops scanning laser)
await scanner.setSoftScanTrigger(true); // start
await scanner.setSoftScanTrigger(false); // stop

// Battery level (pass the device GUID from DeviceArrival)
const level = await scanner.getBatteryLevel(deviceGuid);

// Data confirmation mode
await scanner.setDataConfirmation(DataConfirmationMode.Device);

// Tear down
await scanner.close();
```

## API

### `new SocketMobileScanner()`

Extends NativeScript `Observable` — use `.on()` / `.off()` for events.

### Methods

| Method                | Signature                                                            | Description                                         |
| --------------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| `initialize`          | `(options: SocketMobileOptions) => Promise<void>`                    | Opens the SDK connection                            |
| `setSoftScanTrigger`  | `(enabled: boolean, deviceGuid?: string) => Promise<number>`         | Starts (`true`) or stops (`false`) the scan trigger |
| `getBatteryLevel`     | `(deviceGuid: string) => Promise<number>`                            | Returns battery percentage (0–100)                  |
| `setDataConfirmation` | `(mode: DataConfirmationMode, deviceGuid?: string) => Promise<void>` | Sets beep/LED confirmation mode                     |
| `setStandMode`        | `(enabled: boolean, deviceGuid?: string) => Promise<void>`           | Enables/disables stand (presentation) mode          |
| `openDevice`          | `(guid: string) => Promise<void>`                                    | Explicitly opens a device handle                    |
| `closeDevice`         | `(guid: string) => Promise<void>`                                    | Releases a device handle                            |
| `close`               | `() => Promise<void>`                                                | Closes the SDK connection                           |

### Events (`ScannerEvent`)

| Event                  | `event.data` type                          | Fired when              |
| ---------------------- | ------------------------------------------ | ----------------------- |
| `DeviceArrival`        | `DeviceInfo`                               | A scanner connects      |
| `DeviceRemoval`        | `DeviceInfo`                               | A scanner disconnects   |
| `DecodedData`          | `DecodedData`                              | A barcode is scanned    |
| `BatteryLevel`         | `{ deviceGuid, batteryLevel?, charging? }` | Battery state changes   |
| `Error`                | `ScannerError`                             | An SDK error occurs     |
| `DeviceManagerStarted` | —                                          | SDK opened successfully |
| `DeviceManagerStopped` | —                                          | SDK closed              |

### `DataConfirmationMode`

| Value    | Description                            |
| -------- | -------------------------------------- |
| `Off`    | No beep/LED                            |
| `Device` | Scanner confirms with its own beep/LED |
| `App`    | App controls confirmation              |

## License

Apache License Version 2.0 — see [LICENSE](./LICENSE).
