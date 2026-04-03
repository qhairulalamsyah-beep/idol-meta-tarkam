'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import {
  Bot, RefreshCw, Send, MessageSquare, Wifi, WifiOff, Loader2,
  Activity, Clock, QrCode, Smartphone, CheckCircle2, AlertCircle,
  Power, Play, Square, Settings, Key, Phone, TestTube, Eye, EyeOff,
} from 'lucide-react';

interface BotStatus {
  status: string;
  port: number;
  uptime?: number;
  totalCommands?: number;
  messagesStored?: number;
  rateLimitedUsers?: number;
  dbConnected?: boolean;
  lastPing?: string;
  error?: string;
}

interface BotLogEntry {
  id: string;
  platform: string;
  command: string;
  sender: string;
  replyPreview: string;
  success: boolean;
  timestamp: string;
}



interface BotManagementTabProps {
  accentClass: string;
  accentBgSubtle: string;
  btnClass: string;
  isMale: boolean;
  isAdminSuperAdmin?: boolean;
}

const ANNOUNCE_TYPES = [
  { id: 'info', label: 'Info', emoji: '📢' },
  { id: 'warning', label: 'Warning', emoji: '⚠️' },
  { id: 'match_result', label: 'Hasil', emoji: '⚔️' },
  { id: 'match_live', label: 'Live', emoji: '🔴' },
  { id: 'registration', label: 'Daftar', emoji: '📝' },
  { id: 'bracket', label: 'Bracket', emoji: '🏆' },
  { id: 'final', label: 'Final', emoji: '👑' },
  { id: 'mvp_update', label: 'MVP', emoji: '🌟' },
  { id: 'donation', label: 'Donasi', emoji: '💝' },
  { id: 'sawer', label: 'Sawer', emoji: '💸' },
] as const;

