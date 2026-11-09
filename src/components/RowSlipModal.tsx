import React, { useState } from 'react';
import { Register, RowData, ColumnDef, DepartmentProfile } from '../types/register';
import { Language, translations } from '../utils/translations';
import { getRowCellValue, parseNumeric } from '../utils/calculations';
import { 
  Printer, 
  X, 
  FileText, 
  Award, 
  CreditCard, 
  UserCheck, 
  Download, 
  Calendar, 
  Building2, 
  CheckCircle2,
  QrCode,
  Share2
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';

export type SlipTemplate = 'receipt' | 'scorecard' | 'badge' | 'dossier';

interface RowSlipModalProps {
  register: Register;
  row: RowData;
  rowIndex: number;
  onClose: () => void;
  lang: Language;
  deptProfile?: DepartmentProfile;
}

export const RowSlipModal: React.FC<RowSlipModalProps> = ({
  register,
  row,
  rowIndex,
  onClose,
  lang,
  deptProfile,
}) => {
  const t = translations[lang];

  // Auto-detect best initial template based on register category or columns
  const defaultTemplate: SlipTemplate = 
    register.category === 'finance' || register.columns.some(c => c.type === 'currency' || c.name.toLowerCase().includes('fee') || c.name.toLowerCase().includes('amount'))
      ? 'receipt'
      : register.category === 'education' || register.columns.some(c => c.name.toLowerCase().includes('marks') || c.name.toLowerCase().includes('score'))
      ? 'scorecard'
      : 'dossier';

  const [template, setTemplate] = useState<SlipTemplate>(defaultTemplate);
  const [orgName, setOrgName] = useState<string>(
    register.title || 'Official Record Entry'
  );
  const [notes, setNotes] = useState<string>('This document is electronically generated and valid without physical signature.');

  const fullDeptAddress = '';

  const currentDate = new Date().toLocaleDateString(lang === 'te' ? 'te-IN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const slipNumber = `REC-${String(rowIndex + 1).padStart(4, '0')}-${new Date().getFullYear()}`;

  // Find candidate values
  const studentNameCol = register.columns.find(c => 
    c.name.toLowerCase().includes('name') || c.name.toLowerCase().includes('student') || c.name.toLowerCase().includes('person')
  );
  const primaryName = studentNameCol ? row[studentNameCol.id] : `Record #${rowIndex + 1}`;

  const idCol = register.columns.find(c => 
    c.name.toLowerCase().includes('roll') || c.name.toLowerCase().includes('id') || c.name.toLowerCase().includes('code')
  );
  const primaryId = idCol ? row[idCol.id] : `ID-${rowIndex + 1}`;

  const numericCols = register.columns.filter(c => c.type === 'number' || c.type === 'currency' || c.type === 'formula');
  const totalFormulaCol = register.columns.find(c => c.type === 'formula' || c.name.toLowerCase().includes('total'));

  const handlePrint = () => {
    window.print();
  };

  const whatsappSlipUrl = React.useMemo(() => {
    const textLines = [
      `📄 *${register.title}* · _${template.toUpperCase()}_`,
      `Ref: ${primaryId} | ${currentDate}`,
      `Subject: *${primaryName}*`,
      '─────────────────────',
      ...register.columns.slice(0, 8).map(c => {
        const v = getRowCellValue(row, c, register.columns);
        return v !== undefined && v !== null && String(v).trim() !== '' ? `• *${c.name}*: ${c.unit ? `${c.unit} ` : ''}${v}` : null;
      }).filter(Boolean),
      '─────────────────────',
      '_Generated via LogiXGridOS_'
    ];
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(textLines.join('\n'))}`;
  }, [register, row, template, primaryId, primaryName, currentDate]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#1c1c1e] text-white rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl max-w-4xl w-full flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Modal Toolbar (Screen Only) */}
        <div className="no-print p-4 sm:px-6 sm:py-3.5 border-b border-white/10 bg-[#161618] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>1-Click Document & Slip Generator</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                  Row #{rowIndex + 1}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Generate formatted printable receipts, report cards, or ID cards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <a
              href={whatsappSlipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#25D366] hover:bg-[#20ba59] active:scale-95 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              title="Direct Share Slip summary via WhatsApp"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
              <span>WhatsApp</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Template Selector Bar (Screen Only) */}
        <div className="no-print px-4 sm:px-6 py-2.5 bg-[#222226] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-zinc-400 text-[11px] mr-1 font-medium">Template:</span>
            <button
              onClick={() => setTemplate('receipt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                template === 'receipt'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payment Receipt</span>
            </button>
            <button
              onClick={() => setTemplate('scorecard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                template === 'scorecard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Student Scorecard</span>
            </button>
            <button
              onClick={() => setTemplate('badge')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                template === 'badge'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>ID / Entry Badge</span>
            </button>
            <button
              onClick={() => setTemplate('dossier')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                template === 'dossier'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Full Dossier Slip</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Header / Org Title"
              className="text-[11px] px-2.5 py-1 bg-black/30 border border-white/15 rounded-lg text-zinc-200 placeholder-zinc-500 max-w-[200px]"
              title="Edit institution name on printed slip"
            />
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-950 flex justify-center">
          
          {/* Printable White Document Sheet */}
          <div 
            id="printable-slip-sheet"
            className="w-full max-w-2xl bg-white text-zinc-900 rounded-xl shadow-xl p-6 sm:p-10 border border-zinc-200 print:shadow-none print:border-none print:m-0 print:p-6 print:w-full print:max-w-none transition-all"
          >
            {/* TEMPLATE 1: PAYMENT / FEE RECEIPT */}
            {template === 'receipt' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="border-b-2 border-zinc-900 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-900">
                      {orgName}
                    </h2>
                    {fullDeptAddress && (
                      <p className="text-[11px] text-zinc-600 font-medium">
                        {fullDeptAddress}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-zinc-600 mt-0.5">
                      OFFICIAL PAYMENT & TRANSACTION ACKNOWLEDGEMENT
                    </p>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      Register: {register.title}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider mb-1">
                      PAID / CONFIRMED
                    </span>
                    <div className="text-xs font-mono font-bold text-zinc-800">
                      {slipNumber}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Date: {currentDate}
                    </div>
                  </div>
                </div>

                {/* Primary Info Box */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Received From / Beneficiary</span>
                    <span className="text-sm font-bold text-zinc-900 block mt-0.5">{primaryName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">ID / Reference No.</span>
                    <span className="text-sm font-mono font-bold text-zinc-900 block mt-0.5">{primaryId || 'N/A'}</span>
                  </div>
                </div>

                {/* Breakdown Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Transaction Breakdown</h4>
                  <table className="w-full text-xs border border-zinc-300">
                    <thead className="bg-zinc-100 text-zinc-700 border-b border-zinc-300 font-bold">
                      <tr>
                        <th className="p-2.5 text-left">Item / Description</th>
                        <th className="p-2.5 text-left">Type / Notes</th>
                        <th className="p-2.5 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {register.columns.map((col) => {
                        const val = getRowCellValue(row, col, register.columns);
                        if (val === undefined || val === null || val === '') return null;
                        return (
                          <tr key={col.id}>
                            <td className="p-2.5 font-medium text-zinc-800">{col.name}</td>
                            <td className="p-2.5 text-zinc-500 text-[11px] capitalize">{col.type}</td>
                            <td className="p-2.5 text-right font-mono font-semibold text-zinc-900">
                              {col.unit ? `${col.unit} ` : ''}
                              {typeof val === 'number' ? val.toLocaleString() : String(val)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Signatures & Watermark */}
                <div className="pt-8 border-t border-zinc-200 grid grid-cols-2 gap-8 text-xs">
                  <div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed italic">{notes}</p>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
                      <QrCode className="w-6 h-6 text-zinc-400" />
                      <span>Scan for offline digital verification</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-end">
                    <div className="h-10 border-b border-zinc-400 w-36 ml-auto" />
                    <span className="text-[11px] font-bold text-zinc-700 mt-1">Authorized Signatory</span>
                    <span className="text-[10px] text-zinc-500">Accounts & Registration Officer</span>
                  </div>
                </div>
              </div>
            )}

            {/* TEMPLATE 2: STUDENT SCORECARD / REPORT CARD */}
            {template === 'scorecard' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center border-b-2 border-zinc-900 pb-4 space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-900">
                    {orgName}
                  </h2>
                  {fullDeptAddress && (
                    <p className="text-xs text-zinc-600 font-medium">
                      {fullDeptAddress}
                    </p>
                  )}
                  <p className="text-xs font-bold text-zinc-600 mt-0.5 tracking-wider uppercase">
                    STUDENT ACADEMIC SCORECARD & PERFORMANCE RECORD
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Course / Register: {register.title}
                  </p>
                </div>

                {/* Student Details Card */}
                <div className="bg-zinc-50 border border-zinc-300 rounded-lg p-3.5 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500 block">Student Name</span>
                    <span className="text-sm font-bold text-zinc-900 block mt-0.5">{primaryName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500 block">Roll / ID Number</span>
                    <span className="text-sm font-mono font-bold text-zinc-900 block mt-0.5">{primaryId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500 block">Issue Date</span>
                    <span className="text-sm font-medium text-zinc-800 block mt-0.5">{currentDate}</span>
                  </div>
                </div>

                {/* Academic Evaluation Marks Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Evaluation Breakdown</h4>
                  <table className="w-full text-xs border border-zinc-300">
                    <thead className="bg-zinc-100 text-zinc-700 border-b border-zinc-300 font-bold">
                      <tr>
                        <th className="p-2.5 text-left">Subject / Assessment Component</th>
                        <th className="p-2.5 text-center">Score / Grade</th>
                        <th className="p-2.5 text-right">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {register.columns.map((col) => {
                        const raw = getRowCellValue(row, col, register.columns);
                        if (raw === undefined || raw === null || raw === '') return null;
                        const isScore = col.type === 'number' || col.type === 'formula';
                        return (
                          <tr key={col.id} className={col.type === 'formula' ? 'bg-blue-50 font-bold' : ''}>
                            <td className="p-2.5 text-zinc-900">
                              {col.name}
                              {col.formula && <span className="text-[10px] font-mono text-zinc-500 block">({col.formula})</span>}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-zinc-900">
                              {col.unit ? `${col.unit} ` : ''}
                              {typeof raw === 'number' ? raw.toLocaleString() : String(raw)}
                            </td>
                            <td className="p-2.5 text-right text-zinc-600">
                              {isScore ? (parseNumeric(raw) >= 35 ? 'Satisfactory' : 'Needs Focus') : 'Recorded'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Score Summary Box */}
                {totalFormulaCol && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-emerald-900 text-sm block">Final Outcome Result</span>
                      <span className="text-emerald-700 text-[11px]">Academic evaluation verified by institutional system</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black font-mono text-emerald-800">
                        {getRowCellValue(row, totalFormulaCol, register.columns)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Signatures */}
                <div className="pt-8 border-t border-zinc-200 grid grid-cols-2 gap-8 text-xs">
                  <div>
                    <div className="h-10 border-b border-zinc-400 w-36" />
                    <span className="text-[11px] font-bold text-zinc-700 mt-1 block">Class Faculty / Evaluator</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="h-10 border-b border-zinc-400 w-36" />
                    <span className="text-[11px] font-bold text-zinc-700 mt-1 block">Principal / Head of Dept</span>
                  </div>
                </div>
              </div>
            )}

            {/* TEMPLATE 3: ID / ENTRY BADGE */}
            {template === 'badge' && (
              <div className="max-w-md mx-auto border-2 border-zinc-900 rounded-2xl overflow-hidden shadow-lg p-0">
                {/* Badge Header Banner */}
                <div className="bg-zinc-900 text-white p-4 text-center">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest">{orgName}</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wider">OFFICIAL ADMISSION & ACCESS PASS</p>
                </div>

                {/* Badge Content */}
                <div className="p-6 text-center space-y-4">
                  {/* Photo Placeholder */}
                  <div className="w-24 h-24 mx-auto rounded-xl bg-zinc-100 border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400">
                    <UserCheck className="w-8 h-8 text-zinc-400" />
                    <span className="text-[9px] mt-1 font-bold">PHOTO</span>
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-zinc-900 uppercase">{primaryName}</h2>
                    <span className="inline-block mt-1 font-mono text-xs font-bold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                      {primaryId}
                    </span>
                  </div>

                  {/* Key metadata grid */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-left grid grid-cols-2 gap-2 text-xs">
                    {register.columns.slice(0, 6).map((col) => {
                      const val = getRowCellValue(row, col, register.columns);
                      if (!val) return null;
                      return (
                        <div key={col.id}>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase block">{col.name}</span>
                          <span className="text-xs font-medium text-zinc-800 truncate block">{String(val)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* QR Barcode */}
                  <div className="pt-2 flex flex-col items-center">
                    <QrCode className="w-16 h-16 text-zinc-900" />
                    <span className="text-[9px] font-mono text-zinc-500 mt-1">VERIFY: {primaryId}</span>
                  </div>
                </div>

                {/* Badge Footer */}
                <div className="bg-zinc-100 p-2.5 text-center text-[10px] text-zinc-600 border-t border-zinc-200">
                  Valid for Academic Year {new Date().getFullYear()} • Non-Transferable
                </div>
              </div>
            )}

            {/* TEMPLATE 4: FULL RECORD DOSSIER */}
            {template === 'dossier' && (
              <div className="space-y-6">
                <div className="border-b-2 border-zinc-900 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-zinc-900 uppercase">
                      {orgName}
                    </h2>
                    {fullDeptAddress && (
                      <p className="text-[11px] text-zinc-600 font-medium">
                        {fullDeptAddress}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-zinc-600 mt-0.5">
                      COMPLETE RECORD DOSSIER & PROFILE DATA SHEET
                    </p>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      Register: {register.title}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-zinc-900 block">
                      Ref: {primaryId}
                    </span>
                    <span className="text-[11px] text-zinc-500 block">
                      Date: {currentDate}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden">
                  {register.columns.map((col) => {
                    const val = getRowCellValue(row, col, register.columns);
                    return (
                      <div key={col.id} className="p-3.5 flex items-start justify-between text-xs hover:bg-zinc-50">
                        <div className="max-w-[50%]">
                          <span className="font-bold text-zinc-800 block">{col.name}</span>
                          {col.description && (
                            <span className="text-[10px] text-zinc-500 block mt-0.5">{col.description}</span>
                          )}
                        </div>
                        <div className="text-right font-medium text-zinc-900">
                          {val !== undefined && val !== null && val !== '' ? (
                            <span className={col.type === 'formula' ? 'font-mono font-bold text-blue-700' : ''}>
                              {col.unit ? `${col.unit} ` : ''}
                              {typeof val === 'number' ? val.toLocaleString() : String(val)}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">None / Blank</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-zinc-200 flex justify-between text-xs text-zinc-500">
                  <span>Generated from Dynamic Offline PWA Register</span>
                  <span>Row Index #{rowIndex + 1}</span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
