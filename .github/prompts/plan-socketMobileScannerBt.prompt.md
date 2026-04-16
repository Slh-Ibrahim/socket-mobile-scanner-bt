## Plan: Resolve Socket Mobile -93 on iOS

Recommended path: since you cannot regenerate keys, align the app bundle id to your existing issued iOS appId, then add hard validation logs in iOS initialization so we can prove tuple validity in one run.

**Steps**

1. Add fail-fast AppInfo validation in [packages/socket-mobile-scanner-bt/index.ios.ts](packages/socket-mobile-scanner-bt/index.ios.ts) before opening Capture SDK.
2. Log configured appId, detected bundle id, and verifyWithBundleId result in [packages/socket-mobile-scanner-bt/index.ios.ts](packages/socket-mobile-scanner-bt/index.ios.ts).
3. Improve -93 error text in [packages/socket-mobile-scanner-bt/index.ios.ts](packages/socket-mobile-scanner-bt/index.ios.ts) so it explicitly reports invalid app tuple mismatch conditions.
4. Align iOS bundle id in [apps/demo/nativescript.config.ts](apps/demo/nativescript.config.ts#L4) to com.socketmobile.SingleEntry so it matches your provided appId.
5. Keep one source of truth in [apps/demo/src/plugin-demos/socketMobile.ts](apps/demo/src/plugin-demos/socketMobile.ts): iOSAppID should be ios:com.socketmobile.SingleEntry, with stale alternatives removed.
6. Apply working-init parity in [packages/socket-mobile-scanner-bt/index.ios.ts](packages/socket-mobile-scanner-bt/index.ios.ts): use helper singleton and set dispatch queue, matching known-good behavior from your reference package.
7. Verify iOS resource keys in [tools/assets/App_Resources/iOS/Info.plist](tools/assets/App_Resources/iOS/Info.plist), adding only missing Socket Mobile prerequisites.
8. Run clean rebuild and deploy via your safe target from [apps/demo/project.json](apps/demo/project.json).
9. Validate runtime: confirm appId/bundle match in logs, then confirm no -93 and decoded scan events updating UI in [apps/demo/src/plugin-demos/socket-mobile-scanner-bt.ts](apps/demo/src/plugin-demos/socket-mobile-scanner-bt.ts).

**Relevant files**

- [apps/demo/nativescript.config.ts](apps/demo/nativescript.config.ts)
- [apps/demo/src/plugin-demos/socketMobile.ts](apps/demo/src/plugin-demos/socketMobile.ts)
- [apps/demo/src/plugin-demos/socket-mobile-scanner-bt.ts](apps/demo/src/plugin-demos/socket-mobile-scanner-bt.ts)
- [packages/socket-mobile-scanner-bt/index.ios.ts](packages/socket-mobile-scanner-bt/index.ios.ts)
- [tools/assets/App_Resources/iOS/Info.plist](tools/assets/App_Resources/iOS/Info.plist)
- [apps/demo/project.json](apps/demo/project.json)

**Verification**

1. TypeScript diagnostics are clean for demo and iOS plugin files.
2. Device logs show configured appId equals ios:com.socketmobile.SingleEntry and detected bundle equals com.socketmobile.SingleEntry.
3. verifyWithBundleId reports true before openWithAppInfo.
4. SDK initialization returns success instead of -93.
5. Scanning triggers decodedData and updates the on-screen status/data fields.

**Decisions**

- Chosen strategy: align bundle id to existing issued credentials because you answered you do not control key issuance.
- Fallback if -93 remains after exact match: treat as server-side credential registration issue and provide collected tuple logs to Socket Mobile support.

If you approve, I can hand this off for immediate implementation in one pass.
