
import React, { useState, useRef } from 'react';
import { Operator } from '../types';
import { User, Mail, Award, ShieldCheck, Save, Camera, ArrowLeft, Loader2, Lock, X, Eye, EyeOff, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

interface Props {
  user: Operator;
  onUpdate: (updatedUser: Operator) => void;
  onBack: () => void;
}

const UserProfile: React.FC<Props> = ({ user, onUpdate, onBack }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false });
  const [formData, setFormData] = useState<Operator>({ ...user });
  
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onUpdate(formData);
    setIsEditing(false);
    setIsLoading(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, profilePhoto: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm || passwordData.new.length < 6) return;

    setPasswordStatus('loading');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setPasswordStatus('success');
    
    setTimeout(() => {
      setIsPasswordModalOpen(false);
      setPasswordStatus('idle');
      setPasswordData({ current: '', new: '', confirm: '' });
    }, 2000);
  };

  const ranks = [
    "Soldado", "Cabo", "3º Sargento", "2º Sargento", "1º Sargento", 
    "Subtenente", "2º Tenente", "1º Tenente", "Capitão", "Major", 
    "Tenente-Coronel", "Coronel", "Outro"
  ];

  const inputClasses = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-800 font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-400 text-sm";
  const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block";
  
  const passwordsMatch = passwordData.new === passwordData.confirm;
  const showMatchError = passwordData.confirm.length > 0 && !passwordsMatch;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <ArrowLeft size={18} /> Voltar
        </button>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Meu Perfil</h2>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden text-center p-8 space-y-6">
            <div className="relative w-32 h-32 mx-auto group">
              <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
              <div className="w-full h-full rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-4xl font-black border-4 border-white shadow-xl overflow-hidden relative z-10">
                {formData.profilePhoto ? (
                  <img src={formData.profilePhoto} alt={formData.name || 'Operador'} className="w-full h-full object-cover" />
                ) : (
                  (formData.warName || '?').charAt(0)
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-white p-2.5 rounded-2xl shadow-lg border border-slate-100 text-blue-600 hover:scale-110 active:scale-95 transition-all z-20"
                title="Alterar Foto"
              >
                <Camera size={18} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{(formData.rank || '')} {(formData.warName || 'OPERADOR')}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Operador de Sistema</p>
            </div>

            <div className="pt-6 border-t border-slate-50">
              <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 w-fit mx-auto">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Credenciais Ativas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-10">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className={labelClasses}>Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      disabled={!isEditing}
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className={`${inputClasses} pl-12 disabled:opacity-60 disabled:bg-slate-50`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClasses}>Nome de Guerra</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      disabled={!isEditing}
                      value={formData.warName || ''}
                      onChange={e => setFormData({...formData, warName: e.target.value.toUpperCase()})}
                      className={`${inputClasses} pl-12 disabled:opacity-60 disabled:bg-slate-50 uppercase`}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className={labelClasses}>CPF</label>
                  <input 
                    disabled
                    value={formData.cpf || ''}
                    className={`${inputClasses} bg-slate-100 cursor-not-allowed opacity-60`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={labelClasses}>E-mail Institucional</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      disabled={!isEditing}
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className={`${inputClasses} pl-12 disabled:opacity-60 disabled:bg-slate-50`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 max-w-[50%]">
                <label className={labelClasses}>Posto / Graduação</label>
                <div className="relative">
                  <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select 
                    disabled={!isEditing}
                    value={formData.rank || ''}
                    onChange={e => setFormData({...formData, rank: e.target.value})}
                    className={`${inputClasses} pl-12 appearance-none disabled:opacity-60 disabled:bg-slate-50`}
                  >
                    {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                {!isEditing ? (
                  <button 
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-3"
                  >
                    Habilitar Edição
                  </button>
                ) : (
                  <>
                    <button 
                      type="button"
                      onClick={() => { setIsEditing(false); setFormData({...user}); }}
                      className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-[0.98] transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-3"
                    >
                      {isLoading ? <Loader2 size={20} className="animate-spin" /> : <><Save size={18} /> Salvar Alterações</>}
                    </button>
                  </>
                )}
              </div>
            </form>

            <div className="mt-10 pt-10 border-t border-slate-50">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 block ml-1">Segurança</h4>
              <button 
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-4 text-slate-600 hover:text-blue-600 transition-colors group w-full text-left"
              >
                <div className="bg-slate-100 p-3 rounded-2xl group-hover:bg-blue-50 transition-colors">
                  <Lock size={18} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-black uppercase block">Alterar Senha de Acesso</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Trocar Senha</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8">
              {passwordStatus === 'success' ? (
                <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-800 uppercase">Senha Atualizada!</h4>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Protocolo concluído com sucesso</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className={labelClasses}>Senha Atual</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        required
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.current}
                        onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                        className={`${inputClasses} pl-12 pr-12`}
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelClasses}>Nova Senha (Mín. 6 caracteres)</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        required
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.new}
                        onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                        className={`${inputClasses} pl-12 pr-12`}
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelClasses}>Confirmar Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        required
                        type="password"
                        value={passwordData.confirm}
                        onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                        className={`${inputClasses} pl-12 ${showMatchError ? 'border-red-500 focus:ring-red-100 focus:border-red-500' : ''}`}
                        placeholder="••••••••"
                      />
                    </div>
                    {showMatchError && (
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5 mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                        <AlertCircle size={12} /> As senhas não coincidem
                      </p>
                    )}
                  </div>

                  <button 
                    type="submit"
                    disabled={passwordStatus === 'loading' || !passwordsMatch || passwordData.new.length < 6}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
                  >
                    {passwordStatus === 'loading' ? <Loader2 size={20} className="animate-spin" /> : "Confirmar Nova Senha"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
