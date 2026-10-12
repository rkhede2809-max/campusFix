import { useEffect, useState } from 'react';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/api.js';

function NotificationBell() {
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      setData(await getNotifications());
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function markRead(notification) {
    if (notification.isRead) return;
    try {
      await markNotificationRead(notification._id);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead();
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="notification-wrap">
      <button className="notification-trigger" type="button" aria-label={`${data.unreadCount} unread notifications`} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">♢</span>
        <span>Notifications</span>
        {data.unreadCount > 0 ? <strong className="unread-count">{data.unreadCount > 99 ? '99+' : data.unreadCount}</strong> : null}
      </button>
      {open ? (
        <section className="notification-popover">
          <header>
            <strong>Notifications</strong>
            {data.unreadCount > 0 ? <button type="button" className="text-button" onClick={markAllRead}>Mark all read</button> : null}
          </header>
          {error ? <p className="notification-error">{error}</p> : null}
          {data.notifications.length ? data.notifications.map((item) => (
            <button className={`notification-item ${item.isRead ? '' : 'unread'}`} type="button" key={item._id} onClick={() => markRead(item)}>
              <span>{item.message}</span>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </button>
          )) : <p className="notification-empty">You’re all caught up.</p>}
        </section>
      ) : null}
    </div>
  );
}

export default NotificationBell;
