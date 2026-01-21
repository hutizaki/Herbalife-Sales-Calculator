import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ParseResult } from 'papaparse';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import herbalifeLogo from './assets/Herbalife Logo.png';
import usaFlag from './assets/usa.png';
import mexicoFlag from './assets/mexico.png';

interface SalesData {
  retailTotal: number;
  clubTotal: number;
  fileName: string;
  dailyData: DailyProfit[];
}

interface DailyProfit {
  date: string;
  retail: number;
  club: number;
  total: number;
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
  summary: string;
  dailyBreakdown: string;
  dailyProfitChart: string;
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
    copy: 'Copy',
    summary: 'Summary',
    dailyBreakdown: 'Daily Breakdown',
    dailyProfitChart: 'Daily Profit Trends'
  },
  es: {
    title: 'Analizador de Ventas',
    subtitle: 'Sube tus datos de ventas para calcular totales',
    chooseFile: 'Elegir Archivo',
    dragDrop: 'o arrastra y suelta tu archivo aquí',
    supportsFiles: 'Soporta archivos .xlsx y .csv',
    file: 'Archivo',
    retailSales: 'Ganancia De Ventas Al Menudeo',
    clubSales: 'Ganancia De Visita/Venta Al Club',
    totalProfit: 'Ganancia Total',
    errorCsv: 'Error al analizar archivo CSV',
    errorExcel: 'Error al analizar archivo Excel',
    errorFileType: 'Por favor sube un archivo .xlsx o .csv',
    copied: '¡Copiado!',
    copy: 'Copiar',
    summary: 'Resumen',
    dailyBreakdown: 'Desglose Diario',
    dailyProfitChart: 'Tendencias de Ganancia Diaria'
  }
};

