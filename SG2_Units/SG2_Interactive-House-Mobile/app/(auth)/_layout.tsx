import { Stack } from 'expo-router';
import { useAppTheme } from '../../utils/AppThemeContext';

/**
 * AuthLayout
 * Manages the stack for authentication screens (Login/Signup).
 * Since this is a nested layout, we hide the header here 
 * to let the individual screens control their own UI.
 */
export default function AuthLayout() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        // Keep the dark theme consistent during transitions
        contentStyle: { backgroundColor: theme.colors.background },
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Sign In' 
        }} 
      />
      <Stack.Screen 
        name="signup" 
        options={{ 
          title: 'Create Account' 
        }} 
      />
    </Stack>
  );
}