
import React from 'react';
import { Provider, AttendanceRecord, FuelSupply, Vehicle } from '../types';
import { formatMinutesToHHMM, getLatestVisit, getDaysInactivity } from '../utils/timeUtils';
import { Users, Clock, AlertCircle, CheckCircle, Calendar, ArrowUpRight, ShieldAlert, Fuel, DollarSign, Droplets, TrendingUp, LayoutDashboard, Car } from 'lucide-react';

interface Props {
  providers: Provider[];
  attendance: AttendanceRecord[];
  fuelSupplies: FuelSupply[];
  vehicles: Vehicle[];
  onNavigateProvider: (p: Provider) => void;
  onNavigateFuel: () => void;
}

const Dashboard: React.FC<Props> = ({ providers, attendance, fuelSupplies, vehicles, onNavigateProvider, onNavigateFuel }) => {
  const totalWorkedMinutes = attendance.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const activeProviders = providers.filter(p => p.status === 'active');
  const completedCount = providers.filter(p => p.status === 'completed').length;
  
  // Fuel Stats
  const totalFuelCost = fuelSupplies.reduce((acc, curr) => acc + curr.totalValue, 0);
  const totalLiters = fuelSupplies.reduce((acc, curr) => acc + curr.liters, 0);
  const avgPricePerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0;
  
  const inactivityAlerts = activeProviders.map(p => {
    const pAttendance = attendance.filter(a => a.providerId === p.id);
    const lastDate = getLatestVisit(pAttendance);
    const days = getDaysInactivity(lastDate);
    return { provider: p, days, lastDate };
  }).filter(item => item.days >= 10);

  const closeToFinishAlerts = activeProviders.map(p => {
    const pAttendance = attendance.filter(a => a.providerId === p.id);
    const totalMinutes = pAttendance.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const targetMinutes = (p.totalHoursToFulfill || 0) * 60;
    const progress = targetMinutes > 0 ? (totalMinutes / targetMinutes) * 100 : 0;
    return { provider: p, progress };
  }).filter(item => item.progress >= 90 && item.progress < 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" size={24} />
            Painel de Controle
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">Monitoramento em tempo real</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-[9px] font-black uppercase text-slate-400">
          <Calendar size={12} className="text-blue-600" />
          {new Date().toLocaleDateString('pt-BR')} • {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      {/* Stats Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Providers Stats Group */}
        <div className="xl:col-span-7 space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <Users size={14} className="text-blue-600" />
            Gestão de Prestadores
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard 
              icon={Users} 
              label="Ativos" 
              value={activeProviders.length.toString()} 
              color="blue" 
            />
            <StatCard 
              icon={Clock} 
              label="Horas" 
              value={formatMinutesToHHMM(totalWorkedMinutes)} 
              color="emerald" 
            />
            <StatCard 
              icon={CheckCircle} 
              label="Concluídos" 
              value={completedCount.toString()} 
              color="indigo" 
            />
            <StatCard 
              icon={ShieldAlert} 
              label="Alertas" 
              value={inactivityAlerts.length.toString()} 
              color="amber" 
            />
          </div>
        </div>

        {/* Fuel Stats Group */}
        <div className="xl:col-span-5 space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <Fuel size={14} className="text-blue-600" />
            Gestão de Abastecimento
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard 
              icon={DollarSign} 
              label="Total Gasto" 
              value={`R$ ${totalFuelCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} 
              color="slate" 
            />
            <StatCard 
              icon={Droplets} 
              label="Total Litros" 
              value={`${Math.round(totalLiters)}L`} 
              color="slate" 
            />
            <StatCard 
              icon={TrendingUp} 
              label="Preço Médio" 
              value={`R$ ${avgPricePerLiter.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
              color="slate" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alerts Section */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500" />
              Conformidade
            </h3>
            {inactivityAlerts.length + closeToFinishAlerts.length > 0 && (
              <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded-full border border-red-200">
                {inactivityAlerts.length + closeToFinishAlerts.length} PENDÊNCIAS
              </span>
            )}
          </div>
          
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
              {inactivityAlerts.length === 0 && closeToFinishAlerts.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tudo em ordem</p>
                </div>
              ) : (
                <>
                  {inactivityAlerts.map(item => (
                    <div key={item.provider.id} className="group flex gap-3 p-3 bg-red-50/50 hover:bg-red-50 rounded-2xl border border-red-100/50 transition-all">
                      <div className="bg-red-600 p-2 rounded-xl text-white shrink-0 h-fit shadow-lg shadow-red-200">
                        <AlertCircle size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-red-900 uppercase truncate">{item.provider.name}</p>
                        <p className="text-[9px] text-red-600 font-bold mt-0.5">Inativo há {item.days} dias</p>
                      </div>
                    </div>
                  ))}
                  {closeToFinishAlerts.map(item => (
                    <div key={item.provider.id} className="group flex gap-3 p-3 bg-blue-50/50 hover:bg-blue-50 rounded-2xl border border-blue-100/50 transition-all">
                      <div className="bg-blue-600 p-2 rounded-xl text-white shrink-0 h-fit shadow-lg shadow-blue-200">
                        <CheckCircle size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-blue-900 uppercase truncate">{item.provider.name}</p>
                        <p className="text-[9px] text-blue-600 font-bold mt-0.5">Atingiu {Math.round(item.progress)}% das horas</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Clock size={14} className="text-blue-600" />
              Atividade Recente
            </h3>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-2">
              <div className="grid grid-cols-1 gap-1">
                {(() => {
                  const activities = [
                    ...attendance.map(a => ({ type: 'attendance' as const, data: a, date: new Date(a.date) })),
                    ...fuelSupplies.map(f => ({ type: 'fuel' as const, data: f, date: new Date(f.date) }))
                  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);

                  if (activities.length === 0) {
                    return (
                      <div className="py-12 text-center">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Sem lançamentos recentes</p>
                      </div>
                    );
                  }

                  return activities.map(activity => {
                    if (activity.type === 'attendance') {
                      const record = activity.data as AttendanceRecord;
                      const p = providers.find(prov => prov.id === record.providerId);
                      return (
                        <div key={record.id} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-all rounded-2xl group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm border border-white shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {(p?.name || '?').charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-800 text-[11px] uppercase truncate">{p?.name || 'Desconhecido'}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                                <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Prestador</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-lg text-[9px] font-black">
                              +{formatMinutesToHHMM(record.durationMinutes)}
                            </span>
                            <button 
                              onClick={() => p && onNavigateProvider(p)}
                              className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-200 group-hover:text-blue-600 transition-all"
                              title="Ver Detalhes"
                            >
                              <ArrowUpRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      const supply = activity.data as FuelSupply;
                      const vehicle = vehicles.find(v => v.plate === supply.plate);
                      return (
                        <div key={supply.id} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-all rounded-2xl group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-9 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0 flex items-center justify-center shadow-sm group-hover:border-blue-200 transition-all">
                              {vehicle?.photo ? (
                                <img src={vehicle.photo} alt={supply.plate} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <Car size={16} className="text-slate-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-800 text-[11px] uppercase truncate">
                                {supply.plate.replace(/\s/g, '').length === 7 ? `${supply.plate.replace(/\s/g, '').slice(0, 3)} ${supply.plate.replace(/\s/g, '').slice(3)}` : supply.plate} 
                                <span className="ml-2 text-[9px] text-slate-400 font-bold">
                                  ({vehicles.find(v => v.plate === supply.plate)?.fleetCode || '-'})
                                </span>
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(supply.date).toLocaleDateString('pt-BR')}</span>
                                <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Abastecimento</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg text-[9px] font-black">
                              R$ {supply.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <button 
                              onClick={onNavigateFuel}
                              className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-200 group-hover:text-blue-600 transition-all"
                              title="Ver Abastecimentos"
                            >
                              <ArrowUpRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    }
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, className }: { icon: any, label: string, value: string, color: string, className?: string }) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white",
    amber: "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-600 group-hover:text-white",
    slate: "bg-slate-50 text-slate-600 border-slate-100 group-hover:bg-slate-800 group-hover:text-white"
  };

  return (
    <div className={`bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${className}`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2 rounded-xl border transition-all duration-300 ${colorClasses[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">{label}</p>
        <p className="text-lg font-black text-slate-900 tracking-tight truncate">{value}</p>
      </div>
    </div>
  );
};

export default Dashboard;
