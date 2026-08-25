"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

type AdminContextValue = { sidebarOpen: boolean; setSidebarOpen: (value: boolean) => void };
const AdminContext = createContext<AdminContextValue | undefined>(undefined);
export function AdminProvider({ children }: { children: ReactNode }) { const [sidebarOpen, setSidebarOpen] = useState(false); return <AdminContext.Provider value={{ sidebarOpen, setSidebarOpen }}>{children}</AdminContext.Provider>; }
export function useAdmin() { const context = useContext(AdminContext); if (!context) throw new Error("useAdmin must be used inside AdminProvider"); return context; }
