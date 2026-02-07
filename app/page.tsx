'use client';

import React, { useState, useCallback, DragEvent, ChangeEvent } from 'react';

// Types
interface FileResult {
  name: string;
  source: string;
  transactions: Transaction[];
  count: number;
}

interface Transaction {
  source: string;
  description: string;
  dateAcquired: string;
  dateSold: string;
  proceeds: string;
  costBasis: string;
  washSale: string;
  gainLoss: string;
  termRaw: string;
  box: string;
}

// Translations
const translations = {
  ko: {
    brand: 'sort.',
    tagline: '브로커 거래 CSV 정리 & 변환 툴',
    features: '',
    security: '100% 로컬 처리 • 서버 저장 없음',
    steps: {
      addFiles: '파일 추가',
      review: '검토',
      download: '다운로드'
    },
    upload: {
      title: '브로커 CSV 파일 추가',
      subtitle: '클릭하거나 드래그 • 여러 파일 동시 가능',
      hint: '브로커 CSV 파일을 자동으로 정리합니다'
    },
    brokers: ['Fidelity', 'Robinhood', 'Coinbase'],
    footer: {
      processing: '로컬 처리 • 임시 메모리 사용',
      copyright: '© sort.',
      links: {
        privacy: '개인정보 정책',
        howItWorks: '사용법',
        refund: '환불 정책',
        terms: '이용약관',
        contact: '문의'
      },
      disclaimer: '이 툴은 브로커 CSV 데이터를 정리하고 표준 형식으로 변환하는 데이터 포맷 변환 도구입니다. 세금을 계산하거나, 세무 목적의 손익을 산정하거나, IRS 제출용 양식을 생성하지 않습니다. 출력물에는 오류가 포함될 수 있으며, 완전성이나 정확성을 보장하지 않습니다. 모든 결과물의 검증 및 제출에 대한 책임은 전적으로 사용자에게 있습니다. sort.는 세무, 법률, 재무 자문을 제공하지 않습니다. 현재 지원: Fidelity, Robinhood, Coinbase'
    },
    review: {
      title: '거래 내역 요약',
      summary: '요약',
      transactions: '거래',
      totalProceeds: '총 매도금액',
      totalCost: '총 취득원가',
      netGainLoss: '순손익',
      shortTerm: '단기',
      longTerm: '장기',
      export: '내보내기',
      exportAll: '전체 내보내기',
      back: '뒤로',
      next: '다음'
    },
    download: {
      title: '다운로드 준비 완료',
      subtitle: '표준 CSV 형식으로 변환되었습니다',
      downloadAll: '전체 다운로드 (CSV)',
      downloadShort: 'Part I - 단기 (CSV)',
      downloadLong: 'Part II - 장기 (CSV)',
      startOver: '처음부터 다시',
      transactionCount: '총 거래 수',
      fileCount: '파일 수'
    },
    table: {
      description: '자산 설명',
      acquired: '취득일',
      sold: '매도일',
      proceeds: '매도금액',
      cost: '취득원가',
      gainLoss: '손익',
      term: '기간',
      box: 'Box'
    }
  },
  en: {
    brand: 'sort.',
    tagline: 'Broker Trade CSV Organizer & Converter',
    features: '',
    security: '100% Local Processing • No Server Storage',
    steps: {
      addFiles: 'Add Files',
      review: 'Review',
      download: 'Download'
    },
    upload: {
      title: 'Add Broker CSV Files',
      subtitle: 'Click or drag & drop • Multiple files at once',
      hint: 'Automatically organizes broker CSV files'
    },
    brokers: ['Fidelity', 'Robinhood', 'Coinbase'],
    footer: {
      processing: 'Local processing • Temporary memory only',
      copyright: '© sort.',
      links: {
        privacy: 'Privacy Policy',
        howItWorks: 'How It Works',
        refund: 'Return Policy',
        terms: 'Terms of Service',
        contact: 'Contact'
      },
      disclaimer: 'This tool is a data formatting utility that organizes broker CSV data and converts it into a standardized format. It does NOT calculate taxes, determine gains or losses for tax purposes, or generate IRS-ready forms. Outputs may contain errors and are not guaranteed to be complete or accurate. Users are solely responsible for independently verifying all results and for any submissions. sort. does not provide tax, legal, or financial advice. Currently supported: Fidelity, Robinhood, Coinbase'
    },
    review: {
      title: 'Transaction Summary',
      summary: 'Summary',
      transactions: 'transactions',
      totalProceeds: 'Total Proceeds',
      totalCost: 'Total Cost',
      netGainLoss: 'Net Gain/Loss',
      shortTerm: 'Short',
      longTerm: 'Long',
      export: 'Export',
      exportAll: 'Export All',
      back: 'Back',
      next: 'Next'
    },
    download: {
      title: 'Ready to Download',
      subtitle: 'Converted to standardized CSV format',
      downloadAll: 'Download All (CSV)',
      downloadShort: 'Part I - Short-Term (CSV)',
      downloadLong: 'Part II - Long-Term (CSV)',
      startOver: 'Start Over',
      transactionCount: 'Total Transactions',
      fileCount: 'Files Processed'
    },
    table: {
      description: 'Description',
      acquired: 'Acquired',
      sold: 'Sold',
      proceeds: 'Proceeds',
      cost: 'Cost',
      gainLoss: 'Gain/Loss',
      term: 'Term',
      box: 'Box'
    }
  }
};

