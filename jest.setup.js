global.__DEV__ = true;

jest.mock('react-native', () => {
  const React = require('react');
  return {
    ActivityIndicator: () => null,
    Alert: { alert: jest.fn() },
    Animated: {
      View: 'Animated.View',
      Value: jest.fn(() => ({ setValue: jest.fn() })),
      loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
      sequence: jest.fn((items) => items[0]),
      parallel: jest.fn((items) => items[0]),
      spring: jest.fn(() => ({})),
      timing: jest.fn(() => ({})),
    },
    AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
    Dimensions: { get: jest.fn(() => ({ width: 390, height: 844 })) },
    NativeModules: {},
    PermissionsAndroid: {
      PERMISSIONS: { ACTIVITY_RECOGNITION: 'activity' },
      RESULTS: { GRANTED: 'granted' },
      check: jest.fn(async () => true),
      request: jest.fn(async () => 'granted'),
    },
    Platform: { OS: 'android', Version: 33, select: (obj) => obj.android ?? obj.default },
    Pressable: ({ children }) => children,
    RefreshControl: () => null,
    ScrollView: ({ children }) => children,
    Share: { share: jest.fn() },
    StatusBar: () => null,
    StyleSheet: { create: (styles) => styles, absoluteFillObject: {} },
    Text: ({ children }) => children,
    UIManager: { setLayoutAnimationEnabledExperimental: jest.fn() },
    View: ({ children }) => children,
    useColorScheme: () => 'light',
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  DefaultTheme: {},
  DarkTheme: {},
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null,
  }),
}));

jest.mock('react-native-view-shot', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(() => null),
  };
});

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    executeSync: jest.fn(),
    execute: jest.fn(async () => ({ rows: [] })),
  })),
}));
