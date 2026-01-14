import { Redirect } from 'expo-router';
import { useAuth } from '../services/auth';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/inventory" />;
  }

  return <Redirect href="/(auth)/login" />;
}
