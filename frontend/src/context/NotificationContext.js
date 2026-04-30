import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext({ unreadCount: 0, setUnreadCount: () => {} });

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
