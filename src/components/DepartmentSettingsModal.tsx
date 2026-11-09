import React, { useState } from 'react';
import { DepartmentProfile } from '../types/register';
import { Language, translations } from '../utils/translations';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  X, 
  Check, 
  Printer, 
  Sparkles, 
  FileText,
  RotateCcw,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface DepartmentSettingsModalProps {
  profile: DepartmentProfile;
  onSave: (updated: DepartmentProfile) => void;
  onClose: () => void;
  lang: Language;
}

export const defaultDepartmentProfile: DepartmentProfile = {
  departmentName: '',
  departmentNameTe: '',
  subDepartment: '',
  addressLine1: '',
  addressLine2: '',
  cityStatePincode: '',
  contactNumber: '',
  email: '',
  officeCode: '',
  showOnAppHeader: true,
  showOnPrintHeader: true,
};

export const DepartmentSettingsModal: React.FC<DepartmentSettingsModalProps> = ({
  profile,
  onSave,
  onClose,
  lang,
}) => {
  const t = translations[lang];
  const [formData, setFormData] = useState<DepartmentProfile>({ ...profile });
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const presets = [
    {
      label: 'School / College Education',
      name: 'Department of School & Higher Education',
      sub: 'Examination, Attendance & Student Evaluation Wing',
      addr1: 'District Educational Office, Collectorate Complex',
      addr2: 'Court Road, Sub-Division Area',
      city: 'Warangal, Telangana - 506001',
      contact: '+91 870 2456789',
      email: 'deo.education@telangana.gov.in',
      code: 'TS-EDU-SEC-2026',
    },
    {
      label: 'Municipal / Revenue Accounts',
      name: 'Department of Municipal Administration & Revenue',
      sub: 'Tax, Ledger & Registry Operations Branch',
      addr1: 'Municipal Corporation Head Office, Civic Towers',
      addr2: 'Tank Bund Road, Circle-IV',
      city: 'Hyderabad, Telangana - 500029',
      contact: '+91 40 2311 0000',
      email: 'revenue.ghmc@telangana.gov.in',
      code: 'GHMC-REV-REG-01',
    },
    {
      label: 'Health & Medical Services',
      name: 'Department of Health & Medical Services',
      sub: 'Patient Admissions & Records Division',
      addr1: 'District General Hospital Complex',
      addr2: 'Health Care Enclave, Main Road',
      city: 'Nizamabad, Telangana - 503001',
      contact: '+91 8462 234567',
      email: 'health.records@telangana.gov.in',
      code: 'DMHO-MED-2026',
    },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setFormData((prev) => ({
      ...prev,
      departmentName: preset.name,
      subDepartment: preset.sub,
      addressLine1: preset.addr1,
      addressLine2: preset.addr2,
      cityStatePincode: preset.city,
      contactNumber: preset.contact,
      email: preset.email,
      officeCode: preset.code,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setShowSavedFeedback(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#1c1c1e] text-white rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#161618] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Department Profile & Print Letterhead</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  Active Branding
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Change application branding name and configure official printed document header
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          
          {/* Quick Presets Bar */}
          <div className="bg-[#161618] border border-white/5 p-3 rounded-xl space-y-2">
            <span className="text-[11px] font-semibold text-zinc-400 block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Quick Department Presets:</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-blue-500/20 hover:text-blue-300 border border-white/10 text-zinc-300 transition-all cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Department Name & Sub-Department */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Department / Institution / Office Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                placeholder="e.g. Department of School Education"
                className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/15 rounded-xl focus:border-blue-500 focus:outline-none font-medium"
              />
              <span className="text-[10px] text-zinc-500 mt-0.5 block">
                This replaces the default app header name and appears at the top of all records.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Sub-Division / Branch / Wing
                </label>
                <input
                  type="text"
                  value={formData.subDepartment || ''}
                  onChange={(e) => setFormData({ ...formData, subDepartment: e.target.value })}
                  placeholder="e.g. Academic Examination & Records Cell"
                  className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/15 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Office Code / Institutional ID
                </label>
                <input
                  type="text"
                  value={formData.officeCode || ''}
                  onChange={(e) => setFormData({ ...formData, officeCode: e.target.value })}
                  placeholder="e.g. DEPT-TS-2026-REG"
                  className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/15 rounded-xl focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Telugu Department Name (ఐచ్ఛికం / Optional)
              </label>
              <input
                type="text"
                value={formData.departmentNameTe || ''}
                onChange={(e) => setFormData({ ...formData, departmentNameTe: e.target.value })}
                placeholder="ఉదాహరణ: విద్యా మరియు పరీక్షల శాఖ"
                className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/15 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Institutional Address */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Department Address</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Address Line 1 (Building / Complex / Room No.) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="e.g. District Administrative Complex, Block-B, 3rd Floor"
                  className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/15 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Address Line 2 (Street / Road / Area)
                </label>
                <input
                  type="text"
                  value={formData.addressLine2 || ''}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="e.g. Secretariat Road, Hill View Zone"
                  className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/15 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  City, State & PIN Code <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.cityStatePincode || ''}
                  onChange={(e) => setFormData({ ...formData, cityStatePincode: e.target.value })}
                  placeholder="e.g. Hyderabad, Telangana - 500022"
                  className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/15 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Official Contact Number
                </label>
                <input
                  type="text"
                  value={formData.contactNumber || ''}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  placeholder="e.g. +91 40 2345 6789"
                  className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/15 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. department.contact@telangana.gov.in"
                  className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/15 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="flex items-center gap-2.5 p-2 bg-[#161618] rounded-xl border border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showOnAppHeader !== false}
                onChange={(e) => setFormData({ ...formData, showOnAppHeader: e.target.checked })}
                className="w-4 h-4 rounded accent-blue-500"
              />
              <span className="text-xs text-zinc-200">
                Show Department Name as the Primary App Title in Header and Navigation Bar
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-2 bg-[#161618] rounded-xl border border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showOnPrintHeader !== false}
                onChange={(e) => setFormData({ ...formData, showOnPrintHeader: e.target.checked })}
                className="w-4 h-4 rounded accent-blue-500"
              />
              <span className="text-xs text-zinc-200">
                Include Official Department Letterhead & Full Address on All Printed Reports & Slips
              </span>
            </label>
          </div>

          {/* Live Print Header Preview Box */}
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <span className="text-[11px] font-semibold text-zinc-400 block flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Printed Header Preview (How it appears on paper):</span>
            </span>

            <div className="bg-white text-zinc-900 p-4 rounded-xl border border-zinc-300 text-center space-y-1 shadow-sm">
              <h4 className="text-base font-black uppercase tracking-tight text-zinc-900 leading-snug">
                {formData.departmentName || 'DEPARTMENT NAME'}
              </h4>
              {formData.subDepartment && (
                <p className="text-[11px] font-bold text-zinc-700 uppercase tracking-wide">
                  {formData.subDepartment}
                </p>
              )}
              <p className="text-[10px] text-zinc-600">
                {[formData.addressLine1, formData.addressLine2, formData.cityStatePincode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <div className="text-[9px] text-zinc-500 font-mono pt-0.5 border-t border-zinc-200 flex justify-center gap-3">
                {formData.contactNumber && <span>Tel: {formData.contactNumber}</span>}
                {formData.email && <span>Email: {formData.email}</span>}
                {formData.officeCode && <span>ID: {formData.officeCode}</span>}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setFormData(defaultDepartmentProfile)}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Department & Print Header</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
