import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('Por favor, preencha os dois campos de senha.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const res = await updatePassword(newPassword);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess('Senha redefinida com sucesso! Redirecionando para o login...');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2500);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl p-8 shadow-xs">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-neutral-900 text-white font-serif font-bold text-2xl mb-3">
            Z
          </div>
          <h1 className="text-xl font-bold tracking-widest text-neutral-900 font-serif">
            ZHAYA MATCH
          </h1>
          <p className="text-[11px] text-neutral-500 mt-1 uppercase tracking-wider font-mono">
            Nova Senha de Acesso
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Nova Senha
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="No mínimo 6 caracteres"
              required
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Confirme a Nova Senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite novamente"
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
              <span>Salvando...</span>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Nova Senha</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <Lock className="w-3 h-3" />
          <span>Painel Privado Zhaya</span>
        </div>
      </div>
    </div>
  );
};
