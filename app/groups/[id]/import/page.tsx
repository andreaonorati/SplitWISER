'use client';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useExpenseFormStore } from '@/stores/expenseFormStore';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, Image, FileSpreadsheet, Sparkles, Check, X, Edit } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ParsedExpense } from '@/types';
import { useI18n } from '@/lib/i18n';

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
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { setPrefillData } = useExpenseFormStore();
  const { t } = useI18n();

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.getGroup(groupId),
  });

  const [uploading, setUploading] = useState(false);
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [importMembers, setImportMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [payerId, setPayerId] = useState('');
  const [failedFiles, setFailedFiles] = useState<Array<{ fileName: string; error: string }>>([]);
  const [pasteText, setPasteText] = useState('');
  const [activeMode, setActiveMode] = useState<'upload' | 'paste'>('upload');

  const normalizeParsedExpenses = (parsedData: any): ParsedExpense[] => {
    if (!parsedData) return [];
    return Array.isArray(parsedData) ? parsedData : [parsedData];
  };

  const initializeImportState = (result: any) => {
    const normalized = normalizeParsedExpenses(result?.parsedData);
    const members = result?.members || [];
    const suggested =
      Array.isArray(result?.suggestedParticipants) && result.suggestedParticipants.length > 0
        ? result.suggestedParticipants
        : members.map((m: any) => m.id);

    setParsedExpenses(normalized);
    setImportMembers(members);
    setSelectedParticipants(suggested);
    setPayerId((prev) => prev || user?.id || members[0]?.id || '');
    setFailedFiles(Array.isArray(result?.failedFiles) ? result.failedFiles : []);
  };

  const approveBulkMutation = useMutation({
    mutationFn: () =>
      api.approveImportedExpenses({
        groupId,
        payerId,
        participantIds: selectedParticipants,
        expenses: parsedExpenses,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      toast.success(`${res.createdCount} ${t('importPage.bulkAddedSuffix')}`);
      router.push(`/groups/${groupId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || t('importPage.bulkFailed'));
    },
  });

  // File drop handler
  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setParsedExpenses([]);
    setFailedFiles([]);

    try {
      const result = await api.uploadReceipts(acceptedFiles, groupId);
      initializeImportState(result);
      toast.success(
        acceptedFiles.length > 1
          ? `${acceptedFiles.length} ${t('importPage.filesProcessed')}`
          : t('importPage.processedSingle')
      );
    } catch (err: any) {
      toast.error(err.message || t('importPage.processFailed'));
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024,
  });

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    setUploading(true);
    setParsedExpenses([]);
    setFailedFiles([]);
    try {
      const result = await api.parseText(pasteText, groupId);
      initializeImportState(result);
      toast.success(t('importPage.parsedOk'));
    } catch (err: any) {
      toast.error(err.message || t('importPage.parseFailed'));
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
      notes: data.items?.map((i) => `${i.description}: ${i.totalPrice}`).join('\n'),
      suggestedParticipants: selectedParticipants,
    });
    router.push(`/groups/${groupId}/expenses/new`);
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const memberOptions: Array<{ id: string; name: string }> =
    importMembers.length > 0
      ? importMembers
      : (group?.members || []).map((m: any) => ({ id: m.userId, name: m.user.name }));

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/groups/${groupId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('importPage.backTo')} {group?.name || 'Trip'}
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('importPage.title')}</h1>
          <p className="text-gray-500">{t('importPage.subtitle')}</p>
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
          {t('importPage.uploadFile')}
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
          {t('importPage.pasteText')}
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
              <p className="mt-4 text-sm text-gray-600">{t('importPage.processing')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('importPage.extracting')}</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-4 mb-4 text-gray-400">
                <Image className="h-8 w-8" />
                <FileText className="h-8 w-8" />
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <p className="text-base font-medium text-gray-700">
                {isDragActive ? t('importPage.dropHere') : t('importPage.dropOrBrowse')}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {t('importPage.supports')}
              </p>
              <p className="mt-1 text-xs text-gray-400">{t('importPage.maxFile')}</p>
            </>
          )}
        </div>
      )}

      {/* Paste area */}
      {activeMode === 'paste' && (
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('importPage.pasteLabel')}
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
                {t('importPage.parsing')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t('importPage.parseWithAi')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {parsedExpenses.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            {t('importPage.resultsTitle')}
          </h2>

          <div className="card space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('importPage.assignPayer')}</label>
                <select
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="input"
                >
                  <option value="">{t('importPage.selectUser')}</option>
                  {memberOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1">{t('importPage.splitParticipants')}</p>
                <div className="max-h-28 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
                  {memberOptions.map((member) => (
                    <label key={member.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(member.id)}
                        onChange={() => toggleParticipant(member.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      {member.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => approveBulkMutation.mutate()}
              disabled={
                approveBulkMutation.isPending ||
                parsedExpenses.length === 0 ||
                !payerId ||
                selectedParticipants.length === 0
              }
              className="btn-primary w-full"
            >
              {approveBulkMutation.isPending
                ? t('importPage.approvingBulk')
                : `${t('importPage.approveBulk')} ${parsedExpenses.length} ${t('importPage.expensesWord')}`}
            </button>
          </div>

          {failedFiles.length > 0 && (
            <div className="card border border-yellow-200 bg-yellow-50 text-yellow-800">
              <p className="text-sm font-medium mb-2">{t('importPage.someFilesFailed')}</p>
              <ul className="text-xs space-y-1">
                {failedFiles.map((file, idx) => (
                  <li key={`${file.fileName}-${idx}`}>• {file.fileName}: {file.error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {t('importPage.foundTransactions')} {parsedExpenses.length} {t('importPage.transactionsWord')}
            </p>
            {parsedExpenses.map((item, i) => (
              <ParsedExpenseCard key={i} data={item} onUse={() => applyAsExpense(item)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Parsed Expense Card ─────────────────────────────────────────────
function ParsedExpenseCard({ data, onUse }: { data: ParsedExpense; onUse: () => void }) {
  const { t } = useI18n();

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
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">{t('importPage.items')}</p>
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
        {data.taxAmount != null && <span>{t('importPage.tax')}: {formatCurrency(data.taxAmount, data.currency)}</span>}
        {data.tipAmount != null && <span>{t('importPage.tip')}: {formatCurrency(data.tipAmount, data.currency)}</span>}
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
          <span className="text-xs text-gray-500">{Math.round(data.confidence * 100)}% {t('importPage.confidence')}</span>
        </div>

        <button onClick={onUse} className="btn-primary gap-2 text-sm">
          <Edit className="h-4 w-4" />
          {t('importPage.useAndEdit')}
        </button>
      </div>
    </div>
  );
}
