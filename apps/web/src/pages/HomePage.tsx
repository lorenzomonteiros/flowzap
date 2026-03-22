import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/auth.service.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { useToast } from '../hooks/useToast.ts';
import { ToastContainer } from '../components/ui/Toast.tsx';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome precisa ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha precisa ter pelo menos 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export function HomePage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (data: LoginForm) => {
    try {
      const result = await authService.login(data);
      login(result.user, result.accessToken);
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer login';
      if (message.includes('credentials') || message.includes('Invalid')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error(message);
      }
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    try {
      const result = await authService.register(data);
      login(result.user, result.accessToken);
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar conta';
      if (message.includes('already')) {
        toast.error('Este email já está em uso');
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gold-gradient flex items-center justify-center mb-4 shadow-gold">
            <Zap size={28} className="text-bg-primary" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-gold-gradient mb-2">FlowZap</h1>
          <p className="text-text-secondary text-sm text-center">
            Automação de WhatsApp para quem quer resultados
          </p>
        </div>

        {/* Card */}
        <div className="bg-bg-secondary border border-gold-muted rounded-card shadow-card animate-fade-in">
          {/* Tabs */}
          <div className="flex border-b border-gold-muted">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'login'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'register'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Cadastrar
            </button>
          </div>

          <div className="p-6">
            {tab === 'login' ? (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="seu@email.com"
                  error={loginForm.formState.errors.email?.message}
                  {...loginForm.register('email')}
                />
                <div className="relative">
                  <Input
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    error={loginForm.formState.errors.password?.message}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-0.5"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                    {...loginForm.register('password')}
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={loginForm.formState.isSubmitting}
                >
                  Entrar
                </Button>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <Input
                  label="Nome completo"
                  type="text"
                  placeholder="Seu nome"
                  error={registerForm.formState.errors.name?.message}
                  {...registerForm.register('name')}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="seu@email.com"
                  error={registerForm.formState.errors.email?.message}
                  {...registerForm.register('email')}
                />
                <div className="relative">
                  <Input
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    error={registerForm.formState.errors.password?.message}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-0.5"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                    {...registerForm.register('password')}
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={registerForm.formState.isSubmitting}
                >
                  Criar conta
                </Button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          Plataforma gratuita de automação WhatsApp
        </p>
      </div>

      <ToastContainer />
    </div>
  );
}
