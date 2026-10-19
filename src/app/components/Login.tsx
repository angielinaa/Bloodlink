import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Droplets, Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-white">
      {/* ── Main Container ── */}
      <div className="w-full max-w-[400px]">

        {/* ── Minimalist Brand Header ── */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 shadow-sm mb-3">
            <Droplets className="w-6 h-6 fill-rose-600 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            One Blood<span className="text-rose-600">!</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Platform Kolaborasi Donor &amp; Manajemen Stok Darah
          </p>
        </div>

        {/* ── Clean White Card ── */}
        <div className="bg-white border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-2xl overflow-hidden">

          {/* Segmented Control Tabs */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
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
                    className="block text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-1.5"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="nama@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isLocked}
                      required
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50/50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="text-[11px] font-semibold tracking-wide uppercase text-slate-500"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => toast.info('Silakan hubungi administrator jika Anda lupa password.')}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-medium transition-colors"
                    >
                      Lupa password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="login-password"
                      type={showLoginPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginPwd}
                      onChange={(e) => setLoginPwd(e.target.value)}
                      disabled={isLocked}
                      required
                      className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-50/50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPwd(!showLoginPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Lock Warning */}
                {isLocked && (
                  <div className="rounded-xl px-3.5 py-2.5 text-xs font-medium text-center bg-rose-50 border border-rose-200 text-rose-700">
                    Akun dikunci sementara. Coba lagi dalam {lockSec} detik.
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  id="login-submit-btn"
                  disabled={loginLoading || isLocked}
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.99] transition-all duration-200 shadow-sm shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loginLoading ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Masuk ke Sistem
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ════════════════════ REGISTER FORM ════════════════════ */
              <form onSubmit={handleRegister} className="space-y-3.5" autoComplete="off">
                {/* Nama Lengkap */}
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-1"
                  >
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="Contoh: Budi Santoso"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      maxLength={100}
                      required
                      className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-50/50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-1"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="nama@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      maxLength={150}
                      required
                      className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-50/50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all"
                    />
                  </div>
                </div>

                {/* Gol Darah & No HP */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="reg-blood"
                      className="block text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-1"
                    >
                      Gol. Darah
                    </label>
                    <select
                      id="reg-blood"
                      value={regBlood}
                      onChange={(e) => setRegBlood(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50/50 border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                        <option key={b} value={b} className="bg-white text-slate-900">
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-phone"
                      className="block text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-1"
                    >
                      No. WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        id="reg-phone"
                        type="tel"
                        placeholder="08123456789"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value.replace(/[^0-9+\-\s]/g, ''))}
                        maxLength={20}
                        required
                        className="w-full h-10 pl-8 pr-2.5 rounded-xl bg-slate-50/50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Alamat / Kota */}
                <div>
                  <label
                    htmlFor="reg-address"
                    className="block text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-1"
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
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50/50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="reg-password"
                      type={showRegPwd ? 'text' : 'password'}
                      placeholder="Min. 8 karakter (A-Z, 0-9, simbol)"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      maxLength={100}
                      required
                      className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-50/50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPwd(!showRegPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                            pwdStr.score >= 1 ? 'bg-rose-500' : 'bg-slate-200'
                          }`}
                        />
                        <div
                          className={`flex-1 rounded-full transition-all ${
                            pwdStr.score >= 2 ? 'bg-amber-500' : 'bg-slate-200'
                          }`}
                        />
                        <div
                          className={`flex-1 rounded-full transition-all ${
                            pwdStr.score >= 3 ? 'bg-emerald-500' : 'bg-slate-200'
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
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.99] transition-all duration-200 shadow-sm shadow-rose-600/25 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {regLoading ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
          <p className="text-[11px] text-slate-400">
            Terlindungi dengan enkripsi end-to-end. One Blood! © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
