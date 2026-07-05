import AppShell from './components/AppShell';
import AuthGate from './components/auth/AuthGate';

export default function App() {
  // AuthGate is a no-op unless a backend is configured AND VITE_REQUIRE_AUTH is set (hosted beta).
  // Offline / self-host builds render AppShell straight through, exactly like before Era 5.
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}
