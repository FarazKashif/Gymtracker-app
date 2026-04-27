import { NavBar } from './NavBar';
import { Notification } from '../ui/Notification';

export function Layout({ children }) {
  return (
    <div className="min-h-dvh flex flex-col bg-bg-base text-text-primary">
      <Notification />
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>
      <NavBar />
    </div>
  );
}
