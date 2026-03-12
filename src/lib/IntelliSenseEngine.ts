/**
 * IntelliSenseEngine — motor de scoring puro (sin I/O, sin React).
 * Recibe eventos cargados desde la DB y calcula sugerencias ordenadas por puntaje.
 */
import type {
    IntelliSenseEvent,
    AppPattern,
    SuggestionItem,
    AppOpenPayload,
    PatientViewedPayload,
} from '@/types/intellisense';

// ─── Pattern computation ──────────────────────────────────────────────────────

export function buildPatterns(events: IntelliSenseEvent[]): AppPattern[] {
    const patternsMap = new Map<string, AppPattern>();

    // Process events in chronological order (oldest first)
    const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));

    for (let i = 0; i < sorted.length; i++) {
        const ev = sorted[i];
        if (ev.event_type !== 'app:open') continue;

        let payload: AppOpenPayload | null = null;
        try {
            payload = ev.payload ? JSON.parse(ev.payload) : null;
        } catch {
            continue;
        }

        if (!payload?.appId) continue;
        const { appId } = payload;

        if (!patternsMap.has(appId)) {
            patternsMap.set(appId, {
                appId,
                totalOpens: 0,
                lastOpenedAt: null,
                hourHistogram: new Array(24).fill(0),
                dayHistogram: new Array(7).fill(0),
                prevAppCounts: {},
            });
        }

        const p = patternsMap.get(appId)!;
        p.totalOpens += 1;
        p.hourHistogram[ev.hour] += 1;
        p.dayHistogram[ev.day_of_week] += 1;
        if (!p.lastOpenedAt || ev.created_at > p.lastOpenedAt) {
            p.lastOpenedAt = ev.created_at;
        }

        // Sequence: find the previous app:open event to record transition
        for (let j = i - 1; j >= 0; j--) {
            const prev = sorted[j];
            if (prev.event_type !== 'app:open') continue;
            let prevPayload: AppOpenPayload | null = null;
            try {
                prevPayload = prev.payload ? JSON.parse(prev.payload) : null;
            } catch {
                break;
            }
            if (prevPayload?.appId && prevPayload.appId !== appId) {
                p.prevAppCounts[prevPayload.appId] = (p.prevAppCounts[prevPayload.appId] ?? 0) + 1;
            }
            break;
        }
    }

    return Array.from(patternsMap.values());
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeBucket(hour: number): TimeBucket {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
}

function getBucketHours(bucket: TimeBucket): number[] {
    switch (bucket) {
        case 'morning': return [6, 7, 8, 9, 10, 11];
        case 'afternoon': return [12, 13, 14, 15, 16, 17];
        case 'evening': return [18, 19, 20, 21];
        case 'night': return [22, 23, 0, 1, 2, 3, 4, 5];
    }
}

function timeMatchScore(pattern: AppPattern, now: Date): number {
    const currentHour = now.getHours();
    const bucket = getTimeBucket(currentHour);
    const bucketHours = getBucketHours(bucket);
    const bucketCount = bucketHours.reduce((sum, h) => sum + pattern.hourHistogram[h], 0);
    const totalCount = pattern.totalOpens;
    if (totalCount === 0) return 0;
    return bucketCount / totalCount; // 0..1
}

function recencyScore(pattern: AppPattern, now: Date): number {
    if (!pattern.lastOpenedAt) return 0;
    const msAgo = now.getTime() - new Date(pattern.lastOpenedAt).getTime();
    const daysAgo = msAgo / (1000 * 60 * 60 * 24);
    // Decay: 1 at 0 days, ~0.35 at 7 days, ~0.13 at 14 days
    return Math.exp(-0.15 * daysAgo);
}

// ─── Suggestion computation ───────────────────────────────────────────────────

export interface ComputeOptions {
    /** ID of the currently focused app, for sequence suggestions */
    currentAppId?: string;
    now?: Date;
    /** Max suggestions to return */
    limit?: number;
    /** App IDs to exclude (already open, etc.) */
    excludeAppIds?: string[];
}

export function computeSuggestions(
    patterns: AppPattern[],
    options: ComputeOptions = {},
): SuggestionItem[] {
    const { currentAppId, now = new Date(), limit = 8, excludeAppIds = [] } = options;

    // Max frequency for normalization
    const maxOpens = Math.max(...patterns.map(p => p.totalOpens), 1);

    const scored: (SuggestionItem & { _rawScore: number; _timeScore: number; _seqScore: number })[] = [];

    for (const p of patterns) {
        if (excludeAppIds.includes(p.appId)) continue;

        const freqScore = p.totalOpens / maxOpens;               // 0..1
        const timeSc = timeMatchScore(p, now);                  // 0..1
        const recSc = recencyScore(p, now);                    // 0..1
        const seqSc = currentAppId
            ? (p.prevAppCounts[currentAppId] ?? 0) / Math.max(p.totalOpens, 1)
            : 0;

        const totalScore =
            0.4 * freqScore +
            0.3 * timeSc +
            0.2 * recSc +
            0.1 * seqSc;

        // Determine primary reason
        let reason: SuggestionItem['reason'] = 'frequent';
        const scores = { freqScore, timeSc, seqSc, recSc };
        const maxKey = (Object.keys(scores) as (keyof typeof scores)[]).reduce(
            (a, b) => scores[a] >= scores[b] ? a : b,
        );
        if (maxKey === 'timeSc') reason = 'time_based';
        else if (maxKey === 'seqSc' && seqSc > 0.05) reason = 'sequence';
        else reason = 'frequent';

        scored.push({
            id: `app-${p.appId}`,
            type: 'app',
            targetId: p.appId,
            label: p.appId, // caller enriches with real app name
            score: totalScore,
            reason,
            _rawScore: freqScore,
            _timeScore: timeSc,
            _seqScore: seqSc,
        });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ _rawScore: _, _timeScore: __, _seqScore: ___, ...s }) => s);
}

// ─── Recent patients ──────────────────────────────────────────────────────────

export function getRecentPatientIds(events: IntelliSenseEvent[], limit = 5): number[] {
    const seen = new Set<number>();
    const result: number[] = [];

    // Events already sorted DESC from DB (newest first)
    for (const ev of events) {
        if (ev.event_type !== 'patient:viewed') continue;
        let payload: PatientViewedPayload | null = null;
        try {
            payload = ev.payload ? JSON.parse(ev.payload) : null;
        } catch {
            continue;
        }
        if (payload?.patientId && !seen.has(payload.patientId)) {
            seen.add(payload.patientId);
            result.push(payload.patientId);
            if (result.length >= limit) break;
        }
    }

    return result;
}

// ─── Daily briefing ───────────────────────────────────────────────────────────

const BRIEFING_KEY_PREFIX = 'galeno_ils_briefing_';

export function shouldShowBriefing(userId: string): boolean {
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem(`${BRIEFING_KEY_PREFIX}${userId}`);
    return stored !== today;
}

export function markBriefingShown(userId: string): void {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`${BRIEFING_KEY_PREFIX}${userId}`, today);
}
