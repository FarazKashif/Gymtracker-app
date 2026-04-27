import { useAppStore } from '../../store/appStore';

export function Notification() {
  const notification = useAppStore(s => s.notification);
  if (!notification) return null;

  const colours = {
    success: 'border-green text-green',
    info: 'border-accent text-accent',
    warning: 'border-yellow text-yellow',
    error: 'border-red text-red',
  };

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-bg-card border rounded-sm text-sm data-value max-w-sm w-[calc(100%-2rem)] ${colours[notification.type] || colours.info}`}
      style={{ borderRadius: 2 }}
    >
      {notification.message}
    </div>
  );
}
