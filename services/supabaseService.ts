
import { createClient } from '@supabase/supabase-js';
import { Provider, AttendanceRecord, AuditLog, FuelSupply, Vehicle } from '../types';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EQ77FYiIig_H3_HQXnwU9w_aE2dtnvW';

if (!SUPABASE_KEY.startsWith('eyJ')) {
  console.warn("AVISO: A SUPABASE_KEY não parece ser uma chave 'anon' válida (deve começar com 'eyJ'). Verifique as configurações no Supabase Dashboard.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper para converter Base64 em Blob para upload no Storage
const base64ToBlob = (base64: string) => {
  try {
    const parts = base64.split(';base64,');
    if (parts.length !== 2) return null;
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  } catch (e) {
    console.error("Erro ao converter base64 para blob:", e);
    return null;
  }
};

// --- Funções de Storage ---
export const uploadDocument = async (base64: string, path: string) => {
  if (!base64 || !base64.startsWith('data:')) return base64;
  
  const blob = base64ToBlob(base64);
  if (!blob) return null;

  const { data, error } = await supabase.storage
    .from('psc_documents')
    .upload(path, blob, { upsert: true });

  if (error) {
    console.warn("Falha no upload para o Storage.", error);
    return null; // Retornar null em vez de base64 para evitar estourar o limite do DB
  }
  
  const { data: { publicUrl } } = supabase.storage.from('psc_documents').getPublicUrl(data.path);
  return publicUrl;
};

// --- Mapeadores de Dados (JS <-> DB) ---
const mapAuditLogFromDB = (l: any): AuditLog => ({
  id: l.id,
  timestamp: l.timestamp,
  userName: l.user_name,
  action: l.action,
  details: l.details
});

const mapProviderFromDB = (p: any): Provider => ({
  id: p.id,
  name: p.name,
  processNumber: p.process_number,
  phone: p.phone,
  address: p.address,
  assignedEntity: p.assigned_entity,
  totalHoursToFulfill: p.total_hours_to_fulfill,
  status: p.status || 'active',
  returnReason: p.return_reason,
  returnAttachment: p.return_attachment,
  identityDoc: p.identity_doc,
  referralDoc: p.referral_doc,
  observations: p.observations,
  referralDate: p.referral_date,
  receiptDate: p.receipt_date,
  profilePhoto: p.profile_photo,
  history: (p.audit_logs || [])
    .map(mapAuditLogFromDB)
    .sort((a: AuditLog, b: AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
});

const mapProviderToDB = (p: Partial<Provider>) => ({
  name: p.name,
  process_number: p.processNumber,
  phone: p.phone,
  address: p.address,
  assigned_entity: p.assignedEntity,
  total_hours_to_fulfill: Number(p.totalHoursToFulfill) || 40,
  status: p.status || 'active',
  return_reason: p.returnReason,
  return_attachment: p.returnAttachment,
  identity_doc: p.identityDoc,
  referral_doc: p.referralDoc,
  observations: p.observations,
  referral_date: p.referralDate || null,
  // Fixed: Corrected receipt_date and profile_photo to use camelCase property names from the Provider type.
  receipt_date: p.receiptDate || null,
  profile_photo: p.profilePhoto
});

const mapAttendanceFromDB = (a: any): AttendanceRecord => ({
  id: a.id,
  providerId: a.provider_id,
  date: a.date,
  entryTime: a.entry_time || '',
  exitTime: a.exit_time || '',
  durationMinutes: a.duration_minutes,
  attachmentData: a.attachment_data,
  attachmentType: a.attachment_type,
  type: a.type || 'presence',
  reason: a.reason
});

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const isUUID = (id: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const mapAttendanceToDB = (a: AttendanceRecord) => {
  const dbData: any = {
    provider_id: a.providerId,
    date: a.date,
    entry_time: a.entryTime || null,
    exit_time: a.exitTime || null,
    duration_minutes: Number(a.durationMinutes) || 0,
    attachment_data: a.attachmentData,
    attachment_type: a.attachmentType,
    type: a.type || 'presence',
    reason: a.reason
  };
  
  // Se o ID for um UUID válido, nós o mantemos para o upsert (atualização).
  // Se for um ID temporário ou não for um UUID, geramos um novo UUID
  // para evitar o erro de "null value in column id" caso o banco não tenha default.
  if (a.id && isUUID(a.id)) {
    dbData.id = a.id;
  } else {
    // Geramos um ID aqui para garantir que nunca seja nulo
    dbData.id = generateUUID();
  }
  
  return dbData;
};

const mapFuelSupplyFromDB = (f: any): FuelSupply => ({
  id: f.id,
  date: f.date,
  location: f.location,
  cnpj: f.cnpj,
  fuelType: f.fuel_type,
  liters: f.liters,
  pricePerLiter: f.price_per_liter,
  totalValue: f.total_value,
  driver: f.driver,
  plate: f.plate,
  km: f.km,
  attendant: f.attendant,
  protocol: f.protocol,
  attachmentData: f.attachment_data,
  attachmentType: f.attachment_type,
  createdAt: f.created_at,
  history: (f.fuel_audit_logs || [])
    .map(mapAuditLogFromDB)
    .sort((a: AuditLog, b: AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
});

const mapFuelSupplyToDB = (f: FuelSupply) => ({
  id: f.id && isUUID(f.id) ? f.id : generateUUID(),
  date: f.date,
  location: f.location,
  cnpj: f.cnpj,
  fuel_type: f.fuelType,
  liters: Number(f.liters) || 0,
  price_per_liter: Number(f.pricePerLiter) || 0,
  total_value: Number(f.totalValue) || 0,
  driver: f.driver,
  plate: f.plate,
  km: Number(f.km) || 0,
  attendant: f.attendant,
  protocol: f.protocol,
  attachment_data: f.attachmentData,
  attachment_type: f.attachmentType
});

const mapVehicleFromDB = (v: any): Vehicle => ({
  id: v.id,
  plate: v.plate,
  fleetCode: v.fleet_code || '',
  model: v.model,
  brand: v.brand,
  year: v.year,
  color: v.color,
  photo: v.photo,
  createdAt: v.created_at
});

const mapVehicleToDB = (v: Partial<Vehicle>) => ({
  plate: v.plate,
  fleet_code: v.fleetCode,
  model: v.model,
  brand: v.brand,
  year: v.year,
  color: v.color,
  photo: v.photo
});

// --- Funções de Prestadores ---
export const getProviders = async () => {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select('*, audit_logs(*)');
      
    if (error) throw error;
    return (data || []).map(mapProviderFromDB);
  } catch (err: any) {
    console.error("Erro detalhado ao buscar prestadores:", {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code
    });
    if (err.message === 'Failed to fetch') {
      console.error("DICA: Verifique se o projeto Supabase está ativo ou se há bloqueio de rede (Firewall/VPN).");
    }
    throw err;
  }
};

export const createProvider = async (provider: Partial<Provider>) => {
  const { identityDoc, referralDoc, history } = provider;
  const dbData = mapProviderToDB(provider);
  
  const { data: newProvider, error } = await supabase
    .from('providers')
    .insert([dbData])
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir prestador no Supabase:", error);
    throw error;
  }
  
  if (!newProvider) {
    throw new Error("Falha ao recuperar o registro recém-criado.");
  }

  const updates: any = {};
  if (identityDoc && identityDoc.startsWith('data:')) {
    updates.identity_doc = await uploadDocument(identityDoc, `providers/${newProvider.id}/identity`);
  }
  if (referralDoc && referralDoc.startsWith('data:')) {
    updates.referral_doc = await uploadDocument(referralDoc, `providers/${newProvider.id}/referral`);
  }
  
  if (Object.keys(updates).length > 0) {
    await supabase.from('providers').update(updates).eq('id', newProvider.id);
  }

  if (history && history.length > 0) {
    await saveAuditLog(newProvider.id, history[0]);
  }

  return mapProviderFromDB({ ...newProvider, ...updates });
};

export const updateProvider = async (id: string, provider: Partial<Provider>) => {
  const dbData = mapProviderToDB(provider);
  
  const { error } = await supabase
    .from('providers')
    .update(dbData)
    .eq('id', id);

  if (error) throw error;
};

// --- Funções de Frequência ---
export const getAttendance = async () => {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) throw error;
    return (data || []).map(mapAttendanceFromDB);
  } catch (err: any) {
    console.error("Erro detalhado ao buscar frequência:", err);
    throw err;
  }
};

export const saveAttendance = async (records: AttendanceRecord[]) => {
  // Cache para evitar múltiplos uploads da mesma imagem no mesmo lote (comum em OCR)
  const uploadCache = new Map<string, string>();

  const processed = await Promise.all(records.map(async (r) => {
    let attachmentUrl = r.attachmentData;
    
    if (r.attachmentData && r.attachmentData.startsWith('data:')) {
      if (uploadCache.has(r.attachmentData)) {
        attachmentUrl = uploadCache.get(r.attachmentData)!;
      } else {
        const uploadedUrl = await uploadDocument(r.attachmentData, `attendance/${r.providerId}/${r.date}_${Date.now()}`);
        if (uploadedUrl && !uploadedUrl.startsWith('data:')) {
          uploadCache.set(r.attachmentData, uploadedUrl);
          attachmentUrl = uploadedUrl;
        } else {
          attachmentUrl = uploadedUrl;
        }
      }
    }
    
    return mapAttendanceToDB({ ...r, attachmentData: attachmentUrl });
  }));

  const { error } = await supabase.from('attendance').upsert(processed);
  if (error) {
    console.error("Erro ao salvar frequência no Supabase:", error);
    throw error;
  }
};

export const deleteAttendance = async (id: string) => {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) throw error;
};

// --- Funções de Abastecimento ---
export const getFuelSupplies = async () => {
  try {
    const { data, error } = await supabase
      .from('fuel_supplies')
      .select('*, fuel_audit_logs(*)')
      .order('date', { ascending: false });
      
    if (error) throw error;
    return (data || []).map(mapFuelSupplyFromDB);
  } catch (err: any) {
    console.error("Erro detalhado ao buscar abastecimentos:", err);
    throw err;
  }
};

export const saveFuelSupply = async (supply: FuelSupply) => {
  let attachmentUrl = supply.attachmentData;
  
  if (supply.attachmentData && supply.attachmentData.startsWith('data:')) {
    const uploadedUrl = await uploadDocument(supply.attachmentData, `fuel_supplies/${supply.date.split('T')[0]}_${Date.now()}`);
    if (uploadedUrl && !uploadedUrl.startsWith('data:')) {
      attachmentUrl = uploadedUrl;
    }
  }
  
  const dbData = mapFuelSupplyToDB({ ...supply, attachmentData: attachmentUrl });
  const { data: savedData, error } = await supabase.from('fuel_supplies').upsert([dbData]).select().single();
  
  if (error) {
    console.error("Erro ao salvar abastecimento no Supabase:", error);
    throw error;
  }

  return savedData ? mapFuelSupplyFromDB(savedData) : null;
};

export const saveFuelAuditLog = async (fuelSupplyId: string, log: AuditLog) => {
  const { error } = await supabase.from('fuel_audit_logs').insert([{
    fuel_supply_id: fuelSupplyId,
    user_name: log.userName,
    action: log.action,
    details: log.details,
    timestamp: new Date().toISOString()
  }]);
  
  if (error) {
    console.error("Erro ao salvar log de abastecimento no Supabase:", error);
    throw error;
  }
};

export const deleteFuelSupply = async (id: string) => {
  // Primeiro deletamos os logs de auditoria associados para evitar erro de chave estrangeira
  await supabase.from('fuel_audit_logs').delete().eq('fuel_supply_id', id);
  
  const { error } = await supabase.from('fuel_supplies').delete().eq('id', id);
  if (error) throw error;
};

// --- Funções de Veículos ---
export const getVehicles = async () => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('plate', { ascending: true });
      
    if (error) {
      if (error.code === 'PGRST205') {
        console.warn("Tabela 'vehicles' não encontrada. Certifique-se de criá-la no Supabase.");
        return [];
      }
      throw error;
    }
    return (data || []).map(mapVehicleFromDB);
  } catch (err) {
    console.error("Erro ao buscar veículos:", err);
    return [];
  }
};

