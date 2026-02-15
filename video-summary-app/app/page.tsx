"use client";

import { useRouter } from "next/navigation";
import { Users, GraduationCap, Shield, MessageCircle, BookOpen, Video } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const whatsappNumber = "+50661943970";
  const whatsappMessage = encodeURIComponent("Hola, me interesa información sobre las tutorías.");

  return (
    <main className="min-h-screen bg-[#0f1113] text-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

        <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/30">
              <GraduationCap size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Academia UPC</h1>
              <p className="text-xs text-gray-400">Tutorías Personalizadas</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/student/login')}
              className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              <Users size={16} />
              Portal Estudiante
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors border-l border-white/10 pl-6"
            >
              <Shield size={16} />
              Administrador
            </button>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
            Aprende con los mejores tutores
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Tutorías individuales y grupales para alcanzar tus metas académicas.
            Horarios flexibles adaptados a ti.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => router.push('/registro/talleres')}
              className="group flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-emerald-900/30 transition-all transform hover:scale-105"
            >
              <Users size={24} />
              Inscribirse a un Taller
              <span className="text-emerald-300 group-hover:translate-x-1 transition-transform">→</span>
            </button>

            <button
              onClick={() => router.push('/registro/objetivos')}
              className="group flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-blue-900/30 transition-all transform hover:scale-105"
            >
              <GraduationCap size={24} />
              Cumplir una Meta
              <span className="text-blue-300 group-hover:translate-x-1 transition-transform">→</span>
            </button>

            <button
              onClick={() => router.push('/registro/estudiante')}
              className="group flex items-center justify-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 px-8 py-4 rounded-2xl font-semibold text-lg transition-all transform hover:scale-105"
            >
              <BookOpen size={24} className="text-blue-400" />
              Tutoría Individual
              <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">¿Por qué elegirnos?</h3>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[#1a1c1e] rounded-3xl p-8 border border-white/5 hover:border-blue-500/30 transition-colors">
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
              <Users className="text-blue-400" size={28} />
            </div>
            <h4 className="text-xl font-semibold mb-3">Tutores Expertos</h4>
            <p className="text-gray-400">
              Profesionales calificados con experiencia en sus áreas de especialización.
            </p>
          </div>

          <div className="bg-[#1a1c1e] rounded-3xl p-8 border border-white/5 hover:border-purple-500/30 transition-colors">
            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
              <BookOpen className="text-purple-400" size={28} />
            </div>
            <h4 className="text-xl font-semibold mb-3">Cursos Variados</h4>
            <p className="text-gray-400">
              Matemáticas, física, química, idiomas y más. Encuentra lo que necesitas.
            </p>
          </div>

          <div className="bg-[#1a1c1e] rounded-3xl p-8 border border-white/5 hover:border-green-500/30 transition-colors">
            <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6">
              <Video className="text-green-400" size={28} />
            </div>
            <h4 className="text-xl font-semibold mb-3">Clases Grabadas</h4>
            <p className="text-gray-400">
              Accede a las grabaciones de tus clases con resúmenes generados por IA.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-green-600/20 to-green-500/10 rounded-3xl p-8 md:p-12 border border-green-500/20 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="text-green-400" size={32} />
          </div>
          <h3 className="text-2xl font-bold mb-4">¿Tienes preguntas?</h3>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Contáctanos por WhatsApp y te ayudaremos con cualquier duda sobre nuestras tutorías.
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 px-8 py-4 rounded-2xl font-semibold text-lg transition-colors"
          >
            <MessageCircle size={24} />
            Escribir por WhatsApp
          </a>
          <p className="text-sm text-gray-500 mt-4">+506 6194 3970</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>© 2026 Academia UPC. Todos los derechos reservados.</p>
        </div>
      </footer>
    </main>
  );
}
