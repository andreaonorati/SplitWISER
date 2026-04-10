'use client';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useExpenseFormStore } from '@/stores/expenseFormStore';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, Image, FileSpreadsheet, Sparkles, Check, X, Edit } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ParsedExpense } from '@/types';

export default function ImportPage() {
  return (
    <AuthLayout>
      <ImportContent />
    </AuthLayout>
  );
}

function ImportContent() {
  const { id: groupId } = useParams<{ id: string }>();
  const router = useRouter();
  const { setPrefillData } = useExpenseFormStore();

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.getGroup(groupId),
  });

  const [uploading, setUploading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [pasteText, setPasteText] = useState('');
  const [activeMode, setActiveMode] = useState<'upload' | 'paste'>('upload');

  // File drop handler
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];

      setUploading(true);
      setParsedResult(null);

      try {
        const result = await api.uploadReceipt(file, groupId);
        setParsedResult(result);
        toast.success('File processed successfully!');
      } catch (err: any) {
        toast.error(err.message || 'Failed to process file');
      } finally {
        setUploading(false);
      }
    },
    [groupId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    setUploading(true);
    setParsedResult(null);
    try {
      const result = await api.parseText(pasteText, groupId);
      setParsedResult(result);
      toast.success('Text parsed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse text');
    } finally {
      setUploading(false);
    }
  };

  const applyAsExpense = (data: ParsedExpense) => {
    setPrefillData({
      description: data.merchantName,
      amount: data.totalAmount,
      date: data.date,
      category: data.category,
      notes: data.items?.map((i) => `${i.description}: $${i.totalPrice}`).join('\n'),
      suggestedParticipants: parsedResult?.suggestedParticipants,
    });
    router.push(`/groups/${groupId}/expenses/new`);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/groups/${groupId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {group?.name || 'Trip'}
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Expense Import</h1>
          <p className="text-gray-500">Upload a receipt, screenshot, or spreadsheet — AI does the rest</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveMode('upload')}
          className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
            activeMode === 'upload'
              ? 'border-primary-600 bg-primary-50 text-primary-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Upload className="h-5 w-5 mx-auto mb-1" />
          Upload File
        </button>
        <button
          onClick={() => setActiveMode('paste')}
          className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
            activeMode === 'paste'
              ? 'border-primary-600 bg-primary-50 text-primary-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FileText className="h-5 w-5 mx-auto mb-1" />
          Paste Text
        </button>
      </div>

      {/* Upload area */}
      {activeMode === 'upload' && (
        <div
          {...getRootProps()}
          className={`card border-2 border-dashed cursor-pointer transition-colors text-center py-16 ${
            isDragActive
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center">
              <Spinner size="lg" />
              <p className="mt-4 text-sm text-gray-600">Processing with AI...</p>
              <p className="text-xs text-gray-400 mt-1">Extracting data from your file</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-4 mb-4 text-gray-400">
                <Image className="h-8 w-8" />
                <FileText className="h-8 w-8" />
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <p className="text-base font-medium text-gray-700">
                {isDragActive ? 'Drop your file here' : 'Drag & drop a file here, or click to browse'}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Supports: Receipt photos, credit card screenshots, PDF bills, CSV/Excel statements
              </p>
              <p className="mt-1 text-xs text-gray-400">Max 10MB</p>
            </>
          )}
        </div>
      )}

      {/* Paste area */}
      {activeMode === 'paste' && (
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste receipt or transaction text
            </label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="input font-mono text-sm"
              rows={10}
              placeholder={`Paste receipt text, e.g.:\n\nOlive Garden\n04/10/2026\n\nPasta Carbonara    $16.99\nCaesar Salad       $12.99\nIced Tea x2        $5.98\n\nSubtotal: $35.96\nTax: $3.24\nTotal: $39.20`}
            />
          </div>
          <button
            onClick={handlePasteSubmit}
            className="btn-primary w-full gap-2"
            disabled={uploading || !pasteText.trim()}
          >
            {uploading ? (
              <>
                <Spinner size="sm" className="text-white" />
                Parsing with AI...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Parse with AI
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {parsedResult && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            AI Extraction Results
          </h2>

          {/* Single expense result */}
          {parsedResult.parsedData && !Array.isArray(parsedResult.parsedData) && (
            <ParsedExpenseCard
              data={parsedResult.parsedData}
              onUse={() => applyAsExpense(parsedResult.parsedData)}
            />
          )}

          {/* Multiple expenses (from spreadsheet) */}
          {Array.isArray(parsedResult.parsedData) && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Found {parsedResult.parsedData.length} transactions
              </p>
              {parsedResult.parsedData.map((item: ParsedExpense, i: number) => (
                <ParsedExpenseCard key={i} data={item} onUse={() => applyAsExpense(item)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Parsed Expense Card ─────────────────────────────────────────────
function ParsedExpenseCard({ data, onUse }: { data: ParsedExpense; onUse: () => void }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{data.merchantName}</h3>
          <p className="text-sm text-gray-500">{data.date} · {data.category}</p>
        </div>
        <span className="text-2xl font-bold text-primary-600">
          {formatCurrency(data.totalAmount, data.currency)}
        </span>
      </div>

      {/* Items */}
      {data.items && data.items.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Items</p>
          <div className="space-y-1">
            {data.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.quantity > 1 && `${item.quantity}× `}
                  {item.description}
                </span>
                <span className="text-gray-500">{formatCurrency(item.totalPrice, data.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax/tip */}
      <div className="flex gap-4 text-sm text-gray-500 mb-4">
        {data.taxAmount != null && <span>Tax: {formatCurrency(data.taxAmount, data.currency)}</span>}
        {data.tipAmount != null && <span>Tip: {formatCurrency(data.tipAmount, data.currency)}</span>}
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                data.confidence > 0.8
                  ? 'bg-green-500'
                  : data.confidence > 0.5
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${data.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{Math.round(data.confidence * 100)}% confidence</span>
        </div>

        <button onClick={onUse} className="btn-primary gap-2 text-sm">
          <Edit className="h-4 w-4" />
          Use & Edit
        </button>
      </div>
    </div>
  );
}