export function BotManagementTab({ accentClass, accentBgSubtle, btnClass, isMale, isAdminSuperAdmin }: BotManagementTabProps) {
  const [botStatus, setBotStatus] = useState<{ whatsapp: BotStatus | null; discord: BotStatus | null }>({ whatsapp: null, discord: null });
  const [statusLoading, setStatusLoading] = useState(false);
  const [botLogs, setBotLogs] = useState<BotLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [announceMsg, setAnnounceMsg] = useState('');
  const [announceType, setAnnounceType] = useState('info');
  const [announceSending, setAnnounceSending] = useState(false);
  const [announceResult, setAnnounceResult] = useState<{ results?: Array<{ platform: string; success: boolean }> } | null>(null);
  const [logPlatform, setLogPlatform] = useState<'all' | 'whatsapp' | 'discord'>('all');

  const [qrData, setQrData] = useState<{ state: string; connected: boolean; qrAvailable: boolean; qrUrl: string | null; message: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImgError, setQrImgError] = useState(false);

  const [restartLoading, setRestartLoading] = useState<'whatsapp' | 'discord' | 'all' | null>(null);

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

  const fetchStatus = useCallback(() => {
    setStatusLoading(true);
    fetch('/api/bots/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.whatsapp) setBotStatus((prev) => ({ ...prev, whatsapp: data.whatsapp }));
        if (data.discord) setBotStatus((prev) => ({ ...prev, discord: data.discord }));
        // Also merge logs from status response
        if (data.logs && Array.isArray(data.logs)) {
          setBotLogs(data.logs);
        }
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, []);

  const fetchLogs = useCallback(() => {
    setLogsLoading(true);
    fetch(`/api/bots/logs?platform=${logPlatform}&limit=30`)
      .then((r) => r.json())
      .then((data) => {
        if (data.logs && data.logs.length > 0) {
          setBotLogs(data.logs);
        }
        // If DB logs empty, try status endpoint which has bot memory logs
        if (!data.logs || data.logs.length === 0) {
          fetch('/api/bots/status')
            .then((r) => r.json())
            .then((statusData) => {
              if (statusData.logs && statusData.logs.length > 0) {
                setBotLogs(statusData.logs);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, [logPlatform]);

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
    fetchStatus();
    fetchQr();
    fetchMetaSettings();
  }, [fetchStatus, fetchQr, fetchMetaSettings]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleAnnounce = async () => {
    if (!announceMsg.trim()) return;
    setAnnounceSending(true);
    setAnnounceResult(null);
    try {
      const res = await fetch('/api/bots/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: announceMsg, type: announceType }),
      });
      const data = await res.json();
      setAnnounceResult(data);
      if (res.ok) {
        setAnnounceMsg('');
        setTimeout(() => setAnnounceResult(null), 5000);
      }
    } catch {
      setAnnounceResult({ results: [{ platform: 'whatsapp', success: false }, { platform: 'discord', success: false }] });
    }
    setAnnounceSending(false);
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}j ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const timeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'baru saja';
      if (mins < 60) return `${mins}m lalu`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}j lalu`;
      return `${Math.floor(hrs / 24)}h lalu`;
    } catch {
      return '-';
    }
  };

  const waOnline = botStatus.whatsapp?.status === 'ok' || botStatus.whatsapp?.status === 'online';
  const dcOnline = botStatus.discord?.status === 'ok' || botStatus.discord?.status === 'online';

  const handleRestartBots = async (bot: 'whatsapp' | 'discord' | 'all') => {
    setRestartLoading(bot);
    try {
      // Call API with restart: true to kill existing process and start fresh
      const res = await fetch('/api/bots/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot, restart: true }),
      });
      const data = await res.json();
      if (data.success) {
        // Wait a moment then refresh status
        setTimeout(() => {
          fetchStatus();
          fetchQr();
        }, 3000);
      }
    } catch {
      // Ignore errors
    } finally {
      setRestartLoading(null);
    }
  };

  // Filter logs by selected platform
  const filteredLogs = logPlatform === 'all'
    ? botLogs
    : botLogs.filter((log) => log.platform === logPlatform);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
            <Bot className={`w-4 h-4 ${accentClass}`} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white/90">Bot Management</p>
            <p className="text-[10px] text-white/30">WhatsApp & Discord bot monitoring & control</p>
          </div>
        </div>
        <motion.button
          onClick={() => { fetchStatus(); fetchLogs(); }}
          className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center text-white/40 hover:bg-white/12 transition-colors"
          whileTap={{ scale: 0.9 }}
        >
          <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Bot Control Panel */}
      <div className="glass-subtle rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power className="w-4 h-4 text-amber-400" />
            <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">Bot Control</p>
          </div>
          <motion.button
            onClick={() => handleRestartBots('all')}
            disabled={restartLoading !== null}
            className="px-3 py-1.5 rounded-xl text-[10px] font-semibold bg-amber-500/12 text-amber-400 border border-amber-500/15 flex items-center gap-1.5 disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {restartLoading === 'all' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            Restart Semua
          </motion.button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* WhatsApp Control */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${waOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-[11px] text-white/70">WhatsApp</span>
            </div>
            <motion.button
              onClick={() => handleRestartBots('whatsapp')}
              disabled={restartLoading !== null}
              className={`px-2 py-1 rounded-lg text-[9px] font-semibold flex items-center gap-1 transition-all ${
                waOnline
                  ? 'bg-green-500/12 text-green-400'
                  : 'bg-red-500/12 text-red-400'
              } disabled:opacity-50`}
              whileTap={{ scale: 0.95 }}
            >
              {restartLoading === 'whatsapp' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : waOnline ? (
                <RefreshCw className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {waOnline ? 'Restart' : 'Start'}
            </motion.button>
          </div>
          {/* Discord Control */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${dcOnline ? 'bg-[#5865F2] animate-pulse' : 'bg-red-400'}`} />
              <span className="text-[11px] text-white/70">Discord</span>
            </div>
            <motion.button
              onClick={() => handleRestartBots('discord')}
              disabled={restartLoading !== null}
              className={`px-2 py-1 rounded-lg text-[9px] font-semibold flex items-center gap-1 transition-all ${
                dcOnline
                  ? 'bg-[#5865F2]/12 text-[#5865F2]'
                  : 'bg-red-500/12 text-red-400'
              } disabled:opacity-50`}
              whileTap={{ scale: 0.95 }}
            >
              {restartLoading === 'discord' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : dcOnline ? (
                <RefreshCw className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {dcOnline ? 'Restart' : 'Start'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* WhatsApp */}
        <motion.div
          className={`glass-subtle rounded-2xl p-4 ${waOnline ? 'border border-green-500/15' : 'border border-red-500/15'}`}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${waOnline ? 'bg-green-500/15' : 'bg-red-500/10'}`}>
              {waOnline ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-white/90 truncate">WhatsApp</p>
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${waOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className={`text-[9px] font-semibold ${waOnline ? 'text-green-400' : 'text-red-400'}`}>
                  {waOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          {botStatus.whatsapp && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/30">Port</span>
                <span className="text-white/60 font-mono">{botStatus.whatsapp.port}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/30">Uptime</span>
                <span className="text-white/60">{formatUptime(botStatus.whatsapp.uptime)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/30">Commands</span>
                <span className="text-white/60 font-mono">{botStatus.whatsapp.totalCommands || 0}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/30">Messages</span>
                <span className="text-white/60 font-mono">{botStatus.whatsapp.messagesStored || 0}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/30">DB</span>
                <span className={botStatus.whatsapp.dbConnected ? 'text-green-400' : 'text-red-400'}>
                  {botStatus.whatsapp.dbConnected ? '✅ Connected' : '❌ Offline'}
                </span>
              </div>
              {botStatus.whatsapp.rateLimitedUsers ? (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white/30">Rate Limited</span>
                  <span className="text-amber-400 font-mono">{botStatus.whatsapp.rateLimitedUsers}</span>
                </div>
              ) : null}
              {botStatus.whatsapp.error && (
                <p className="text-[9px] text-red-400/80 mt-1 truncate">{botStatus.whatsapp.error}</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Discord */}
        <motion.div
          className={`glass-subtle rounded-2xl p-4 ${dcOnline ? 'border border-[#5865F2]/15' : 'border border-red-500/15'}`}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dcOnline ? 'bg-[#5865F2]/15' : 'bg-red-500/10'}`}>
              {dcOnline ? <Wifi className="w-4 h-4 text-[#5865F2]" /> : <WifiOff className="w-4 h-4 text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-white/90 truncate">Discord</p>
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${dcOnline ? 'bg-[#5865F2] animate-pulse' : 'bg-red-400'}`} />
                <span className={`text-[9px] font-semibold ${dcOnline ? 'text-[#5865F2]' : 'text-red-400'}`}>
                  {dcOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          {botStatus.discord && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/30">Port</span>
                <span className="text-white/60 font-mono">{botStatus.discord.port}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/30">Uptime</span>
                <span className="text-white/60">{formatUptime(botStatus.discord.uptime)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/30">Commands</span>
                <span className="text-white/60 font-mono">{botStatus.discord.totalCommands || 0}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/30">Messages</span>
                <span className="text-white/60 font-mono">{botStatus.discord.messagesStored || 0}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/30">DB</span>
                <span className={botStatus.discord.dbConnected ? 'text-green-400' : 'text-red-400'}>
                  {botStatus.discord.dbConnected ? '✅ Connected' : '❌ Offline'}
                </span>
              </div>
              {botStatus.discord.rateLimitedUsers ? (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white/30">Rate Limited</span>
                  <span className="text-amber-400 font-mono">{botStatus.discord.rateLimitedUsers}</span>
                </div>
              ) : null}
              {botStatus.discord.error && (
                <p className="text-[9px] text-red-400/80 mt-1 truncate">{botStatus.discord.error}</p>
              )}
            </div>
          )}
        </motion.div>
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
              onClick={() => { fetchQr(); fetchStatus(); }}
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

      {/* Broadcast Announcement */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Send className={`w-4 h-4 ${accentClass}`} />
          <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">Pengumuman</p>
        </div>
        <div className="glass-subtle rounded-2xl p-4 space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {ANNOUNCE_TYPES.map((type) => (
              <motion.button
                key={type.id}
                onClick={() => setAnnounceType(type.id)}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-semibold flex items-center gap-1 transition-all ${
                  announceType === type.id
                    ? 'bg-white/10 text-white/90 ring-1 ring-white/15'
                    : 'bg-white/[0.03] text-white/30 hover:bg-white/[0.06]'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <span>{type.emoji}</span>
                {type.label}
              </motion.button>
            ))}
          </div>
          <textarea
            value={announceMsg}
            onChange={(e) => setAnnounceMsg(e.target.value)}
            placeholder="Ketik pesan broadcast..."
            rows={3}
            className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-white/15 transition-colors resize-none"
          />
          <motion.button
            onClick={handleAnnounce}
            disabled={announceSending || !announceMsg.trim()}
            className={`${btnClass} btn-ios w-full py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {announceSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Kirim ke Semua Bot
          </motion.button>
          <AnimatePresence>
            {announceResult?.results && (
              <motion.div
                className={`flex items-center gap-2 text-[11px] p-2.5 rounded-xl ${
                  announceResult.results.every((r) => r.success)
                    ? 'bg-green-500/10 text-green-400'
                    : announceResult.results.some((r) => r.success)
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-red-500/10 text-red-400'
                }`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <Activity className="w-3.5 h-3.5" />
                {announceResult.results.map((r) => (
                  <span key={r.platform}>
                    {r.platform === 'whatsapp' ? '💬' : '🎮'} {r.platform}: {r.success ? '✅' : '❌'}
                  </span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">Activity Log</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/25 font-mono">{filteredLogs.length}</span>
          </div>
          <div className="flex gap-1">
            {(['all', 'whatsapp', 'discord'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setLogPlatform(p)}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                  logPlatform === p ? 'bg-white/10 text-white/80' : 'bg-white/[0.03] text-white/25'
                }`}
              >
                {p === 'all' ? 'Semua' : p === 'whatsapp' ? '💬 WA' : '🎮 DC'}
              </button>
            ))}
          </div>
        </div>

        {logsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className={`w-5 h-5 animate-spin ${accentClass}`} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="glass-subtle rounded-2xl p-6 text-center">
            <MessageSquare className="w-7 h-7 text-white/20 mx-auto mb-2" />
            <p className="text-[13px] text-white/30 font-medium">Belum ada aktivitas bot</p>
            <p className="text-[11px] text-white/15 mt-0.5">Command logs akan muncul setelah bot digunakan</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                className="glass-subtle rounded-2xl p-3"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    log.platform === 'whatsapp' ? 'bg-green-500/12 text-green-400' : 'bg-[#5865F2]/12 text-[#5865F2]'
                  }`}>
                    {log.platform === 'whatsapp' ? '💬' : '🎮'}
                  </span>
                  <code className="text-[11px] font-mono font-bold text-white/80">{log.command}</code>
                  <span className="text-[10px] text-white/20 ml-auto">{timeAgo(log.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/35">{log.sender || 'Unknown'}</span>
                  <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full ${
                    log.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {log.success ? 'OK' : 'ERR'}
                  </span>
                </div>
                {log.replyPreview && (
                  <p className="text-[10px] text-white/25 mt-1 truncate">{log.replyPreview.substring(0, 120)}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
