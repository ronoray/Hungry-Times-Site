import { createContext, useContext, useState } from 'react';

const MenuCategoryContext = createContext();

export function MenuCategoryProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <MenuCategoryContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </MenuCategoryContext.Provider>
  );
}

export function useMenuCategory() {
  const context = useContext(MenuCategoryContext);
  if (!context) {
    throw new Error('useMenuCategory must be used within MenuCategoryProvider');
  }
  return context;
}