export default function SalesAnalyzer() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'daily'>('summary');
  const [selectedMonth, setSelectedMonth] = useState<string | 'ALL'>('ALL');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [lineOpacity, setLineOpacity] = useState({
    retail: 0.2,
    club: 0.2,
    total: 1.0
  });

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

  const toggleLine = (line: 'retail' | 'club' | 'total') => {
    setLineOpacity(prev => ({
      ...prev,
      [line]: prev[line] === 1.0 ? 0.2 : 1.0
    }));
  };

  const copyToClipboard = (value: string, field: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const getMonthFromDate = (dateString: string): string => {
    if (!dateString) return '';
    
    // Parse date string (format: MM/DD/YYYY)
    const dateParts = dateString.toString().split('/');
    if (dateParts.length < 3) {
      // Try parsing as Date object if split doesn't work
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const monthIndex = date.getMonth();
      const monthNames = language === 'es' 
        ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return monthNames[monthIndex];
    }
    
    // Extract month from MM/DD/YYYY format (month is at index 0)
    const monthIndex = parseInt(dateParts[0], 10) - 1; // Convert to 0-based index
    if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return '';
    
    // Return month name in the current language
    const monthNames = language === 'es' 
      ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    return monthNames[monthIndex];
  };

  const getAllUniqueMonths = (dailyData: DailyProfit[]): string[] => {
    if (!dailyData || dailyData.length === 0) return [];
    
    const monthSet = new Set<string>();
    dailyData.forEach(day => {
      const month = getMonthFromDate(day.date);
      if (month) {
        monthSet.add(month);
      }
    });
    
    // Sort months chronologically (most recent first) by finding the latest date for each month
    const sortedMonths = Array.from(monthSet).sort((a, b) => {
      // Find the latest date for each month
      const datesA = dailyData.filter(d => getMonthFromDate(d.date) === a).map(d => new Date(d.date));
      const datesB = dailyData.filter(d => getMonthFromDate(d.date) === b).map(d => new Date(d.date));
      
      const latestA = datesA.length > 0 ? Math.max(...datesA.map(d => d.getTime())) : 0;
      const latestB = datesB.length > 0 ? Math.max(...datesB.map(d => d.getTime())) : 0;
      
      // Most recent month first
      return latestB - latestA;
    });
    
    return sortedMonths;
  };

  const getFilteredDailyData = (dailyData: DailyProfit[], month: string | 'ALL'): DailyProfit[] => {
    if (month === 'ALL') return dailyData;
    return dailyData.filter(day => getMonthFromDate(day.date) === month);
  };

  const getFilteredTotals = (dailyData: DailyProfit[], month: string | 'ALL'): { retailTotal: number; clubTotal: number } => {
    const filtered = getFilteredDailyData(dailyData, month);
    return {
      retailTotal: filtered.reduce((sum, day) => sum + day.retail, 0),
      clubTotal: filtered.reduce((sum, day) => sum + day.club, 0)
    };
  };

  const processFile = (file: File) => {
    setError('');
    setSalesData(null);
    setSelectedMonth('ALL');
    setAvailableMonths([]);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const fileType = file.type;

    // Log file details for debugging
    console.log('File selected:', {
      name: file.name,
      type: fileType,
      extension: fileExtension,
      size: file.size
    });

    // Check both extension and MIME type for better mobile compatibility
    const isCsv = fileExtension === 'csv' || fileType === 'text/csv';
    const isExcel = 
      fileExtension === 'xlsx' || 
      fileExtension === 'xls' || 
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel';

    if (isCsv) {
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
    } else if (isExcel) {
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
      reader.onerror = () => {
        console.error('FileReader error');
        setError(t.errorExcel);
      };
      reader.readAsBinaryString(file);
    } else {
      setError(t.errorFileType);
    }
  };

  const calculateTotals = (data: Record<string, string>[], fileName: string) => {
    let retailTotal = 0;
    let clubTotal = 0;
    const dailyMap = new Map<string, { retail: number; club: number }>();

    data.forEach((row: Record<string, string>) => {
      // Support both English and Spanish column names
      const receiptType = row['Receipt Type'] || row['Tipo de Recibo'];
      const profitString = row['Profit'] || row['Ganancia'];
      const dateCreated = row['Date Created'] || row['Fecha de creación'];
      const customerName = row['Customer Name'] || row['Nombre del Cliente'];

      // Skip if customer is Ashley Regis
      if (customerName && customerName.toString().trim().toLowerCase() === 'ashley regis') {
        return; // Skip this row
      }

      if (receiptType && profitString) {
        // Remove dollar sign and parse to float
        const profit = parseFloat(profitString.toString().replace('$', '').replace(',', ''));

        if (!isNaN(profit)) {
          // Support both English and Spanish receipt type values
          const typeString = receiptType.toString();
          
          // Check for Retail Sale (English or Spanish)
          if (typeString === 'Retail Sale' || typeString === 'Venta al menudeo') {
            retailTotal += profit;
          } 
          // Check for Club Visit/Sale (English or Spanish)
          else if (
            typeString === 'Club Visit/Sale' || 
            typeString === 'Visita al Club / Venta'
          ) {
            clubTotal += profit;
          }

          // Group by date for daily breakdown
          if (dateCreated) {
            const dateKey = dateCreated.toString();
            if (!dailyMap.has(dateKey)) {
              dailyMap.set(dateKey, { retail: 0, club: 0 });
            }
            const dayData = dailyMap.get(dateKey)!;
            
            if (typeString === 'Retail Sale' || typeString === 'Venta al menudeo') {
              dayData.retail += profit;
            } else if (
              typeString === 'Club Visit/Sale' || 
              typeString === 'Visita al Club / Venta'
            ) {
              dayData.club += profit;
            }
          }
        }
      }
    });

    // Convert daily map to array and sort by date
    const dailyData: DailyProfit[] = Array.from(dailyMap.entries())
      .map(([date, values]) => ({
        date,
        retail: values.retail,
        club: values.club,
        total: values.retail + values.club
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Extract all unique months and set default to most recent
    const months = getAllUniqueMonths(dailyData);
    setAvailableMonths(months);
    
    // Set default to most recent month (first in sorted array) or 'ALL' if multiple months
    if (months.length > 1) {
      setSelectedMonth(months[0]); // Most recent month
    } else if (months.length === 1) {
      setSelectedMonth(months[0]); // Single month (can't be turned off)
    } else {
      setSelectedMonth('ALL');
    }

    setSalesData({
      retailTotal,
      clubTotal,
      fileName,
      dailyData
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
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
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
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
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-green-200">
              {/* File Info Header */}
              <div className="flex items-center gap-2 px-6 sm:px-8 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-100">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm sm:text-base text-gray-600 font-medium truncate">{t.file}: {salesData.fileName}</p>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b-2 border-green-100">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 py-4 px-6 font-semibold text-sm sm:text-base transition-all ${
                    activeTab === 'summary'
                      ? 'bg-white text-green-700 border-b-4 border-green-600'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>{t.summary}</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`flex-1 py-4 px-6 font-semibold text-sm sm:text-base transition-all ${
                    activeTab === 'daily'
                      ? 'bg-white text-green-700 border-b-4 border-green-600'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <span>{t.dailyBreakdown}</span>
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6 sm:p-8">
                {activeTab === 'summary' ? (
                  <>
                    {/* Month Selector */}
                    <div className="mb-6 flex flex-wrap justify-center gap-2">
                      {availableMonths.length > 1 && (
                        <button
                          onClick={() => setSelectedMonth('ALL')}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 shadow-md transition-all ${
                            selectedMonth === 'ALL'
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-700 shadow-lg'
                              : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm sm:text-base font-semibold">ALL</span>
                        </button>
                      )}
                      {availableMonths.map((month) => {
                        const isActive = selectedMonth === month;
                        const isSingleMonth = availableMonths.length === 1;
                        return (
                          <button
                            key={month}
                            onClick={() => !isSingleMonth && setSelectedMonth(month)}
                            disabled={isSingleMonth}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 shadow-md transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-700 shadow-lg'
                                : isSingleMonth
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300 cursor-default'
                                : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm sm:text-base font-semibold">{month}</span>
                          </button>
                        );
                      })}
                    </div>
                    {(() => {
                      const filteredTotals = getFilteredTotals(salesData.dailyData, selectedMonth);
                      return (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            {/* Retail Total */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-5 sm:p-6 border-2 border-green-300 shadow-lg hover:shadow-xl transition-shadow">
                              <div className="flex justify-between items-start mb-3">
                                <p className="text-xs sm:text-sm font-bold text-green-800 uppercase tracking-wide">{t.retailSales}</p>
                                <button
                                  onClick={() => copyToClipboard(filteredTotals.retailTotal.toFixed(2), 'retail')}
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
                                ${filteredTotals.retailTotal.toFixed(2)}
                              </p>
                            </div>

                            {/* Club Total */}
                            <div className="bg-gradient-to-br from-teal-50 to-cyan-100 rounded-2xl p-5 sm:p-6 border-2 border-teal-300 shadow-lg hover:shadow-xl transition-shadow">
                              <div className="flex justify-between items-start mb-3">
                                <p className="text-xs sm:text-sm font-bold text-teal-800 uppercase tracking-wide">{t.clubSales}</p>
                                <button
                                  onClick={() => copyToClipboard(filteredTotals.clubTotal.toFixed(2), 'club')}
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
                                ${filteredTotals.clubTotal.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Grand Total */}
                          <div className="mt-6">
                            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 sm:p-6 shadow-xl">
                              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                <p className="text-lg sm:text-xl font-bold text-white uppercase tracking-wide">{t.totalProfit}</p>
                                <div className="flex items-center gap-3">
                                  <p className="text-3xl sm:text-4xl font-bold text-white">
                                    ${(filteredTotals.retailTotal + filteredTotals.clubTotal).toFixed(2)}
                                  </p>
                                  <button
                                    onClick={() => copyToClipboard((filteredTotals.retailTotal + filteredTotals.clubTotal).toFixed(2), 'total')}
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
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {/* Month Selector */}
                    <div className="mb-6 flex flex-wrap justify-center gap-2">
                      {availableMonths.length > 1 && (
                        <button
                          onClick={() => setSelectedMonth('ALL')}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 shadow-md transition-all ${
                            selectedMonth === 'ALL'
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-700 shadow-lg'
                              : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm sm:text-base font-semibold">ALL</span>
                        </button>
                      )}
                      {availableMonths.map((month) => {
                        const isActive = selectedMonth === month;
                        const isSingleMonth = availableMonths.length === 1;
                        return (
                          <button
                            key={month}
                            onClick={() => !isSingleMonth && setSelectedMonth(month)}
                            disabled={isSingleMonth}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 shadow-md transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-700 shadow-lg'
                                : isSingleMonth
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300 cursor-default'
                                : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm sm:text-base font-semibold">{month}</span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Daily Breakdown Chart */}
                    <div className="mb-6">
                      <h3 className="text-xl sm:text-2xl font-bold text-green-800 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {t.dailyProfitChart}
                      </h3>
                      <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-2xl p-4 sm:p-6 border-2 border-green-200">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={getFilteredDailyData(salesData.dailyData, selectedMonth)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fill: '#047857', fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis 
                              tick={{ fill: '#047857', fontSize: 12 }}
                              tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#ffffff', 
                                border: '2px solid #10b981',
                                borderRadius: '12px',
                                padding: '12px'
                              }}
                              formatter={(value: any) => `$${value.toFixed(2)}`}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="retail" 
                              stroke="#059669" 
                              strokeWidth={3}
                              strokeOpacity={lineOpacity.retail}
                              name={t.retailSales}
                              dot={{ fill: '#059669', r: 4, fillOpacity: lineOpacity.retail }}
                              activeDot={{ r: 6 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="club" 
                              stroke="#0891b2" 
                              strokeWidth={3}
                              strokeOpacity={lineOpacity.club}
                              name={t.clubSales}
                              dot={{ fill: '#0891b2', r: 4, fillOpacity: lineOpacity.club }}
                              activeDot={{ r: 6 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="total" 
                              stroke="#047857" 
                              strokeWidth={4}
                              strokeOpacity={lineOpacity.total}
                              name={t.totalProfit}
                              dot={{ fill: '#047857', r: 5, fillOpacity: lineOpacity.total }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        
                        {/* Custom Legend Buttons */}
                        <div className="flex flex-wrap justify-center gap-3 mt-6 pt-6 border-t-2 border-green-200">
                          <button
                            onClick={() => toggleLine('retail')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md hover:shadow-lg transform hover:scale-105 ${
                              lineOpacity.retail === 1.0
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-500 border-2 border-gray-300'
                            }`}
                          >
                            <div 
                              className={`w-8 h-1 rounded-full ${lineOpacity.retail === 1.0 ? 'bg-white' : 'bg-green-600'}`}
                              style={{ opacity: lineOpacity.retail }}
                            ></div>
                            <span>{t.retailSales}</span>
                          </button>
                          
                          <button
                            onClick={() => toggleLine('club')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md hover:shadow-lg transform hover:scale-105 ${
                              lineOpacity.club === 1.0
                                ? 'bg-cyan-600 text-white'
                                : 'bg-white text-gray-500 border-2 border-gray-300'
                            }`}
                          >
                            <div 
                              className={`w-8 h-1 rounded-full ${lineOpacity.club === 1.0 ? 'bg-white' : 'bg-cyan-600'}`}
                              style={{ opacity: lineOpacity.club }}
                            ></div>
                            <span>{t.clubSales}</span>
                          </button>
                          
                          <button
                            onClick={() => toggleLine('total')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md hover:shadow-lg transform hover:scale-105 ${
                              lineOpacity.total === 1.0
                                ? 'bg-green-800 text-white'
                                : 'bg-white text-gray-500 border-2 border-gray-300'
                            }`}
                          >
                            <div 
                              className={`w-8 h-1.5 rounded-full ${lineOpacity.total === 1.0 ? 'bg-white' : 'bg-green-800'}`}
                              style={{ opacity: lineOpacity.total }}
                            ></div>
                            <span>{t.totalProfit}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Daily Data Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b-2 border-green-200">
                            <th className="py-3 px-4 text-green-800 font-bold text-sm sm:text-base">Date</th>
                            <th className="py-3 px-4 text-green-800 font-bold text-sm sm:text-base">{t.retailSales}</th>
                            <th className="py-3 px-4 text-green-800 font-bold text-sm sm:text-base">{t.clubSales}</th>
                            <th className="py-3 px-4 text-green-800 font-bold text-sm sm:text-base">{t.totalProfit}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredDailyData(salesData.dailyData, selectedMonth).map((day, index) => (
                            <tr 
                              key={index} 
                              className="border-b border-green-100 hover:bg-green-50 transition-colors"
                            >
                              <td className="py-3 px-4 text-gray-700 font-medium text-sm sm:text-base">{day.date}</td>
                              <td className="py-3 px-4 text-green-700 font-semibold text-sm sm:text-base">${day.retail.toFixed(2)}</td>
                              <td className="py-3 px-4 text-teal-700 font-semibold text-sm sm:text-base">${day.club.toFixed(2)}</td>
                              <td className="py-3 px-4 text-green-800 font-bold text-sm sm:text-base">${day.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
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