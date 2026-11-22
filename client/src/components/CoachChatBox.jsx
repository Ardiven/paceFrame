import React, { useState, useRef, useEffect } from 'react';
import MutationProposalCard from './MutationProposalCard.jsx';
import ProgressCharts from './ProgressCharts.jsx';
import { apiFetch } from '../services/api.js';

export default function CoachChatBox({ latestEvaluation, safetyState, latestLog, allLogs = [], onMutationApproved, session }) {
  const [activeView, setActiveView] = useState('eval'); // 'eval' | 'chat'
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'coach',
      text: 'Halo Victor! Saya personal AI Running Coach Anda. Sesi interval 5x800m Anda kemarin tercatat solid. Ada kekhawatiran khusus tentang ketegangan otot atau rencana adaptasi pemulihan besok?',
      time: '08:14 AM',
      mutation: null
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [appliedMutations, setAppliedMutations] = useState({});

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, activeView]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text || text.trim() === '') return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      time: 'Baru saja',
      mutation: null
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const response = await apiFetch('/api/coach/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text.trim() })
      }, session);
      const data = await response.json();

      const coachMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'coach',
        text: data.replyMarkdown || 'Pesan diterima. Terus perhatikan sinyal tubuh dan istirahat optimal.',
        time: 'Baru saja',
        mutation: data.proposedMutation || null
      };
      setMessages((prev) => [...prev, coachMsg]);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleApproveMutation = async (msgId, mutation) => {
    try {
      const res = await apiFetch(`/api/schedules/${mutation.schedule_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...mutation.mutationData,
          reason: mutation.reason
        })
      }, session);
      const result = await res.json();
      if (result.status === 'success') {
        setAppliedMutations((prev) => ({ ...prev, [msgId]: true }));
        if (onMutationApproved) onMutationApproved();
      }
    } catch (err) {
      console.error('Gagal menerapkan mutasi:', err);
    }
  };

  const handleRejectMutation = (msgId) => {
    setAppliedMutations((prev) => ({ ...prev, [msgId]: 'rejected' }));
  };

  const formatMarkdown = (content) => {
    if (!content) return [];
    const lines = content.split('\n');
    const elements = [];
    let listBuffer = [];
    let idx = 0;

    const flushList = () => {
      if (listBuffer.length > 0) {
        elements.push(
          <ul key={`ul-${idx++}`} className="ml-4 mt-1 mb-1 flex flex-col gap-0.5 list-none">
            {listBuffer.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12.5px] text-on-surface leading-relaxed">
                <span className="text-primary mt-0.5 shrink-0 text-[10px]">▸</span>
                <span dangerouslySetInnerHTML={{ __html: item }} />
              </li>
            ))}
          </ul>
        );
        listBuffer = [];
      }
    };

    for (const line of lines) {
      // Apply inline formatting
      let fmt = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-on-surface font-bold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-secondary">$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-surface-container px-1 rounded text-[11px] font-mono text-primary">$1</code>');

      // H2 heading (##)
      if (/^## /.test(line)) {
        flushList();
        const text = fmt.replace(/^## /, '');
        elements.push(
          <h3 key={idx++} className="font-headline text-[15px] font-bold text-primary mt-3 mb-1 flex items-center gap-1.5">
            <span className="w-1 h-4 rounded-full bg-primary inline-block"></span>
            <span dangerouslySetInnerHTML={{ __html: text }} />
          </h3>
        );
        continue;
      }

      // H3/H4 heading (### / ####)
      if (/^#{3,4} /.test(line)) {
        flushList();
        const text = fmt.replace(/^#{3,4} /, '');
        elements.push(
          <h4 key={idx++} className="font-headline text-[13px] font-bold text-primary mt-2.5 mb-0.5 uppercase tracking-wide"
            dangerouslySetInnerHTML={{ __html: text }} />
        );
        continue;
      }

      // List items (- or *)
      if (/^[*-] /.test(line)) {
        const item = fmt.replace(/^[*-] /, '');
        listBuffer.push(item);
        continue;
      }

      // Horizontal rule (--- or ***)
      if (/^[-*]{3,}$/.test(line.trim())) {
        flushList();
        elements.push(<hr key={idx++} className="my-3 border-surface-container" />);
        continue;
      }

      // Empty line
      if (!line.trim()) {
        flushList();
        elements.push(<div key={idx++} className="h-1" />);
        continue;
      }

      // Normal paragraph
      flushList();
      elements.push(
        <p key={idx++} className="text-[12.5px] text-on-surface leading-relaxed"
          dangerouslySetInnerHTML={{ __html: fmt }} />
      );
    }

    flushList();
    return elements;
  };

  return (
    <div className={`flex flex-col w-full ${activeView === 'chat' ? 'pb-48' : 'pb-28'}`}>
      {/* 1. View Switcher Tabs */}
      <div className="px-margin-mobile pt-space-xs pb-space-xs">
        <div className="bg-surface-container p-1 rounded-full flex items-center shadow-sm">
          <button
            onClick={() => setActiveView('eval')}
            className={`flex-1 py-2 px-3 rounded-full font-headline text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeView === 'eval'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">analytics</span>
            <span className="truncate">Evaluasi Sesi Lari</span>
          </button>
          <button
            onClick={() => setActiveView('chat')}
            className={`flex-1 py-2 px-3 rounded-full font-headline text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeView === 'chat'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
            <span className="truncate">Tanya AI Coach (Gemini)</span>
          </button>
        </div>
      </div>

      {/* 2. Session Context Strip with Bio-Status Pill */}
      <div className="px-margin-mobile py-space-xs">
        <div className="bg-surface-container-lowest rounded-xl p-space-sm flex items-center justify-between shadow-sm border border-surface-container/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary-container/15 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">directions_run</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-outline tracking-wider">
                  Sesi Terpilih
                </span>
                <span className="text-outline text-[10px]">•</span>
                <span className="text-[10px] font-bold text-secondary">Terakhir Dicatat</span>
              </div>
              <p className="font-headline text-[13px] font-bold text-on-surface truncate">
                Interval 5x800m (6.52 km)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/40 text-secondary shrink-0">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-[11px] font-bold tracking-wide uppercase">
              {safetyState?.state || 'NORMAL'}
            </span>
          </div>
        </div>
      </div>

      {/* ================= VIEW 1: DIAGNOSTIC REPORT (6 Pillars) ================= */}
      {activeView === 'eval' && (
        <div className="flex flex-col gap-3 px-margin-mobile pt-space-xs animate-fade-in">
          {latestEvaluation && (
            <div className="bg-secondary-container/20 border border-secondary/40 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">smart_toy</span>
                <span className="font-headline text-[12px] font-bold text-primary">
                  Evaluasi Langsung Gemini AI Coach
                </span>
              </div>
              <div className="text-[12.5px] text-on-surface leading-relaxed flex flex-col gap-0.5">
                {formatMarkdown(latestEvaluation)}
              </div>
            </div>
          )}

          {/* Pillar 1 */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-surface-container/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-surface-container-high text-primary flex items-center justify-center text-[12px] font-bold">1</span>
                <h3 className="font-headline text-[14px] font-bold text-on-surface">Ringkasan Fakta Objektif</h3>
              </div>
              <span className="text-[11px] text-outline">Telemetry Verified</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-surface-container-low rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] text-outline uppercase font-bold">Total Jarak</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline text-[18px] font-bold text-on-surface">
                    {latestLog?.actual_distance_km ? Number(latestLog.actual_distance_km).toFixed(2) : '6.52'}
                  </span>
                  <span className="text-[11px] text-outline">km</span>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] text-outline uppercase font-bold">Total Durasi</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline text-[18px] font-bold text-on-surface">
                    {latestLog?.actual_duration_sec
                      ? `${Math.floor(latestLog.actual_duration_sec / 60)}:${(latestLog.actual_duration_sec % 60).toString().padStart(2, '0')}`
                      : '37:48'}
                  </span>
                  <span className="text-[11px] text-outline">menit</span>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] text-outline uppercase font-bold">Rata-rata Pace</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline text-[18px] font-bold text-primary">
                    {latestLog?.formatted_pace || (latestLog?.avg_pace_sec_km ? `${Math.floor(latestLog.avg_pace_sec_km / 60)}:${(latestLog.avg_pace_sec_km % 60).toString().padStart(2, '0')}` : '5:47')}
                  </span>
                  <span className="text-[11px] text-outline">/km</span>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] text-outline uppercase font-bold">Rata-rata HR</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline text-[18px] font-bold text-on-surface">
                    {latestLog?.avg_hr ?? 162}
                  </span>
                  <span className="text-[11px] text-outline">bpm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-surface-container/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-surface-container-high text-primary flex items-center justify-center text-[12px] font-bold">2</span>
                <h3 className="font-headline text-[14px] font-bold text-on-surface">Kesesuaian Tujuan</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-[11px] font-bold">Tervalidasi</span>
            </div>
            <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-outline">Pace Aktual Sesi Ini</span>
                <span className="font-headline text-[13px] font-bold text-on-surface">
                  {latestLog?.formatted_pace ? `${latestLog.formatted_pace} /km` : '5:47 /km'}
                </span>
              </div>
              <div className="relative w-full h-3 bg-surface-container-highest rounded-full overflow-hidden mt-1">
                <div className="absolute left-1/4 right-1/4 top-0 bottom-0 bg-secondary/30"></div>
                <div className="absolute left-[50%] w-2 h-full bg-primary rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>

          {/* Recharts Visual Progress Trends */}
          <div className="pt-1">
            <ProgressCharts latestLog={latestLog} allLogs={allLogs} />
          </div>
        </div>
      )}

      {/* ================= VIEW 2: TANYA AI COACH ================= */}
      {activeView === 'chat' && (
        <div className="flex flex-col gap-3 px-margin-mobile pt-space-xs animate-fade-in relative">
          {/* Messages */}
          <div className="flex flex-col gap-3">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isApplied = appliedMutations[msg.id] === true;
              const isRejected = appliedMutations[msg.id] === 'rejected';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : ''}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl p-3.5 shadow-sm max-w-[88%] text-[13px] ${
                        isUser
                          ? 'bg-primary text-on-primary rounded-tr-sm'
                          : 'bg-surface-container-lowest text-on-surface rounded-tl-sm border border-surface-container/60'
                      }`}
                    >
                      <div className="space-y-1">
                        {isUser ? msg.text : formatMarkdown(msg.text)}
                      </div>
                      <span
                        className={`text-[10px] mt-1.5 block ${
                          isUser ? 'text-on-primary/70 text-right' : 'text-outline'
                        }`}
                      >
                        {msg.time}
                      </span>
                    </div>
                  </div>

                  {/* Render Mutation Proposal Card if AI suggested an adjustment */}
                  {msg.mutation && (
                    <div className="w-full max-w-[92%] ml-10">
                      {isApplied ? (
                        <div className="p-3 bg-secondary-container/40 border border-secondary rounded-xl text-secondary text-[12px] font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          <span>Perubahan berhasil disetujui &amp; diterapkan ke Kalender Jadwal!</span>
                        </div>
                      ) : isRejected ? (
                        <div className="p-2.5 bg-surface-container rounded-xl text-on-surface-variant text-[11px]">
                          Usulan perubahan ditolak oleh atlet. Jadwal tetap menggunakan rencana awal.
                        </div>
                      ) : (
                        <MutationProposalCard
                          proposal={msg.mutation}
                          onApprove={() => handleApproveMutation(msg.id, msg.mutation)}
                          onReject={() => handleRejectMutation(msg.id)}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-2 text-outline text-[12px] italic p-2 bg-surface-container-low rounded-xl">
                <span className="material-symbols-outlined text-[18px] animate-spin text-primary">sync</span>
                <span>AI Coach sedang menganalisis &amp; merancang penyesuaian...</span>
              </div>
            )}

            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* ================= DOCKED STICKY BOTTOM INPUT ================= */}
          <div
            className="fixed left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl px-margin-mobile py-2.5 border-t border-surface-container/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex flex-col gap-1.5"
            style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Quick Prompts */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => handleSendMessage('Coach, ubah jadwal lari Kamis jadi 4 km aja ya')}
                className="py-1 px-3 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface text-[11px] font-medium transition-colors shrink-0 whitespace-nowrap shadow-xs"
              >
                "Ubah jadwal Kamis jadi 4 km"
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Tolong kurangi target jarak lari hari Minggu')}
                className="py-1 px-3 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface text-[11px] font-medium transition-colors shrink-0 whitespace-nowrap shadow-xs"
              >
                "Kurangi jarak Minggu"
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Apakah saya siap untuk interval berikutnya?')}
                className="py-1 px-3 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface text-[11px] font-medium transition-colors shrink-0 whitespace-nowrap shadow-xs"
              >
                "Kesiapan interval"
              </button>
            </div>

            {/* Input & Send Action Pill */}
            <div className="bg-surface-container-lowest p-1 rounded-full flex items-center shadow-sm border border-surface-container">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Tanya atau minta ubah jadwal lari..."
                className="flex-1 bg-transparent px-3 text-[13px] text-on-surface placeholder:text-outline focus:outline-none min-w-0"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isSending || !inputText.trim()}
                className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-transform disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              </button>
            </div>
          </div>

          {/* Recharts Visual Progress Trends */}
          <div className="pt-1">
            <ProgressCharts latestLog={latestLog} allLogs={allLogs} />
          </div>
        </div>
      )}
    </div>
  );
}
