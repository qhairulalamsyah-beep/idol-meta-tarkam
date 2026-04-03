'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import {
  Bot, RefreshCw, Loader2,
  QrCode, Smartphone, CheckCircle2, AlertCircle,
  Settings, Key, Phone, TestTube, Eye, EyeOff,
} from 'lucide-react';

interface BotManagementTabProps {
  accentClass: string;
  accentBgSubtle: string;
  btnClass: string;
  isMale: boolean;
  isAdminSuperAdmin?: boolean;
}

export function BotManagementTab({ accentClass, accentBgSubtle, isAdminSuperAdmin }: BotManagementTabProps) {
  const [statusLoading, setStatusLoading] = useState(false);

  const [qrData, setQrData] = useState<{ state: string; connected: boolean; qrAvailable: boolean; qrUrl: string | null; message: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImgError, setQrImgError] = useState(false);

  // Meta API Configuration State
  const [metaSettings, setMetaSettings] = useState<{
    enabled: boolean;
    phoneNumberId: string;
    accessToken: string;
    businessAccountId: string;
    webhookVerifyToken: string;
    appSecret: string;
  }>({
    enabled: false,
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
    webhookVerifyToken: '',
    appSecret: '',
  });
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaTesting, setMetaTesting] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);

  // Fetch Meta API settings
  const fetchMetaSettings = useCallback(async () => {
    setMetaLoading(true);
    try {
      const res = await fetch('/api/whatsapp/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setMetaSettings({
          enabled: data.settings.metaApiEnabled || false,
          phoneNumberId: data.settings.metaPhoneNumberId || '',
          accessToken: '', // Don't show full token for security
          businessAccountId: data.settings.metaBusinessAccountId || '',
          webhookVerifyToken: data.settings.metaWebhookVerifyToken || '',
          appSecret: '', // Don't show secret for security
        });
      }
    } catch {
      // Ignore errors
    } finally {
      setMetaLoading(false);
    }
  }, []);

  // Save Meta API settings
  const saveMetaSettings = async () => {
    setMetaSaving(true);
    try {
      const res = await fetch('/api/whatsapp/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaApiEnabled: metaSettings.enabled,
          metaPhoneNumberId: metaSettings.phoneNumberId || undefined,
          metaAccessToken: metaSettings.accessToken || undefined,
          metaBusinessAccountId: metaSettings.businessAccountId || undefined,
          metaWebhookVerifyToken: metaSettings.webhookVerifyToken || undefined,
          metaAppSecret: metaSettings.appSecret || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Show success briefly
        setTimeout(() => fetchMetaSettings(), 1000);
      }
    } catch {
      // Ignore errors
    } finally {
      setMetaSaving(false);
    }
  };

  // Test Meta API connection
  const testMetaApi = async () => {
    setMetaTesting(true);
    setMetaTestResult(null);
    try {
      const res = await fetch('/api/bots/test-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setMetaTestResult({
        success: data.success,
        message: data.success
          ? `Pesan test terkirim! ID: ${data.messageId}`
          : data.error || 'Gagal mengirim pesan test',
      });
    } catch {
      setMetaTestResult({
        success: false,
        message: 'Gagal terhubung ke bot service',
      });
    } finally {
      setMetaTesting(false);
    }
  };

  const fetchQr = useCallback(() => {
    setQrLoading(true);
    setQrImgError(false);
    fetch('/api/bots/qr')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setQrData(data);
        }
      })
      .catch(() => {})
      .finally(() => setQrLoading(false));
  }, []);

  useEffect(() => {
    fetchQr();
    fetchMetaSettings();
  }, [fetchQr, fetchMetaSettings]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
            <Bot className={`w-4 h-4 ${accentClass}`} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white/90">WhatsApp Setup</p>
            <p className="text-[10px] text-white/30">QR Code & Meta API Configuration</p>
          </div>
        </div>
        <motion.button
          onClick={() => { fetchQr(); fetchMetaSettings(); }}
          className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center text-white/40 hover:bg-white/12 transition-colors"
          whileTap={{ scale: 0.9 }}
        >
          <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* WhatsApp QR Code - Only for Super Admin */}
      {isAdminSuperAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-green-400" />
              <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">WhatsApp QR Code</p>
            </div>
            <motion.button
              onClick={() => { fetchQr(); }}
              className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-white/40 hover:bg-white/12 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <RefreshCw className={`w-3 h-3 ${qrLoading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
          <div className="glass-subtle rounded-2xl p-5">
            {qrLoading ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-green-400/60" />
                <p className="text-[12px] text-white/30 mt-3">Mengecek status WhatsApp...</p>
              </div>
            ) : !qrData ? (
              <div className="flex flex-col items-center py-8">
                <AlertCircle className="w-8 h-8 text-red-400/40" />
                <p className="text-[12px] text-white/30 mt-3">Gagal terhubung ke WhatsApp bot</p>
                <p className="text-[10px] text-white/15 mt-1">Pastikan bot berjalan di port 6002</p>
              </div>
            ) : qrData.connected ? (
              <div className="flex flex-col items-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-green-500/12 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-[14px] font-bold text-green-400">WhatsApp Terhubung</p>
                <p className="text-[11px] text-white/30 mt-1">Bot aktif dan siap menerima command</p>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-green-400/70 font-medium">Connected</span>
                </div>
              </div>
            ) : qrData.qrAvailable && qrData.qrUrl ? (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-56 h-56 rounded-2xl bg-white p-3 shadow-lg shadow-green-500/5">
                    {!qrImgError ? (
                      <img
                        src={qrData.qrUrl}
                        alt="WhatsApp QR Code"
                        className="w-full h-full object-contain rounded-lg"
                        onError={() => setQrImgError(true)}
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg bg-gray-100 flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                  </div>
                  {/* Decorative corner indicators */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-green-400/40 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-green-400/40 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-green-400/40 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-green-400/40 rounded-br-lg" />
                </div>
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <Smartphone className="w-3.5 h-3.5 text-green-400" />
                    <p className="text-[12px] font-semibold text-white/80">Scan QR Code</p>
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed">
                    Buka WhatsApp → {qrData.state === 'qr' ? 'Perangkat Terhubung' : 'Settings'} →{' '}
                    <span className="text-white/50">Hubungkan Perangkat</span>
                  </p>
                  <p className="text-[10px] text-white/20 mt-2">QR berlaku selama ~60 detik</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-3">
                  <Loader2 className="w-7 h-7 text-amber-400/60 animate-spin" />
                </div>
                <p className="text-[13px] font-bold text-white/60">Menunggu QR Code...</p>
                <p className="text-[11px] text-white/25 mt-1">{qrData.message}</p>
                <motion.button
                  onClick={() => { fetchQr(); fetchStatus(); }}
                  className="mt-4 px-4 py-2 rounded-xl text-[11px] font-semibold bg-green-500/12 text-green-400 border border-green-500/15"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Cek Ulang
                </motion.button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meta API Configuration - Only for Super Admin */}
      {isAdminSuperAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400" />
              <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">Meta API (Official)</p>
            </div>
            <motion.button
              onClick={() => fetchMetaSettings()}
              className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-white/40 hover:bg-white/12 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <RefreshCw className={`w-3 h-3 ${metaLoading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>

          <div className="glass-subtle rounded-2xl p-4 space-y-4">
            {/* Provider Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${metaSettings.enabled ? 'bg-blue-400 animate-pulse' : 'bg-white/20'}`} />
                <div>
                  <p className="text-[11px] font-medium text-white/70">Meta API Status</p>
                  <p className="text-[9px] text-white/30">
                    {metaSettings.enabled ? 'Aktif - Menggunakan WhatsApp Business API' : 'Tidak aktif'}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={() => setMetaSettings({ ...metaSettings, enabled: !metaSettings.enabled })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  metaSettings.enabled ? 'bg-blue-500/30' : 'bg-white/10'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                  metaSettings.enabled ? 'left-6 bg-blue-400' : 'left-1 bg-white/40'
                }`} />
              </motion.button>
            </div>

            {/* Phone Number ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/40 flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                Phone Number ID
              </label>
              <input
                type="text"
                value={metaSettings.phoneNumberId}
                onChange={(e) => setMetaSettings({ ...metaSettings, phoneNumberId: e.target.value })}
                placeholder="123456789012345"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white/90 text-[11px] font-mono placeholder-white/20 focus:outline-none focus:border-blue-500/30 transition-colors"
              />
            </div>

            {/* Access Token */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/40 flex items-center gap-1.5">
                <Key className="w-3 h-3" />
                Access Token (Permanent)
              </label>
              <div className="relative">
                <input
                  type={showAccessToken ? 'text' : 'password'}
                  value={metaSettings.accessToken}
                  onChange={(e) => setMetaSettings({ ...metaSettings, accessToken: e.target.value })}
                  placeholder="EAAxxxxxxxxxxxxxxxx..."
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 pr-10 text-white/90 text-[11px] font-mono placeholder-white/20 focus:outline-none focus:border-blue-500/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
                >
                  {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[9px] text-white/20">Dapatkan dari Meta Business Suite → WhatsApp → API Setup</p>
            </div>

            {/* Business Account ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/40 flex items-center gap-1.5">
                <Bot className="w-3 h-3" />
                Business Account ID (opsional)
              </label>
              <input
                type="text"
                value={metaSettings.businessAccountId}
                onChange={(e) => setMetaSettings({ ...metaSettings, businessAccountId: e.target.value })}
                placeholder="123456789012345"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white/90 text-[11px] font-mono placeholder-white/20 focus:outline-none focus:border-blue-500/30 transition-colors"
              />
            </div>

            {/* Webhook Verify Token */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-white/40 flex items-center gap-1.5">
                <Key className="w-3 h-3" />
                Webhook Verify Token (opsional)
              </label>
              <input
                type="text"
                value={metaSettings.webhookVerifyToken}
                onChange={(e) => setMetaSettings({ ...metaSettings, webhookVerifyToken: e.target.value })}
                placeholder="your_verify_token"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white/90 text-[11px] placeholder-white/20 focus:outline-none focus:border-blue-500/30 transition-colors"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <motion.button
                onClick={saveMetaSettings}
                disabled={metaSaving}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {metaSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                Simpan
              </motion.button>
              <motion.button
                onClick={testMetaApi}
                disabled={metaTesting || !metaSettings.enabled || !metaSettings.phoneNumberId}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {metaTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
                Test API
              </motion.button>
            </div>

            {/* Test Result */}
            <AnimatePresence>
              {metaTestResult && (
                <motion.div
                  className={`p-3 rounded-xl text-[11px] ${
                    metaTestResult.success
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {metaTestResult.message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <p className="text-[10px] text-white/40 leading-relaxed">
                <strong className="text-blue-400/80">💡 Info:</strong> Meta API adalah WhatsApp Business API resmi.
                Berbeda dengan Baileys (gratis), Meta API memerlukan biaya per percakapan (~$0.004-0.09).
                Meta API tidak mendukung pengiriman ke grup.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
