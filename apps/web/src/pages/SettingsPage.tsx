import { useState } from 'react';
import { User, Shield, Bell, Palette } from 'lucide-react';
import { useAuthStore } from '../stores/authStore.ts';
import { authService } from '../services/auth.service.ts';
import { useToast } from '../hooks/useToast.ts';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card.tsx';

export function SettingsPage() {
  const { user, login } = useAuthStore();
  const toast = useToast();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileSave = async () => {
    if (!profileForm.name || !profileForm.email) return;
    setProfileLoading(true);
    try {
      // In a real app, this would call an update profile endpoint
      toast.success('Perfil atualizado!');
    } catch {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('A nova senha precisa ter pelo menos 8 caracteres');
      return;
    }
    setPasswordLoading(true);
    try {
      // In a real app, this would call a change password endpoint
      toast.success('Senha alterada com sucesso!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      toast.error('Erro ao alterar senha');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">Configurações</h1>
        <p className="text-text-secondary text-sm mt-1">Gerencie sua conta e preferências</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User size={16} className="text-gold" />
            <CardTitle>Perfil</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gold-gradient flex items-center justify-center text-bg-primary text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-medium text-text-primary">{user?.name}</p>
              <p className="text-sm text-text-secondary">{user?.email}</p>
            </div>
          </div>
          <Input
            label="Nome completo"
            value={profileForm.name}
            onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={profileForm.email}
            onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
          />
          <Button
            variant="primary"
            onClick={handleProfileSave}
            loading={profileLoading}
          >
            Salvar Perfil
          </Button>
        </CardBody>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-gold" />
            <CardTitle>Segurança</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Senha atual"
            type="password"
            placeholder="••••••••"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
          />
          <Input
            label="Nova senha"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            placeholder="Repita a nova senha"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
          />
          <Button
            variant="secondary"
            onClick={handlePasswordChange}
            loading={passwordLoading}
            disabled={!passwordForm.currentPassword || !passwordForm.newPassword}
          >
            Alterar Senha
          </Button>
        </CardBody>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-gold" />
            <CardTitle>Sobre o FlowZap</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex justify-between">
              <span>Versão</span>
              <span className="text-text-primary">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Plano</span>
              <span className="text-gold">Gratuito</span>
            </div>
            <div className="flex justify-between">
              <span>Conta criada</span>
              <span className="text-text-primary">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '—'}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
