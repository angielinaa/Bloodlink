import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Droplets, Mail, Lock, Eye, EyeOff, User, Phone,
  ArrowRight, Heart, HeartPulse, Building2, Truck, Sparkles, Check
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { toast } from 'sonner';
import { useAuth, UserRole } from '../context/AuthContext';

// ─── Helpers & Validasi ─────────────────────────────────────────────────────
function sanitize(raw: string): string {
  return raw.replace(/[<>'"`;\\]/g, '').trim().slice(0, 200);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPasswordSecure(pwd: string): boolean {
  return (
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
  );
}

function passwordStrength(pwd: string): { score: number; label: string; color: string } {
  if (pwd.length === 0) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;

  if (score <= 2) return { score: 1, label: 'Lemah', color: '#EF4444' };
  if (score <= 4) return { score: 2, label: 'Sedang', color: '#F59E0B' };
  return { score: 3, label: 'Kuat', color: '#10B981' };
}

// ─── Role Configuration ─────────────────────────────────────────────────────
const redirectByRole: Record<UserRole, string> = {
  pmi: '/dashboard/pmi',
  rs: '/dashboard/rs',
  donor: '/home',
  driver: '/dashboard/driver',
  superadmin: '/dashboard/superadmin',
};

// Akun Demo Bawaan untuk Akses Cepat 1-Klik
const DEMO_PRESETS = [
  { label: 'Pendonor', role: 'donor' as UserRole, email: 'donor@suroboyo.id', pass: 'Password123!', icon: Heart },
  { label: 'Admin PMI', role: 'pmi' as UserRole, email: 'pmi@suroboyo.id', pass: 'Password123!', icon: HeartPulse },
  { label: 'Rumah Sakit', role: 'rs' as UserRole, email: 'rs@suroboyo.id', pass: 'Password123!', icon: Building2 },
  { label: 'Driver', role: 'driver' as UserRole, email: 'driver@suroboyo.id', pass: 'Password123!', icon: Truck },
];

export default function Login() {
  usePageTitle('Masuk — One Blood!');
  const navigate = useNavigate();
  const { loginWithEmail, registerUser, isAuthenticated, user } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(redirectByRole[user.role] || '/home', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Form State - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  // Form State - Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBlood, setRegBlood] = useState('O+');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const pwdStr = passwordStrength(regPassword);
  const isLocked = lockUntil !== null && Date.now() < lockUntil;
  const lockSec = lockUntil ? Math.ceil((lockUntil - Date.now()) / 1000) : 0;

  // Quick fill handler
  const handleQuickFill = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPwd(pass);
    toast.info(`Akun ${email} terpasang.`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast.error(`Terlalu banyak percobaan. Silakan coba ${lockSec} detik lagi.`);
      return;
    }
    const email = sanitize(loginEmail);
    const pwd = loginPwd.slice(0, 200);

    if (!email || !pwd) {
      toast.error('Mohon isi email dan password.');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Format email tidak valid.');
      return;
    }

    setLoginLoading(true);
    try {
      const role = await loginWithEmail(email, pwd);
      toast.success('Login berhasil! Selamat datang.');
      setTimeout(() => navigate(redirectByRole[role] || '/home'), 400);
      setAttempts(0);
    } catch (err: any) {
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 5) {
        setLockUntil(Date.now() + 60_000);
        toast.error('Terlalu banyak percobaan gagal. Akun dikunci sementara 60 detik.');
      } else {
        toast.error(err?.message || 'Email atau password salah.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sanitize(regName);
    const email = sanitize(regEmail);
    const phone = sanitize(regPhone);
    const address = sanitize(regAddress) || 'Surabaya';
    const password = regPassword.slice(0, 200);

    if (!name || !email || !password) {
      toast.error('Mohon lengkapi nama, email, dan password.');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Format email tidak valid.');
      return;
    }
    if (!isPasswordSecure(password)) {
      toast.error('Password harus minimal 8 karakter dengan huruf besar, kecil, angka, dan simbol.');
      return;
    }

    setRegLoading(true);
    try {
      await registerUser({
        name,
        email,
        password,
        role: 'donor',
        org: 'Pendonor Mandiri',
        bloodType: regBlood,
        phone,
        address,
      });
      toast.success('Pendaftaran berhasil! Akun Anda siap digunakan.');
      setTimeout(() => navigate('/home'), 400);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mendaftar. Silakan periksa kembali data Anda.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#0A0B0E]">
      {/* ── Ambient Background Glow (Minimalist & Soft) ── */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-red-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Subtle Background Grid ── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── Main Container ── */}
      <div className="relative w-full max-w-[430px] z-10">

        {/* ── Minimalist Header ── */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 shadow-md shadow-rose-900/40 text-white mb-3 ring-1 ring-white/20">
            <Droplets className="w-6 h-6 fill-white drop-shadow" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            One Blood<span className="text-rose-500">!</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1 font-normal">
            Platform Kolaborasi Donor &amp; Manajemen Stok Darah
          </p>
        </div>

        {/* ── Clean Card ── */}
        <div className="bg-[#12141A]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden">

          {/* Segmented Control Tabs */}
          <div className="p-3 border-b border-white/[0.06] bg-black/20">
            <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-xl border border-white/[0.05]">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Daftar Baru
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* ════════════════════ LOGIN FORM ════════════════════ */}
            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-[11px] font-medium tracking-wide uppercase text-neutral-400 mb-1.5"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="nama@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isLocked}
                      required
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500/80 focus:bg-white/[0.06] focus:ring-2 focus:ring-rose-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="text-[11px] font-medium tracking-wide uppercase text-neutral-400"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => toast.info('Gunakan password demo: Password123!')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      Lupa password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      id="login-password"
                      type={showLoginPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginPwd}
                      onChange={(e) => setLoginPwd(e.target.value)}
                      disabled={isLocked}
                      required
                      className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500/80 focus:bg-white/[0.06] focus:ring-2 focus:ring-rose-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPwd(!showLoginPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Lock Warning */}
                {isLocked && (
                  <div className="rounded-xl px-3.5 py-2.5 text-xs font-medium text-center bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    Akun dikunci sementara. Coba lagi dalam {lockSec} detik.
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  id="login-submit-btn"
                  disabled={loginLoading || isLocked}
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.99] transition-all duration-200 shadow-md shadow-rose-900/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loginLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Masuk ke Sistem
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* ── Demo Quick Fill Section ── */}
                <div className="pt-3 border-t border-white/[0.06] mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-rose-400" />
                      Akun Demo (1-Klik Isi):
                    </span>
                    <span className="text-[10px] text-neutral-400">Pass: Password123!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DEMO_PRESETS.map((preset) => {
                      const Icon = preset.icon;
                      const isSelected = loginEmail === preset.email;
                      return (
                        <button
                          key={preset.role}
                          type="button"
                          onClick={() => handleQuickFill(preset.email, preset.pass)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-all ${
                            isSelected
                              ? 'bg-rose-500/20 text-rose-200 border border-rose-500/30'
                              : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.07] border border-transparent'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="truncate">{preset.label}</span>
                          {isSelected && <Check className="w-3 h-3 ml-auto text-rose-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>
            ) : (
              /* ════════════════════ REGISTER FORM ════════════════════ */
              <form onSubmit={handleRegister} className="space-y-3.5" autoComplete="off">
                {/* Nama Lengkap */}
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-[11px] font-medium tracking-wide uppercase text-neutral-400 mb-1"
                  >
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="Contoh: Budi Santoso"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      maxLength={100}
                      required
                      className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-[11px] font-medium tracking-wide uppercase text-neutral-400 mb-1"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="nama@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      maxLength={150}
                      required
                      className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Gol Darah & No HP */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="reg-blood"
                      className="block text-[11px] font-medium tracking-wide uppercase text-neutral-400 mb-1"
                    >
                      Gol. Darah
                    </label>
                    <select
                      id="reg-blood"
                      value={regBlood}
                      onChange={(e) => setRegBlood(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-medium text-white focus:outline-none focus:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20 transition-all"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                        <option key={b} value={b} className="bg-neutral-900 text-white">
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-phone"
                      className="block text-[11px] font-medium tracking-wide uppercase text-neutral-400 mb-1"
                    >
                      No. WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                      <input
                        id="reg-phone"
                        type="tel"
                        placeholder="08123456789"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value.replace(/[^0-9+\-\s]/g, ''))}
                        maxLength={20}
                        required
                        className="w-full h-10 pl-8 pr-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Alamat / Kota */}
                <div>
                  <label
                    htmlFor="reg-address"
                    className="block text-[11px] font-medium tracking-wide uppercase text-neutral-400 mb-1"
                  >
                    Domisili / Kota
                  </label>
                  <input
                    id="reg-address"
                    type="text"
                    placeholder="Contoh: Surabaya Timur"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    maxLength={150}
                    className="w-full h-10 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20 transition-all"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-[11px] font-medium tracking-wide uppercase text-neutral-400 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      id="reg-password"
                      type={showRegPwd ? 'text' : 'password'}
                      placeholder="Min. 8 karakter (A-Z, 0-9, simbol)"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      maxLength={100}
                      required
                      className="w-full h-10 pl-10 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPwd(!showRegPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {regPassword.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex-1 flex gap-1 h-1">
                        <div
                          className={`flex-1 rounded-full transition-all ${
                            pwdStr.score >= 1 ? 'bg-red-500' : 'bg-white/10'
                          }`}
                        />
                        <div
                          className={`flex-1 rounded-full transition-all ${
                            pwdStr.score >= 2 ? 'bg-amber-500' : 'bg-white/10'
                          }`}
                        />
                        <div
                          className={`flex-1 rounded-full transition-all ${
                            pwdStr.score >= 3 ? 'bg-emerald-500' : 'bg-white/10'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: pwdStr.color }}>
                        {pwdStr.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit Register */}
                <button
                  type="submit"
                  id="register-submit-btn"
                  disabled={regLoading}
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.99] transition-all duration-200 shadow-md shadow-rose-900/30 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {regLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Daftar Sebagai Pendonor'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Minimalist Footer Links ── */}
        <div className="text-center mt-6">
          <p className="text-[11px] text-neutral-400">
            Terlindungi dengan enkripsi end-to-end. One Blood! © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