export const saveVehicle = async (vehicle: Partial<Vehicle>) => {
  try {
    let photoUrl = vehicle.photo;
    
    // Se for uma nova foto em base64, fazemos o upload
    if (vehicle.photo && vehicle.photo.startsWith('data:')) {
      const uploadedUrl = await uploadDocument(vehicle.photo, `vehicles/${vehicle.plate}_${Date.now()}`);
      if (uploadedUrl && !uploadedUrl.startsWith('data:')) {
        photoUrl = uploadedUrl;
      }
    }
    
    const dbData = mapVehicleToDB({ ...vehicle, photo: photoUrl });
    
    let result;
    if (vehicle.id && isUUID(vehicle.id)) {
      result = await supabase.from('vehicles').update(dbData).eq('id', vehicle.id).select().single();
    } else {
      result = await supabase.from('vehicles').insert([dbData]).select().single();
    }
    
    if (result.error) {
      if (result.error.code === 'PGRST205') {
        throw new Error("A tabela 'vehicles' não existe no banco de dados. Por favor, crie-a para usar esta função.");
      }
      throw result.error;
    }

    return result.data ? mapVehicleFromDB(result.data) : null;
  } catch (err: any) {
    console.error("Erro ao salvar veículo:", err);
    throw err;
  }
};

export const deleteVehicle = async (id: string) => {
  try {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      if (error.code === 'PGRST205') {
        throw new Error("A tabela 'vehicles' não existe no banco de dados.");
      }
      throw error;
    }
  } catch (err: any) {
    console.error("Erro ao excluir veículo:", err);
    throw err;
  }
};

// --- Funções de Auditoria ---
export const saveAuditLog = async (providerId: string, log: AuditLog) => {
  const { error } = await supabase.from('audit_logs').insert([{
    provider_id: providerId,
    user_name: log.userName,
    action: log.action,
    details: log.details,
    timestamp: new Date().toISOString()
  }]);
  
  if (error) {
    console.error("Erro ao salvar log no Supabase:", error);
    throw error;
  }
};

// --- Funções de Autenticação ---
export const requestPasswordReset = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
  return true;
};
