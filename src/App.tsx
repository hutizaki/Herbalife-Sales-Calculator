import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ParseResult } from 'papaparse';
import herbalifeLogo from './assets/Herbalife Logo.png';
import usaFlag from './assets/usa.png';
import mexicoFlag from './assets/mexico.png';

interface SalesData {
  retailTotal: number;
  clubTotal: number;
  fileName: string;
}

type Language = 'en' | 'es';

interface Translations {
  title: string;
  subtitle: string;
  chooseFile: string;
  dragDrop: string;
  supportsFiles: string;
  file: string;
  retailSales: string;
  clubSales: string;
  totalProfit: string;
  errorCsv: string;
  errorExcel: string;
  errorFileType: string;
  copied: string;
  copy: string;
}

const translations: Record<Language, Translations> = {
  en: {
    title: 'Sales Analyzer',
    subtitle: 'Upload your sales data to calculate totals',
    chooseFile: 'Choose File',
    dragDrop: 'or drag and drop your file here',
    supportsFiles: 'Supports .xlsx and .csv files',
    file: 'File',
    retailSales: 'Retail Sales',
    clubSales: 'Club Visit/Sale',
    totalProfit: 'Total Profit',
    errorCsv: 'Error parsing CSV file',
    errorExcel: 'Error parsing Excel file',
    errorFileType: 'Please upload a .xlsx or .csv file',
    copied: 'Copied!',
    copy: 'Copy'
  },
  es: {
    title: 'Analizador de Ventas',
    subtitle: 'Sube tus datos de ventas para calcular totales',
    chooseFile: 'Elegir Archivo',
    dragDrop: 'o arrastra y suelta tu archivo aquí',
    supportsFiles: 'Soporta archivos .xlsx y .csv',
    file: 'Archivo',
    retailSales: 'Ventas Minoristas',
    clubSales: 'Visita/Venta de Club',
    totalProfit: 'Ganancia Total',
    errorCsv: 'Error al analizar archivo CSV',
    errorExcel: 'Error al analizar archivo Excel',
    errorFileType: 'Por favor sube un archivo .xlsx o .csv',
    copied: '¡Copiado!',
    copy: 'Copiar'
  }
};

