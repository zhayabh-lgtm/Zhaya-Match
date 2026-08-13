import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, KeyRound, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Repository } from '../lib/repository';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoBlackUrl, setLogoBlackUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState<boolean>(true);

  useEffect(() => {
    Repository.getAppearance()
      .then((settings) => {
        if (settings?.logoBlackUrl) {
          setLogoBlackUrl(settings.logoBlackUrl);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar logo no login:', err);
      })
      .finally(() => setLogoLoading(false));
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);

    try {
      const res = await signIn(email, password);
      if (res.error) {
        setError(res.error);
      } else {
        navigate('/admin/tipos-medidas', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Informe o seu e-mail cadastrado.');
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword(email);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl p-8 shadow-xs">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center min-h-[64px] justify-center">
          {logoLoading ? (
            <div className="h-9 w-36 bg-neutral-200 animate-pulse rounded mb-2" />
          ) : logoBlackUrl ? (
            <img
              src={logoBlackUrl}
              alt="Logo Zhaya"
              decoding="async"
              className="h-9 max-w-[180px] object-contain mb-2"
            />
          ) : (
            <div className="h-9 w-36 bg-neutral-100 border border-dashed border-neutral-300 rounded flex items-center justify-center mb-2">
              <span className="text-[10px] text-neutral-400 font-mono">LOGO ZHAYA</span>
            </div>
          )}
          <p className="text-xs text-neutral-600 font-medium mt-1">
            Acesse o painel administrativo da Zhaya Match.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setMode('forgot');
                  }}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-neutral-900 hover:bg-black text-white font-bold rounded text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Entrando...</span>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-xs text-neutral-600 leading-relaxed mb-2">
              Informe seu e-mail cadastrado para receber o link de redefinição de senha.
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                E-mail Cadastrado
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white font-bold rounded text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Enviando...</span>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Enviar E-mail de Recuperação</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setMode('login');
              }}
              className="w-full py-2 text-xs text-neutral-500 hover:text-neutral-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para o Login</span>
            </button>
          </form>
        )}

        <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <Lock className="w-3 h-3" />
          <span>Painel Privado Zhaya</span>
        </div>
      </div>
    </div>
  );
};
