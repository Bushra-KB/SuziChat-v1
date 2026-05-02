import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamesMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly latencySamplesMs: number[] = [];
  private readonly maxLatencySamples = 200;

  readonly counts = {
    sessionActionsOk: 0,
    sessionActionsFailed: 0,
    socketActionsRateLimited: 0,
    socketLobbyJoins: 0,
    socketSessionJoins: 0,
    socketLobbyJoinDenied: 0,
    socketSessionJoinDenied: 0,
  };

  recordSessionActionOk(latencyMs: number) {
    this.counts.sessionActionsOk += 1;
    this.latencySamplesMs.push(latencyMs);
    if (this.latencySamplesMs.length > this.maxLatencySamples) {
      this.latencySamplesMs.splice(
        0,
        this.latencySamplesMs.length - this.maxLatencySamples,
      );
    }
  }

  recordSessionActionFailed() {
    this.counts.sessionActionsFailed += 1;
  }

  recordSocketRateLimited() {
    this.counts.socketActionsRateLimited += 1;
  }

  recordSocketLobbyJoin() {
    this.counts.socketLobbyJoins += 1;
  }

  recordSocketSessionJoin() {
    this.counts.socketSessionJoins += 1;
  }

  recordSocketLobbyJoinDenied() {
    this.counts.socketLobbyJoinDenied += 1;
  }

  recordSocketSessionJoinDenied() {
    this.counts.socketSessionJoinDenied += 1;
  }

  /**
   * Operational snapshot for dashboards / alerting (protected HTTP endpoint).
   */
  async getOperationalSnapshot() {
    const prisma = this.prisma;
    const [activeLobbies, activeSessions] = await Promise.all([
      prisma.gameLobby.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      prisma.gameSession.count({
        where: { status: 'ACTIVE' },
      }),
    ]);
    const latencies = this.latencySamplesMs;
    const avg =
      latencies.length === 0
        ? 0
        : latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95 = sorted.length
      ? (sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1])
      : 0;

    return {
      generatedAt: new Date().toISOString(),
      activeLobbies,
      activeSessions,
      avgActionLatencyMs: Math.round(avg * 100) / 100,
      p95ActionLatencyMs: p95,
      ...this.counts,
    };
  }
}