// Parser utilities
const parsers = {
  detectSource: (content: string): string => {
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const firstLine = normalized.split('\n')[0].trim();
    if (firstLine.includes('1099 Summary')) return 'Fidelity';
    if (normalized.includes('Robinhood Markets')) return 'Robinhood';
    if (normalized.includes('Transaction Type,Transaction ID,Tax lot ID')) return 'Coinbase';
    if (normalized.includes('Gain/loss report')) return 'Coinbase';
    return 'Other';
  },

  parseDate: (dateStr: string, source: string): string => {
    if (!dateStr || dateStr.trim() === '') return 'VARIOUS';
    if (source === 'Robinhood') {
      const clean = dateStr.trim();
      if (clean.length === 8) {
        return `${clean.slice(4,6)}/${clean.slice(6,8)}/${clean.slice(0,4)}`;
      }
    } else if (source === 'Fidelity') {
      const parts = dateStr.trim().split('/');
      if (parts.length === 3) {
        const year = parseInt(parts[2]) > 50 ? `19${parts[2]}` : `20${parts[2]}`;
        return `${parts[0]}/${parts[1]}/${year}`;
      }
    } else if (source === 'Coinbase') {
      return dateStr.trim();
    }
    return dateStr;
  },

  parseAmount: (amountStr: string | undefined): number => {
    if (!amountStr) return 0;
    const trimmed = amountStr.toString().trim();
    const direct = parseFloat(trimmed);
    if (!isNaN(direct)) return direct;
    const clean = trimmed.replace(/[^0-9.\-]/g, '');
    return parseFloat(clean) || 0;
  },

  parseFidelity: (content: string): Transaction[] => {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const transactions: Transaction[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith('1099-B-Detail,')) continue;

      const cols = line.split(',');
      if (cols.length < 22) continue;

      const description = cols[8]?.trim() || '';
      if (!description) continue;
      if (description.includes('1099-B-1a')) continue;

      const dateAcquired = parsers.parseDate(cols[11], 'Fidelity');
      const dateSold = parsers.parseDate(cols[12], 'Fidelity');
      const proceeds = parsers.parseAmount(cols[13]);
      const costBasis = parsers.parseAmount(cols[14]);
      const washSale = parsers.parseAmount(cols[16]);
      const gain = parsers.parseAmount(cols[17]);
      const loss = parsers.parseAmount(cols[18]);
      const term = cols[21]?.trim() || '';
      const covered = cols[22]?.trim() || '';

      const isLong = term.toUpperCase().includes('LONG');
      const isCovered = covered.toUpperCase().includes('COVERED') && !covered.toUpperCase().includes('NON');
      const box = isLong ? (isCovered ? 'D' : 'F') : (isCovered ? 'A' : 'C');

      transactions.push({
        source: 'Fidelity',
        description: description.substring(0, 35),
        dateAcquired,
        dateSold,
        proceeds: proceeds.toFixed(2),
        costBasis: costBasis.toFixed(2),
        washSale: washSale > 0 ? washSale.toFixed(2) : '',
        gainLoss: (gain - Math.abs(loss) + washSale).toFixed(2),
        termRaw: isLong ? 'Long' : 'Short',
        box
      });
    }
    return transactions;
  },

  parseRobinhood: (content: string): Transaction[] => {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const transactions: Transaction[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith('1099-B,')) continue;

      const cols = line.split(',');
      if (cols.length < 15) continue;

      const description = cols[5]?.trim() || '';
      if (!description || description === 'DESCRIPTION') continue;

      const dateAcquired = parsers.parseDate(cols[3], 'Robinhood');
      const dateSold = parsers.parseDate(cols[4], 'Robinhood');
      const costBasis = parsers.parseAmount(cols[7]);
      const proceeds = parsers.parseAmount(cols[8]);
      const term = cols[9]?.trim() || '';
      const washSale = parsers.parseAmount(cols[12]);
      const form8949Code = cols[14]?.trim() || '';

      const gainLoss = proceeds - costBasis + washSale;
      const isLong = term.toUpperCase() === 'LONG';

      transactions.push({
        source: 'Robinhood',
        description: description.substring(0, 35),
        dateAcquired,
        dateSold,
        proceeds: proceeds.toFixed(2),
        costBasis: costBasis.toFixed(2),
        washSale: washSale > 0 ? washSale.toFixed(2) : '',
        gainLoss: gainLoss.toFixed(2),
        termRaw: isLong ? 'Long' : 'Short',
        box: form8949Code || (isLong ? 'D' : 'A')
      });
    }
    return transactions;
  },

  parseCoinbase: (content: string): Transaction[] => {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const transactions: Transaction[] = [];

    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('Transaction Type,Transaction ID,Tax lot ID')) {
        headerIndex = i;
        break;
      }
    }
    if (headerIndex === -1) return transactions;

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        if (line[c] === '"') { inQuotes = !inQuotes; }
        else if (line[c] === ',' && !inQuotes) { cols.push(current); current = ''; }
        else { current += line[c]; }
      }
      cols.push(current);

      if (cols.length < 11) continue;

      const txType = cols[0]?.trim() || '';
      if (!['Sell', 'Trade', 'Convert'].includes(txType)) continue;

      const assetName = cols[3]?.trim() || '';
      const dateAcquired = parsers.parseDate(cols[5], 'Coinbase');
      const dateSold = parsers.parseDate(cols[7], 'Coinbase');
      const costBasis = parsers.parseAmount(cols[6]);
      const proceeds = parsers.parseAmount(cols[8]);
      const gainLoss = parsers.parseAmount(cols[9]);
      const holdingDays = parseInt(cols[10]) || 0;

      const isLong = holdingDays > 365;
      const box = isLong ? 'E' : 'B';

      const description = `${assetName} (${txType})`;

      transactions.push({
        source: 'Coinbase',
        description: description.substring(0, 35),
        dateAcquired,
        dateSold,
        proceeds: proceeds.toFixed(2),
        costBasis: costBasis.toFixed(2),
        washSale: '',
        gainLoss: gainLoss.toFixed(2),
        termRaw: isLong ? 'Long' : 'Short',
        box
      });
    }
    return transactions;
  }
};