export default function SalesAnalyzer() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const t = translations[language];

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'es')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language preference to localStorage whenever it changes
  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'es' : 'en';
    setLanguage(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
  };

  const copyToClipboard = (value: string, field: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const processFile = (file: File) => {
    setError('');
    setSalesData(null);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      // Parse CSV
      Papa.parse(file, {
        header: true,
        complete: (results: ParseResult<Record<string, string>>) => {
          calculateTotals(results.data, file.name);
        },
        error: (err: Error) => {
          setError(t.errorCsv + ': ' + err.message);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Record<string, string>[];
          calculateTotals(jsonData, file.name);
        } catch (err) {
          setError(t.errorExcel);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setError(t.errorFileType);
    }
  };

  const calculateTotals = (data: Record<string, string>[], fileName: string) => {
    let retailTotal = 0;
    let clubTotal = 0;

    data.forEach((row: Record<string, string>) => {
      const receiptType = row['Receipt Type'];
      const profitString = row['Profit'];

      if (receiptType && profitString) {
        // Remove dollar sign and parse to float
        const profit = parseFloat(profitString.toString().replace('$', '').replace(',', ''));

        if (!isNaN(profit)) {
          if (receiptType === 'Retail Sale') {
            retailTotal += profit;
          } else if (receiptType === 'Club Visit/Sale') {
            clubTotal += profit;
          }
        }
      }
    });

    setSalesData({
      retailTotal,
      clubTotal,
      fileName
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 py-6 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Logo and Language Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 sm:mb-12 gap-4">
          {/* Herbalife Logo/Title */}
          <div className="text-center sm:text-left">
            <div className="flex flex-col items-center sm:items-start gap-2 mb-2">
              <div className="Logo">
                <img 
                  src={herbalifeLogo} 
                  alt="Herbalife Logo" 
                  className="w-64 md:w-80 lg:w-96 xl:w-[25rem] 2xl:w-[25rem] h-auto object-contain" 
                />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-green-800">{t.title}</h1>
            </div>
            <p className="text-gray-600 text-sm sm:text-base">{t.subtitle}</p>
          </div>

          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-5 rounded-full shadow-lg hover:shadow-xl transition-all border-2 border-green-200"
          >
            <span className="text-xl">
              {language === 'en' ? <img src={mexicoFlag} alt="Mexico Flag" className="w-5 h-5" /> : <img src={usaFlag} alt="USA Flag" className="w-5 h-5" />}
            </span>
            <span className="text-sm sm:text-base">{language === 'en' ? 'Español' : 'English'}</span>
          </button>
        </div>

        {/* Upload Box */}
        <div
          className={`bg-white rounded-3xl border-4 border-dashed p-8 sm:p-12 text-center transition-all shadow-xl ${
            isDragging ? 'border-green-500 bg-green-50 scale-105' : 'border-green-300'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-100 to-emerald-200 rounded-full flex items-center justify-center mb-4">
              <svg
                className="h-10 w-10 sm:h-12 sm:w-12 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
          </div>

          <label className="cursor-pointer">
            <span className="inline-block bg-gradient-to-r from-green-600 to-green-500 text-white px-8 py-4 rounded-full font-bold text-base sm:text-lg hover:from-green-700 hover:to-green-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
              {t.chooseFile}
            </span>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
            />
          </label>

          <p className="mt-6 text-sm sm:text-base text-gray-600 font-medium">
            {t.dragDrop}
          </p>
          <p className="mt-2 text-xs sm:text-sm text-gray-400">
            {t.supportsFiles}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-lg animate-pulse">
            <p className="text-red-800 text-sm sm:text-base font-medium text-center">{error}</p>
          </div>
        )}

        {/* Results */}
        {salesData && (
          <div className="mt-8 space-y-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border-2 border-green-200">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b-2 border-green-100">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm sm:text-base text-gray-600 font-medium truncate">{t.file}: {salesData.fileName}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Retail Total */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-5 sm:p-6 border-2 border-green-300 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs sm:text-sm font-bold text-green-800 uppercase tracking-wide">{t.retailSales}</p>
                    <button
                      onClick={() => copyToClipboard(salesData.retailTotal.toFixed(2), 'retail')}
                      className="p-1.5 sm:p-2 hover:bg-green-200 rounded-lg transition-colors group relative"
                      title={t.copy}
                    >
                      {copiedField === 'retail' ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold text-green-700">
                    ${salesData.retailTotal.toFixed(2)}
                  </p>
                </div>

                {/* Club Total */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-100 rounded-2xl p-5 sm:p-6 border-2 border-teal-300 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs sm:text-sm font-bold text-teal-800 uppercase tracking-wide">{t.clubSales}</p>
                    <button
                      onClick={() => copyToClipboard(salesData.clubTotal.toFixed(2), 'club')}
                      className="p-1.5 sm:p-2 hover:bg-teal-200 rounded-lg transition-colors group relative"
                      title={t.copy}
                    >
                      {copiedField === 'club' ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold text-teal-700">
                    ${salesData.clubTotal.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Grand Total */}
              <div className="mt-6 pt-6 border-t-2 border-green-200">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 sm:p-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <p className="text-lg sm:text-xl font-bold text-white uppercase tracking-wide">{t.totalProfit}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-3xl sm:text-4xl font-bold text-white">
                        ${(salesData.retailTotal + salesData.clubTotal).toFixed(2)}
                      </p>
                      <button
                        onClick={() => copyToClipboard((salesData.retailTotal + salesData.clubTotal).toFixed(2), 'total')}
                        className="p-2 sm:p-2.5 hover:bg-green-700 rounded-lg transition-colors"
                        title={t.copy}
                      >
                        {copiedField === 'total' ? (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">Created by <a href="https://github.com/hutizaki" className="text-green-600 hover:text-green-700">hutizaki</a></p>
        </div>
      </div>
    </div>
  );
}