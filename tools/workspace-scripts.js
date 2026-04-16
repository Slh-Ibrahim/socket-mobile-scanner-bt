module.exports = {
  message: 'NativeScript Plugins ~ made with ❤️  Choose a command to start...',
  pageSize: 32,
  scripts: {
    default: 'nps-i',
    nx: {
      script: 'nx',
      description: 'Execute any command with the @nrwl/cli',
    },
    format: {
      script: 'nx format:write',
      description: 'Format source code of the entire workspace (auto-run on precommit hook)',
    },
    '🔧': {
      script: `npx cowsay "NativeScript plugin demos make developers 😊"`,
      description: '_____________  Apps to demo plugins with  _____________',
    },
    // demos
    apps: {
      '...Vanilla...': {
        script: `npx cowsay "Nothing wrong with vanilla 🍦"`,
        description: ` 🔻 Vanilla`,
      },
      demo: {
        clean: {
          script: 'nx clean demo',
          description: '⚆  Clean  🧹',
        },
        ios: {
          script: 'nx debug demo ios',
          description: '⚆  Run iOS  ',
        },
        android: {
          script: 'nx debug demo android',
          description: '⚆  Run Android  🤖',
        },
      },
    },
    '⚙️': {
      script: `npx cowsay "@slh-ibrahim/* packages will keep your ⚙️ cranking"`,
      description: '_____________  @slh-ibrahim/*  _____________',
    },
    // packages
    // build output is always in dist/packages
    '@slh-ibrahim': {
      // @slh-ibrahim/socket-mobile-scanner-bt
      'socket-mobile-scanner-bt': {
        build: {
          script: 'nx run socket-mobile-scanner-bt:build.all',
          description: '@slh-ibrahim/socket-mobile-scanner-bt: Build',
        },
      },
      'build-all': {
        script: 'nx run-many --target=build.all --all',
        description: 'Build all packages',
      },
    },
    '⚡': {
      script: `npx cowsay "Focus only on source you care about for efficiency ⚡"`,
      description: '_____________  Focus (VS Code supported)  _____________',
    },
    focus: {
      'socket-mobile-scanner-bt': {
        script: 'nx run socket-mobile-scanner-bt:focus',
        description: 'Focus on @slh-ibrahim/socket-mobile-scanner-bt',
      },
      reset: {
        script: 'nx g @nativescript/plugin-tools:focus-packages',
        description: 'Reset Focus',
      },
    },
    '.....................': {
      script: `npx cowsay "That's all for now folks ~"`,
      description: '.....................',
    },
  },
};