const exportToCSV = (transactions: Transaction[], filename: string): void => {
  const headers = ['Description','Date Acquired','Date Sold','Proceeds','Cost Basis','Wash Sale Adj','Gain/Loss','Term','Box','Source'];
  const rows = transactions.map(t => [
    `"${t.description}"`, t.dateAcquired, t.dateSold, t.proceeds, t.costBasis,
    t.washSale, t.gainLoss, t.termRaw, t.box, t.source
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Sort Icon Component — minimal stacked bars
const SortIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="28" height="3.5" rx="1.75" fill="#f97316"/>
    <rect x="4" y="13.5" width="20" height="3.5" rx="1.75" fill="#fb923c" opacity="0.85"/>
    <rect x="4" y="21" width="13" height="3.5" rx="1.75" fill="#fdba74" opacity="0.7"/>
    <rect x="4" y="28.5" width="7" height="3.5" rx="1.75" fill="#fed7aa" opacity="0.5"/>
  </svg>
);

// Upload Icon Component
const UploadIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="20" width="48" height="36" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="2"/>
    <rect x="12" y="24" width="40" height="28" rx="2" fill="#0f172a"/>
    <path d="M24 38H40" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
    <path d="M24 44H36" stroke="#334155" strokeWidth="2" strokeLinecap="round"/>
    <rect x="16" y="8" width="32" height="24" rx="3" fill="#f97316"/>
    <path d="M32 14V26M32 14L26 20M32 14L38 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Main App Component
export default function Sort() {
  const [lang, setLang] = useState<'ko' | 'en'>('en');
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<FileResult[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const t = translations[lang];

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles = Array.from(fileList);
    const readers = newFiles.map(file => {
      return new Promise<FileResult>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const source = parsers.detectSource(content);
          let txns: Transaction[] = [];
          if (source === 'Fidelity') txns = parsers.parseFidelity(content);
          else if (source === 'Robinhood') txns = parsers.parseRobinhood(content);
          else if (source === 'Coinbase') txns = parsers.parseCoinbase(content);
          resolve({ name: file.name, source, transactions: txns, count: txns.length });
        };
        reader.readAsText(file);
      });
    });

    Promise.all(readers).then(results => {
      setFiles(prev => [...prev, ...results]);
      const allTxns = results.flatMap(r => r.transactions);
      setTransactions(prev => [...prev, ...allTxns]);
    });
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const resetAll = () => {
    setFiles([]);
    setTransactions([]);
    setStep(1);
  };

  const summary = {
    shortTerm: transactions.filter(tx => tx.termRaw === 'Short'),
    longTerm: transactions.filter(tx => tx.termRaw === 'Long'),
    totalProceeds: transactions.reduce((sum, tx) => sum + parseFloat(tx.proceeds), 0),
    totalCost: transactions.reduce((sum, tx) => sum + parseFloat(tx.costBasis), 0),
    totalGainLoss: transactions.reduce((sum, tx) => sum + parseFloat(tx.gainLoss), 0)
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #0c1220 0%, #111827 50%, #181f2e 100%)' }}>
      {/* Header */}
      <header className="pt-8 pb-6 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <SortIcon />
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: '#f97316' }}>
              {t.brand}
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-orange-400/80 font-medium mb-1">{t.tagline}</p>
          <p className="text-slate-400 text-sm mb-4">{t.features}</p>

          {/* Security badge & Language toggle */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span className="text-orange-500">🔒</span>
              {t.security}
            </div>

            {/* Language Toggle */}
            <div className="flex bg-slate-800/80 rounded-full p-1">
              <button
                onClick={() => setLang('en')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  lang === 'en'
                    ? 'text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
                style={lang === 'en' ? { backgroundColor: '#f97316' } : {}}
              >
                English
              </button>
              <button
                onClick={() => setLang('ko')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  lang === 'ko' 
                    ? 'text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
                style={lang === 'ko' ? { backgroundColor: '#f97316' } : {}}
              >
                한국어
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Beta Banner */}
      <div className="px-4 mb-4">
        <div className="max-w-md mx-auto">
          <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-full py-2 px-4 text-center">
            <p className="text-emerald-400 text-sm font-medium">
              {lang === 'ko' 
                ? '🎉 무료 베타 기간: 2/6 - 2/13' 
                : '🎉 Free Beta: Feb 6 - Feb 13'}
            </p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="px-4 mb-6">
        <div className="max-w-md mx-auto flex items-center justify-center gap-4">
          {[1, 2, 3].map((n) => (
            <React.Fragment key={n}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                  step >= n 
                    ? 'text-white' 
                    : 'bg-slate-700 text-slate-400'
                }`}
                style={step >= n ? { backgroundColor: '#f97316' } : {}}
                >
                  {n}
                </div>
                <span className={`text-sm ${step >= n ? 'text-orange-400' : 'text-slate-500'}`}>
                  {n === 1 ? t.steps.addFiles : n === 2 ? t.steps.review : t.steps.download}
                </span>
              </div>
              {n < 3 && (
                <div className={`w-16 h-0.5 -mt-6`} style={{ backgroundColor: step > n ? '#f97316' : '#334155' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-8">
        <div className="max-w-4xl mx-auto">

          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">

              {/* Uploaded Files */}
              {files.length > 0 && (
                <div className="mb-6 space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <span className="text-white font-medium">{file.name}</span>
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded" style={{ backgroundColor: 'rgba(249,115,22,0.2)', color: '#fb923c' }}>
                            {file.source}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm">{file.count} {t.review.transactions}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newFiles = files.filter((_, idx) => idx !== i);
                            setFiles(newFiles);
                            const newTransactions = newFiles.flatMap(f => f.transactions);
                            setTransactions(newTransactions);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-red-500 text-slate-400 hover:text-white transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'bg-orange-500/10' 
                    : 'border-slate-600/50 hover:border-slate-500'
                }`}
                style={dragActive ? { borderColor: '#f97316' } : {}}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".csv"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && handleFiles(e.target.files)}
                />
                <div className="flex justify-center mb-4">
                  <UploadIcon />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{t.upload.title}</h3>
                <p className="text-slate-400 mb-2">{t.upload.subtitle}</p>
                <p className="text-slate-500 text-sm">{t.upload.hint}</p>
              </div>

              {/* Broker Tags */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {t.brokers.map((broker) => (
                  <span
                    key={broker}
                    className="px-3 py-1.5 bg-slate-800/80 border border-slate-600/50 rounded-full text-slate-300 text-sm"
                  >
                    {broker}
                  </span>
                ))}
              </div>

              {/* Next Button */}
              {files.length > 0 && transactions.length > 0 && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setStep(2)}
                    className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: '#f97316' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fb923c'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
                  >
                    {t.review.next} →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-slate-500 text-xs mb-1">{t.review.transactions.toUpperCase()}</div>
                  <div className="text-2xl font-bold text-white">{transactions.length}</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-slate-500 text-xs mb-1">{t.review.totalProceeds.toUpperCase()}</div>
                  <div className="text-xl font-bold text-white font-mono">${summary.totalProceeds.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-slate-500 text-xs mb-1">{t.review.totalCost.toUpperCase()}</div>
                  <div className="text-xl font-bold text-white font-mono">${summary.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-slate-500 text-xs mb-1">{t.review.netGainLoss.toUpperCase()}</div>
                  <div className={`text-xl font-bold font-mono ${summary.totalGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${summary.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Summary Disclaimer */}
              <p className="text-slate-500 text-xs text-center mb-4">
                {lang === 'ko'
                  ? '※ 위 요약 수치는 참고용이며, 세금 신고 금액과 다를 수 있습니다.'
                  : '※ Summary figures are for reference only and may not reflect tax-reportable amounts.'}
              </p>

              {/* Transactions Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-400 text-xs uppercase">
                      <th className="text-left p-3">{t.table.description}</th>
                      <th className="text-left p-3">{t.table.acquired}</th>
                      <th className="text-left p-3">{t.table.sold}</th>
                      <th className="text-right p-3">{t.table.proceeds}</th>
                      <th className="text-right p-3">{t.table.cost}</th>
                      <th className="text-right p-3">{t.table.gainLoss}</th>
                      <th className="text-center p-3">{t.table.term}</th>
                      <th className="text-center p-3">{t.table.box}</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {transactions.slice(0, 20).map((tx, i) => (
                      <tr key={i} className="border-t border-slate-700/30 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-300 max-w-[160px] truncate">{tx.description}</td>
                        <td className="p-3 text-slate-400">{tx.dateAcquired}</td>
                        <td className="p-3 text-slate-400">{tx.dateSold}</td>
                        <td className="p-3 text-right text-slate-300">${tx.proceeds}</td>
                        <td className="p-3 text-right text-slate-300">${tx.costBasis}</td>
                        <td className={`p-3 text-right ${parseFloat(tx.gainLoss) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${tx.gainLoss}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            tx.termRaw === 'Short' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {tx.termRaw === 'Short' ? t.review.shortTerm : t.review.longTerm}
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-400">{tx.box}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length > 20 && (
                  <div className="p-3 text-center text-slate-500 text-sm border-t border-slate-700/30">
                    {lang === 'ko'
                      ? `미리보기 20개 표시 · 전체 ${transactions.length}개 거래는 다운로드 파일에 포함됩니다`
                      : `Showing 20 of ${transactions.length} transactions · Complete data included in download`}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-slate-300 transition-colors"
                >
                  ← {t.review.back}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-lg font-semibold text-white transition-colors"
                  style={{ backgroundColor: '#f97316' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fb923c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
                >
                  {t.review.next} →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Download */}
          {step === 3 && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-white mb-2">{t.download.title}</h2>
              <p className="text-slate-400 mb-8">{t.download.subtitle}</p>

              {/* Stats */}
              <div className="flex justify-center gap-8 mb-8">
                <div>
                  <div className="text-3xl font-bold" style={{ color: '#f97316' }}>{transactions.length}</div>
                  <div className="text-slate-500 text-sm">{t.download.transactionCount}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: '#f97316' }}>{files.length}</div>
                  <div className="text-slate-500 text-sm">{t.download.fileCount}</div>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 mb-4">
                <button
                  onClick={() => exportToCSV(transactions, 'sorted_transactions_all.csv')}
                  className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: '#f97316' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fb923c'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
                >
                  📥 {t.download.downloadAll}
                </button>
                <button
                  onClick={() => exportToCSV(summary.shortTerm, 'sorted_short_term.csv')}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-slate-300 transition-colors"
                >
                  {t.download.downloadShort}
                </button>
                <button
                  onClick={() => exportToCSV(summary.longTerm, 'sorted_long_term.csv')}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-slate-300 transition-colors"
                >
                  {t.download.downloadLong}
                </button>
              </div>

              {/* Terms notice */}
              <p className="text-slate-500 text-xs mb-4">
                {lang === 'ko'
                  ? <>다운로드 시 <button onClick={() => setShowTerms(true)} className="text-orange-400 hover:underline">이용약관</button>에 동의하는 것으로 간주됩니다</>
                  : <>By downloading, you agree to our <button onClick={() => setShowTerms(true)} className="text-orange-400 hover:underline">Terms of Service</button></>}
              </p>

              {/* Combined Warning */}
              <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3 mb-6 max-w-lg mx-auto">
                <p className="text-slate-400 text-xs">
                  {lang === 'ko'
                    ? '⚠️ 이 출력물은 IRS 제출용이 아닙니다. 이 툴은 데이터 정리·통합만 수행하며, Wash Sale 등 세무적 계산을 하지 않습니다. 모든 결과물은 사용 전 직접 검증하세요.'
                    : '⚠️ This output is NOT IRS-ready. This tool only organizes and consolidates data. It does NOT perform tax adjustments such as Wash Sale calculations. Please review all outputs before use.'}
                </p>
              </div>

              <button
                onClick={resetAll}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-slate-300 transition-colors"
              >
                ↻ {t.download.startOver}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-500 text-sm mb-3">
            {t.footer.processing} • {t.footer.copyright}
          </p>
          <div className="flex justify-center gap-4 text-sm text-slate-400 mb-4">
            <button onClick={() => setShowPrivacy(true)} className="hover:text-white transition-colors">{t.footer.links.privacy}</button>
            <span className="text-slate-600">•</span>
            <button onClick={() => setShowHowItWorks(true)} className="hover:text-white transition-colors">{t.footer.links.howItWorks}</button>
            <span className="text-slate-600">•</span>
            <button onClick={() => setShowRefund(true)} className="hover:text-white transition-colors">{t.footer.links.refund}</button>
            <span className="text-slate-600">•</span>
            <button onClick={() => setShowTerms(true)} className="hover:text-white transition-colors">{t.footer.links.terms}</button>
          </div>
          <p className="text-slate-600 text-xs max-w-2xl mx-auto">
            {t.footer.disclaimer}
          </p>
          <p className="text-slate-600 text-xs max-w-2xl mx-auto mt-2">
            {lang === 'ko'
              ? 'Fidelity, Robinhood, Coinbase는 각 소유자의 상표입니다. sort.는 독립적인 툴이며, 해당 기업들과 제휴 관계가 없습니다.'
              : 'Fidelity, Robinhood, and Coinbase are trademarks of their respective owners. sort. is not affiliated with or endorsed by these entities.'}
          </p>
          <p className="text-slate-400 text-sm mt-4">
            {lang === 'ko' ? '문의: ' : 'Contact: '}
            <a href="mailto:sort.app.help@gmail.com" className="text-orange-400 hover:underline">sort.app.help@gmail.com</a>
          </p>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowPrivacy(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{t.footer.links.privacy}</h2>
              <button onClick={() => setShowPrivacy(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div className="text-slate-300 text-sm space-y-3">
              {lang === 'ko' ? (
                <>
                  <p>• 파일을 저장하지 않습니다. 업로드된 모든 문서는 메모리에서 임시로 처리되며, 처리 후 즉시 삭제됩니다.</p>
                  <p>• sort.는 사용자 파일을 의도적으로 수집하거나 저장하지 않습니다. 임시 메모리 처리만 수행됩니다.</p>
                  <p>• 개인정보를 수집하지 않습니다.</p>
                  <p>• 사용자 데이터를 판매, 공유 또는 보관하지 않습니다.</p>
                  <p>• sort.는 사용자 계정이나 장기 저장 없이 운영됩니다.</p>
                  <p>• 결제는 Stripe를 통해 처리됩니다. 결제 정보는 sort.가 접근할 수 없습니다. Stripe의 데이터 처리 방식은 <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Stripe 개인정보 정책</a>을 참고하세요.</p>
                  <p className="text-slate-500 text-xs pt-2">최종 업데이트: 2026년 2월 5일</p>
                </>
              ) : (
                <>
                  <p>• We do not store your files. All uploaded documents are processed in temporary memory and deleted immediately after processing.</p>
                  <p>• We do not intentionally collect or store user files. Temporary in-memory processing only.</p>
                  <p>• We do not collect personal information.</p>
                  <p>• We do not sell, share, or retain user data.</p>
                  <p>• This tool runs without user accounts or long-term storage.</p>
                  <p>• Payment processing is handled by Stripe. We do not have access to your payment information. For Stripe's data practices, see <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Stripe Privacy Policy</a>.</p>
                  <p className="text-slate-500 text-xs pt-2">Last updated: February 5, 2026</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowHowItWorks(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{t.footer.links.howItWorks}</h2>
              <button onClick={() => setShowHowItWorks(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div className="text-slate-300 text-sm space-y-4">
              {lang === 'ko' ? (
                <>
                  <div className="flex gap-3">
                    <span className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: '#f97316' }}>1</span>
                    <p>브로커 CSV 파일을 추가하세요. 여러 파일을 한 번에 업로드할 수 있습니다.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: '#f97316' }}>2</span>
                    <p>파일이 자동으로 정리되며, 사용자가 직접 내용을 확인할 수 있습니다.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: '#f97316' }}>3</span>
                    <p>CSV 파일을 다운로드하세요.</p>
                  </div>
                  <p className="text-amber-400 text-xs pt-2">⚠️ 모든 파일은 본인이 직접 확인해야 하며, 정확성에 대한 책임은 사용자에게 있습니다.</p>
                  <p className="text-slate-500 text-xs pt-2">sort.는 브로커 포맷 변경에 대응하여 정기적으로 알고리즘을 업데이트합니다.</p>
                </>
              ) : (
                <>
                  <div className="flex gap-3">
                    <span className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: '#f97316' }}>1</span>
                    <p>Add your broker CSV files. Upload multiple files at once.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: '#f97316' }}>2</span>
                    <p>Files are organized automatically and ready to review.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: '#f97316' }}>3</span>
                    <p>Download your organized CSV file.</p>
                  </div>
                  <p className="text-amber-400 text-xs pt-2">⚠️ Please review all files yourself. You are responsible for verifying their accuracy.</p>
                  <p className="text-slate-500 text-xs pt-2">sort. regularly updates its algorithms to adapt to broker format changes.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refund Policy Modal */}
      {showRefund && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowRefund(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{t.footer.links.refund}</h2>
              <button onClick={() => setShowRefund(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div className="text-slate-300 text-sm space-y-3">
              {lang === 'ko' ? (
                <>
                  <p>• 디지털 상품 특성상, 결제 완료 후 파일 변환이 시작된 이후에는 환불이 제공되지 않습니다.</p>
                  <p>• 사용자 오류로 인한 경우나 다운로드 완료 후에는 환불이 어렵습니다.</p>
                  <p>• 결제 후 24시간 동안 무제한으로 사용할 수 있으므로, 문제가 있으면 다시 시도하세요.</p>
                  <p>• 기술적 문제로 서비스를 정상적으로 이용할 수 없는 경우, 문의해 주세요.</p>
                </>
              ) : (
                <>
                  <p>• Due to the digital nature of this product, refunds are not available once payment is completed and file conversion has begun.</p>
                  <p>• Refunds are not provided for user errors or completed downloads.</p>
                  <p>• You have 24 hours of unlimited access after payment. If you encounter an issue, you may retry during this period.</p>
                  <p>• If technical issues prevent you from using the service at all, please contact us.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowTerms(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-800 pb-2">
              <h2 className="text-xl font-bold text-white">{t.footer.links.terms}</h2>
              <button onClick={() => setShowTerms(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div className="text-slate-300 text-sm space-y-4">
              {lang === 'ko' ? (
                <>
                  <p className="text-slate-500 text-xs">최종 업데이트: 2026년 2월 5일</p>

                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-2">
                    <p className="text-amber-400 text-xs font-semibold">중요: sort.는 데이터 포맷 변환 도구이며, 전문 세무 서비스, CPA, 또는 자격을 갖춘 세무 전문가의 대체 수단이 아닙니다.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">1. 약관 동의</h3>
                    <p>sort.(&quot;서비스&quot;)를 이용함으로써 본 이용약관(&quot;약관&quot;)에 동의하는 것으로 간주됩니다. 동의하지 않는 경우 서비스를 이용하지 마세요.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">2. 서비스 설명</h3>
                    <p>sort.는 브로커에서 제공하는 CSV 파일을 표준화된 CSV 형식으로 정리·변환하는 소프트웨어 도구입니다. 본 서비스는 정리 목적으로만 거래 내역의 표준화된 통합을 제공합니다. 세금 계산, 세무 목적의 손익 산정, 재무 자문 제공, IRS 제출용 양식 생성, 브로커 간 Wash Sale 조정 등 세무적 계산을 수행하지 않습니다. &quot;표준화&quot;라는 용어는 내부적인 포맷 일관성만을 의미하며, 외부 또는 규제 기준 준수를 의미하지 않습니다.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">3. 세무·법률·재무 자문 아님</h3>
                    <p>본 서비스는 세무 대리, 회계 서비스, 법률 자문 서비스가 아닙니다. 출력물은 정보 제공 및 정리 목적으로만 제공됩니다. 서비스는 IRS 또는 연방, 주, 지방 세무 당국의 요구 사항 준수를 보장하지 않습니다. 세금 또는 재무 결정 전에 자격을 갖춘 전문가와 상담하세요. 본 서비스를 전문적인 세무 검토의 대체 수단으로 사용하지 마세요.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">4. 사용자 책임 및 정확성</h3>
                    <p>사용자는 다음에 동의합니다: 업로드된 모든 데이터는 사용자가 제공한 것이며, 모든 출력물의 정확성과 완전성을 독립적으로 검증할 책임은 사용자에게 있습니다. 서비스에는 오류, 누락 또는 포맷 문제가 포함될 수 있으며, 생성된 파일의 사용에 따른 모든 위험은 사용자가 부담합니다.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">5. 로컬 처리 및 데이터 취급</h3>
                    <p>파일은 임시 메모리에서 로컬로 처리되며 서버에 의도적으로 저장되지 않습니다. 다만, 중단 없는 또는 오류 없는 운영을 보장하지 않으며, 운영 목적의 임시 기술 로그가 생성될 수 있습니다.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">6. 결제 및 디지털 상품 정책</h3>
                    <p>모든 결제는 Stripe를 통해 안전하게 처리됩니다. 결제 정보에 대한 접근 권한이 없습니다. 처리가 시작된 후에는 모든 판매가 최종적이며 환불이 불가합니다. 구매/처리 버튼을 클릭함으로써 디지털 상품임을 인정하고 처리 시작 후 환불이 불가함에 동의합니다.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">7. 책임 제한</h3>
                    <p>법이 허용하는 최대 범위 내에서, sort.는 직접적, 간접적, 부수적 또는 결과적 손해에 대해 책임을 지지 않습니다. 이에는 세금 과태료, 신고 오류, 데이터 손실, 이익 손실 또는 데이터 부정확성이 포함되나 이에 국한되지 않습니다. 총 배상 책임은 서비스에 대해 지불한 금액을 초과하지 않습니다.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">8. 보증 부인</h3>
                    <p>서비스는 명시적이든 묵시적이든 어떠한 종류의 보증 없이 &quot;있는 그대로&quot; 제공됩니다. 상품성, 특정 목적 적합성 및 비침해에 대한 모든 보증을 부인합니다. 서비스는 언제든지 업데이트, 수정 또는 중단될 수 있습니다.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">9. 면책</h3>
                    <p>사용자는 서비스 이용 또는 출력물에 대한 의존으로 인해 발생하는 모든 청구, 손해 또는 비용에 대해 sort.를 면책하고 무해하게 할 것에 동의합니다.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">10. 구속력 있는 중재 및 집단소송 포기</h3>
                    <p>본 약관 또는 서비스 이용으로 인해 발생하는 모든 분쟁은 미국중재협회(AAA) 규칙에 따라 구속력 있는 중재를 통해 해결됩니다. 사용자는 sort.에 대한 집단소송 또는 집단 중재에 참여할 권리를 포기하는 데 동의합니다.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">11. 서비스 종료</h3>
                    <p>당사는 사전 통지 없이 언제든지 서비스를 중단하거나 종료할 권리를 보유합니다.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">12. 준거법 및 관할</h3>
                    <p>본 약관은 미국 텍사스 주 법률의 적용을 받습니다. 모든 법적 조치는 텍사스 주 해리스 카운티의 주 법원 또는 연방 법원에서 독점적으로 제기되어야 합니다.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">13. 문의</h3>
                    <p>약관에 관한 문의: sort.app.help@gmail.com</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-500 text-xs">Last updated: February 5, 2026</p>

                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-2">
                    <p className="text-amber-400 text-xs font-semibold">IMPORTANT: sort. IS A DATA FORMATTING TOOL, NOT A PROFESSIONAL TAX PREPARATION SERVICE, CPA, OR SUBSTITUTE FOR A QUALIFIED TAX PROFESSIONAL.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">1. Acceptance of Terms</h3>
                    <p>By accessing or using sort. (the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Service.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">2. Description of the Service</h3>
                    <p>sort. is a software tool that allows users to upload broker-provided CSV files and organize or convert them into a standardized CSV format for personal review. The Service provides a standardized consolidation of transaction history for organizational purposes only. It does not calculate taxes, determine tax liability, provide financial advice, generate IRS-ready forms, or perform tax adjustments such as cross-broker Wash Sale calculations. The term &quot;standardized&quot; refers to internal formatting consistency only and does not imply compliance with any external or regulatory standard.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">3. No Tax, Legal, or Financial Advice</h3>
                    <p>The Service is not a tax preparation service, accounting service, or legal advisory service. Outputs are provided for informational and organizational purposes only. The Service does not guarantee compliance with IRS or any federal, state, or local tax authority requirements. You should consult a qualified professional before making any tax or financial decisions. You agree not to rely on the Service as a substitute for professional tax preparation or review.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">4. User Responsibility &amp; Accuracy</h3>
                    <p>You acknowledge and agree that: all data uploaded is provided by you; you are solely responsible for independently verifying the accuracy and completeness of all outputs; the Service may contain errors, omissions, or formatting issues; and you assume all risk associated with the use of generated files.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">5. Local Processing &amp; Data Handling</h3>
                    <p>Files are processed locally in temporary memory and are not intentionally stored on servers. However, we do not guarantee uninterrupted or error-free operation, and you acknowledge that temporary technical logs may be generated for operational purposes.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">6. Payments &amp; Digital Product Policy</h3>
                    <p>All payments are processed securely through Stripe. We do not store or have access to your payment information. All sales are final once processing has begun. Refunds are not available for completed processing or downloads. By clicking the purchase/process button, you acknowledge that this is a digital product and that refunds are not available once processing begins.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">7. LIMITATION OF LIABILITY</h3>
                    <p className="uppercase text-xs">TO THE MAXIMUM EXTENT PERMITTED BY LAW, SORT. SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. THIS INCLUDES, BUT IS NOT LIMITED TO, TAX PENALTIES, FILING ERRORS, DATA LOSS, LOST PROFITS, OR DATA INACCURACIES. TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID FOR THE SERVICE.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">8. DISCLAIMER OF WARRANTIES</h3>
                    <p className="uppercase text-xs">THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;, WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. THE SERVICE MAY BE UPDATED, MODIFIED, OR DISCONTINUED AT ANY TIME.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">9. Indemnification</h3>
                    <p>You agree to indemnify and hold harmless sort. from any claims, damages, or expenses arising from your use of the Service or reliance on its outputs.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">10. BINDING ARBITRATION &amp; CLASS ACTION WAIVER</h3>
                    <p className="uppercase text-xs">ANY DISPUTE ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL BE RESOLVED THROUGH BINDING ARBITRATION IN ACCORDANCE WITH THE RULES OF THE AMERICAN ARBITRATION ASSOCIATION. YOU AGREE TO WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION AGAINST SORT. THIS ARBITRATION AGREEMENT SURVIVES TERMINATION OF THESE TERMS.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">11. Termination</h3>
                    <p>We reserve the right to suspend or discontinue the Service at any time without notice.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">12. Governing Law &amp; Jurisdiction</h3>
                    <p>These Terms are governed by the laws of the State of Texas, United States, without regard to conflict of law principles. Any legal action shall be brought exclusively in the state or federal courts located in Harris County, Texas.</p>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-1">13. Contact</h3>
                    <p>For questions regarding these Terms: sort.app.help@gmail.com</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}