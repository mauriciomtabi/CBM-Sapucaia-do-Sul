
import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Loader2, CheckCircle2, AlertCircle, FileText, Smartphone } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { FuelSupply } from '../types';

interface Props {
  onExtracted: (supply: FuelSupply) => void;
  onCancel: () => void;
}

const FuelReceiptOCR: React.FC<Props> = ({ onExtracted, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const optimizeImage = (base64Str: string, maxDim = 2048, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      try {
        const optimized = await optimizeImage(rawBase64);
        setPreview(optimized);
      } catch {
        setPreview(rawBase64);
      }
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (globalThis as any).process?.env?.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key do Gemini não configurada.");
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Analise detalhadamente esta nota fiscal de abastecimento (NFC-e / SAT / Cupom Fiscal) e extraia os dados em formato JSON.

IMPORTANTE - DIRETRIZES CRÍTICAS:
1. Extraia a data e hora EXATAMENTE como constam na nota.
2. ATENÇÃO MÁXIMA PARA PLACA E KM:
   - Em postos de combustível, a PLACA e o KM raramente estão no topo; costumam estar em:
     * Campo 'INFORMAÇÕES COMPLEMENTARES', 'DADOS ADICIONAIS', 'OBSERVAÇÕES DO CONTRIBUINTE' ou 'MENSAGEM DE INTERESSE DO CONTRIBUINTE' (geralmente no rodapé do cupom, em letras pequenas).
     * ANOTADOS À MÃO (MANUSCRITOS) no cupom pelo motorista ou frentista (à caneta, carimbo ou rasurado).
   - Verifique cuidadosamente o documento inteiro de ponta a ponta para localizá-los!

CAMPOS A EXTRAIR:
- data: Data e hora do abastecimento (formato ISO local YYYY-MM-DDTHH:mm, ignore fuso horário)
- local: Nome fantasia ou razão social do posto ou estabelecimento
- cnpj: CNPJ do estabelecimento
- fuelType: Tipo de combustível (ex: Gasolina Comum, Gasolina Aditivada, Diesel S10, Diesel S500, Etanol)
- liters: Quantidade de litros abastecidos (número decimal)
- pricePerLiter: Preço por litro (número decimal)
- totalValue: Valor total pago em R$ (número decimal)
- driver: Nome do motorista (se disponível)
- plate: Placa do veículo.
  * Procure por prefixos como 'PLACA:', 'PL:', 'VEIC:', 'VEICULO:', 'VTR:', ou anotações à caneta.
  * Formatos brasileiros válidos: padrão antigo (ABC1234 ou ABC-1234) ou padrão Mercosul (ABC1D23).
  * Retorne a placa limpa (ex: 'ABC1234' ou 'ABC1D23' ou 'ABC-1234').
- km: Quilometragem atual / Odômetro do veículo (número inteiro).
  * Procure por 'KM', 'KM:', 'KM ATUAL', 'HODOMETRO', 'HOD:', 'ODOMETRO', ou anotações manuais como 'KM 124.500'.
  * REGRA CRÍTICA DE PONTUAÇÃO DO KM: Se constar com ponto separador de milhar (ex: '124.500' ou '85.200 km'), remova os pontos e retorne como NÚMERO INTEIRO (ex: 124500 ou 85200). NUNCA retorne com ponto decimal de milhar.
- attendant: Nome do atendente ou frentista (se disponível)
- protocol: Número do protocolo, número da nota fiscal ou NFC-e (se disponível)

Se algum dado não for encontrado, deixe como string vazia ou zero para números.`;

      const mimeType = preview.match(/^data:(image\/[a-zA-Z+]+);base64,/)?.[1] || "image/jpeg";

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: preview.split(',')[1]
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              data: { type: Type.STRING },
              local: { type: Type.STRING },
              cnpj: { type: Type.STRING },
              fuelType: { type: Type.STRING },
              liters: { type: Type.NUMBER },
              pricePerLiter: { type: Type.NUMBER },
              totalValue: { type: Type.NUMBER },
              driver: { type: Type.STRING },
              plate: { type: Type.STRING },
              km: { type: Type.NUMBER },
              attendant: { type: Type.STRING },
              protocol: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      const getLocalISOString = (date: Date) => {
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
      };

      // Sanitizar placa
      let extractedPlate = (result.plate || '').trim().toUpperCase();
      extractedPlate = extractedPlate.replace(/^(PLACA|PL|VTR|VEICULO|VEIC)[:\s-]*/i, '').trim();

      // Sanitizar KM
      let parsedKm = 0;
      if (result.km) {
        let val = Number(result.km);
        // Se por ventura veio com casas decimais (ex: 124.500 virou 124.5 no JSON)
        if (!Number.isInteger(val) && val > 0 && val < 1000) {
          const str = String(result.km);
          const parts = str.split('.');
          if (parts[1]) {
            const paddedDecimals = parts[1].padEnd(3, '0');
            val = parseInt(parts[0] + paddedDecimals, 10);
          }
        }
        parsedKm = Math.round(val) || 0;
      }

      const supply: FuelSupply = {
        id: 'temp-' + Date.now(),
        date: result.data || getLocalISOString(new Date()),
        location: result.local || '',
        cnpj: result.cnpj || '',
        fuelType: result.fuelType || '',
        liters: result.liters || 0,
        pricePerLiter: result.pricePerLiter || 0,
        totalValue: result.totalValue || 0,
        driver: result.driver || '',
        plate: extractedPlate,
        km: parsedKm,
        attendant: result.attendant || '',
        protocol: result.protocol || '',
        attachmentData: preview,
        attachmentType: mimeType,
        createdAt: new Date().toISOString()
      };

      onExtracted(supply);
    } catch (err: any) {
      console.error("Erro no OCR:", err);
      setError("Não foi possível ler a nota. Tente tirar uma foto mais nítida ou preencher manualmente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-[3000] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <FileText size={20} />
            </div>
            <h3 className="font-black text-blue-900 uppercase tracking-tight text-sm">Digitalizar Nota</h3>
          </div>
          <button onClick={onCancel} className="p-2.5 hover:bg-blue-100 text-blue-400 transition-colors rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex flex-col items-center text-center space-y-6">
          {!preview ? (
            <>
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                <Camera size={40} />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Capturar Nota Fiscal</h4>
                <p className="text-slate-500 text-sm mt-2 font-medium">Posicione a nota em um local iluminado e evite reflexos para uma leitura precisa.</p>
              </div>
              <div className="flex flex-col w-full gap-3 pt-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest"
                >
                  <Camera size={18} />
                  Tirar Foto / Upload
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                />
              </div>
            </>
          ) : (
            <div className="w-full space-y-6">
              <div className="relative aspect-[3/4] w-full max-w-[300px] mx-auto rounded-3xl overflow-hidden border-4 border-slate-100 shadow-lg">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setPreview(null)}
                  className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-center text-left">
                  <AlertCircle className="text-red-500 shrink-0" size={20} />
                  <p className="text-xs text-red-700 font-bold">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button 
                  onClick={processImage}
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processando com IA...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Confirmar e Ler Dados
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setPreview(null)}
                  disabled={loading}
                  className="w-full py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-[10px] tracking-widest"
                >
                  Tirar Outra Foto
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FuelReceiptOCR;
