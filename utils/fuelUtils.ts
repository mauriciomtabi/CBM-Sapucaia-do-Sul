
export const normalizeFuelType = (type: string): string => {
  const t = (type || '').toUpperCase().trim();
  
  // Gasolina
  if (t.includes('GASOLINA')) {
    if (t.includes('ADITIVADA')) return 'GASOLINA ADITIVADA';
    return 'GASOLINA COMUM';
  }
  
  // Diesel
  if (t.includes('DIESEL') || t.includes('S-10') || t.includes('S10')) {
    return 'DIESEL S10';
  }
  
  // Etanol
  if (t.includes('ETANOL') || t.includes('ALCOOL')) {
    return 'ETANOL';
  }
  
  return t || 'NÃO IDENTIFICADO';
};

export const getStationDisplayName = (originalName: string, nicknames: Record<string, string>): string => {
  return nicknames[originalName] || originalName;
};
