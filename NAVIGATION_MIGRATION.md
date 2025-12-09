# Navigation Migration - Expo Router to React Navigation

## Changes Made

Successfully migrated from Expo Router (file-based routing) to React Navigation (imperative navigation) using `createNativeStackNavigator` and `createBottomTabNavigator`.

### Updated Files

#### Core Navigation
- **`app/_layout.tsx`**: Root layout now uses `NavigationContainer` with `createNativeStackNavigator`
  - Conditional rendering: Auth screens when no session, Main screens when authenticated
  - Screens: `Auth`, `ResetPassword`, `Main` (tab navigator), `Modal`

- **`app/navigation/TabNavigator.tsx`**: New bottom tab navigator
  - 8 tab screens: Home, Explore, Announcements, Calendar, Polls, Chat, Issues, Profile
  - Uses custom tab bar component

- **`index.js`**: New entry point (replaced `expo-router/entry`)

#### Updated Components
- **`components/burger-menu.tsx`**: Changed from `useRouter()` to `useNavigation()`
  - Route names updated: `'Home'`, `'Explore'`, `'Announcements'`, etc.
  - Uses `navigation.navigate()` instead of `router.push()`

- **`components/profile-menu.tsx`**: Changed from `useRouter()` to `useNavigation()`
  - Logout now uses `CommonActions.reset()` for clean navigation reset
  - Profile navigation uses `navigation.navigate('Profile')`

- **`components/custom-tab-bar.tsx`**: Added `BottomTabBarProps` type
  - Accepts React Navigation bottom tabs props

- **`app/auth/index.tsx`**: Changed from `useRouter()` to `useNavigation()`
  - Reset password navigation: `navigation.navigate('ResetPassword')`

- **`app/auth/reset.tsx`**: Changed from `useRouter()` to `useNavigation()`
  - Back to login: `navigation.navigate('Auth')`

#### Configuration
- **`package.json`**: Changed `main` from `"expo-router/entry"` to `"index.js"`

### Navigation Structure

```
NavigationContainer (independent)
└── Stack Navigator (conditional on session)
    ├── If NOT authenticated:
    │   ├── Auth (Login Screen)
    │   └── ResetPassword
    │
    └── If authenticated:
        ├── Main (Tab Navigator)
        │   ├── Home
        │   ├── Announcements
        │   ├── Calendar
        │   ├── Polls
        │   ├── Chat
        │   ├── Issues
        │   └── Profile
        │
        └── Modal (presentation: modal)
```

### Key Benefits

1. **Better Control**: Imperative navigation provides more control over navigation state
2. **No Routing Issues**: Eliminates unmatched route errors from Expo Router
3. **Clean Auth Flow**: Session-based conditional rendering handles auth state cleanly
4. **Custom Tab Bar**: Full control over bottom navigation UI
5. **Type Safety**: React Navigation provides better TypeScript support

### Navigation APIs

#### Navigate to screen:
```typescript
navigation.navigate('ScreenName')
```

#### Navigate with params:
```typescript
navigation.navigate('ScreenName', { param1: 'value' })
```

#### Reset navigation stack:
```typescript
navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [{ name: 'ScreenName' }],
  })
)
```

#### Go back:
```typescript
navigation.goBack()
```

### Testing

Start the development server:
```bash
npm start
```

The app will:
1. Show loading screen while checking session
2. Redirect to `Auth` screen if no session
3. Redirect to `Main` (tabs) if session exists
4. Handle logout by resetting navigation to `Auth`
