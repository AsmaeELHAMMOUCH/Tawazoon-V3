"use client"
import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"

const AuthCtx = createContext(null)
const TOKEN_KEY = "auth_token"

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ""
}
function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ---- Récupère le profil depuis /api/user/me
  const refreshUser = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = getToken()
      if (!token) {
        setUser(null)
        return
      }

      const data = await api.me()
      setUser({
        name: data?.name ?? "Utilisateur",
        role: data?.role ?? "Rôle",
        email: data?.email ?? "",
        avatarUrl: data?.avatarUrl ?? data?.avatar_url ?? "",
      })
    } catch (e) {
      console.warn("Auth check failed:", e)
      // Si erreur 401/403, api.js lance une erreur. On clear le token.
      if (e.message.includes("401") || e.message.includes("403")) {
        setToken("")
      }
      setUser(null)
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ---- Login
  const login = useCallback(async ({ username, email, password }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.login({ username, email, password })

      const token = data?.token || data?.access_token
      setToken(token || "")

      if (data?.user) {
        setUser({
          name: data.user.name ?? data.user.username ?? "Utilisateur",
          role: data.user.role ?? "Rôle",
          email: data.user.email ?? "",
          avatarUrl: data.user.avatarUrl ?? "",
        })
      } else {
        await refreshUser()
      }
      return { ok: true }
    } catch (e) {
      setUser(null)
      setToken("")
      setError(e)
      return { ok: false, error: e?.message || "Erreur de connexion" }
    } finally {
      setLoading(false)
    }
  }, [refreshUser])

  // ---- Logout
  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch { /* no-op */ }
    setToken("")
    setUser(null)
  }, [])

  // ---- Auto-refresh au montage
  useEffect(() => { refreshUser() }, [refreshUser])

  // ---- Sync multi-onglets : si token change ailleurs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === TOKEN_KEY) refreshUser()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [refreshUser])

  return (
    <AuthCtx.Provider value={{ user, loading, error, refreshUser, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
