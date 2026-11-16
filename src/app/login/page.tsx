"use client"

import { useState } from "react"
import Image from "next/image"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, TrendingUp, Trophy, Gift } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError("Credenciales inválidas")
      } else {
        const sessionResponse = await fetch("/api/auth/session")
        const session = await sessionResponse.json()
        const destination = session?.user?.role === "TEACHER" ? "/docentes" : "/dashboard"
        router.push(destination)
        router.refresh()
      }
    } catch {
      setError("Error al conectar con el servidor")
    } finally {
      setLoading(false)
    }
  }

  // Login fixed to dark mode: no theme toggle, dark classes are unconditional
  // so they render dark regardless of the global (light/dark) theme.
  return (
    <div className="min-h-screen bg-gray-900 lg:grid lg:min-h-screen lg:grid-cols-2">
      {/* Left: Credentials */}
      <section aria-label="Iniciar sesión" className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white">Iniciar Sesión</h1>
            <p className="mt-1 text-gray-400">Accede con tu correo institucional para continuar</p>
          </div>

          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
                  Correo Institucional
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@utb.edu.co"
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 py-3 pl-10 pr-4 text-white placeholder:text-gray-400 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 py-3 pl-10 pr-12 text-white placeholder:text-gray-400 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-800 bg-red-900/20 p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>

            {/* Demo Access */}
            <div className="mt-6 border-t border-gray-700 pt-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("demo@utb.edu.co")
                    setPassword("demo123")
                  }}
                  className="rounded-lg border border-gray-600 py-2 text-gray-300 transition-colors hover:bg-gray-700"
                >
                  Estudiante demo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("docente@utb.edu.co")
                    setPassword("demo123")
                  }}
                  className="rounded-lg border border-blue-700 py-2 text-blue-300 transition-colors hover:bg-blue-900/20"
                >
                  Docente demo
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-400">
            Universidad Tecnológica de Bolívar © 2026
          </p>
        </div>
      </section>

      {/* Right: Project name and description */}
      <section
        aria-label="Acerca de LevelUTB"
        className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 px-4 py-12 text-white sm:px-8"
      >
        {/* Decorative circles */}
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5" />

        {/* Soft transition between the two halves: wide feathered gradient only,
            starting in the exact left-panel color so no line is visible */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden w-80 bg-gradient-to-r from-gray-900 via-gray-900/55 to-transparent lg:block" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-gray-900 via-gray-900/55 to-transparent lg:hidden" />

        <div className="relative z-10 w-full max-w-lg text-center">
          <div className="mx-auto mb-6 flex w-fit rounded-2xl bg-white px-5 py-3 shadow-lg">
            <Image
              src="/utblogotipo.png"
              alt="Universidad Tecnológica de Bolívar"
              width={180}
              height={94}
              className="h-auto w-44 object-contain"
            />
          </div>

          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">LevelUTB</h2>
          <p className="mt-2 text-lg font-medium text-blue-100">Experiencia de avance académico</p>

          <p className="mx-auto mt-5 max-w-md leading-relaxed text-blue-50">
            Plataforma gamificada para el seguimiento del avance académico de los estudiantes de la
            Universidad Tecnológica de Bolívar. Visualiza tu progreso en la malla curricular, gana
            puntos e insignias, completa misiones y canjea recompensas académicas.
          </p>

          <ul className="mx-auto mt-8 max-w-md space-y-3 text-left">
            <li className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
              <TrendingUp className="h-5 w-5 shrink-0 text-blue-100" />
              <span>Seguimiento de tu avance en la malla curricular</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
              <Trophy className="h-5 w-5 shrink-0 text-blue-100" />
              <span>Puntos, niveles e insignias por tus logros</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
              <Gift className="h-5 w-5 shrink-0 text-blue-100" />
              <span>Recompensas académicas y recomendaciones personalizadas</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
