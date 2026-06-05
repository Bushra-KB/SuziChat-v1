import { CallContext, CallMedia, CallStatus, MessageKind } from '@prisma/client';
import { CallService } from './call.service';

describe('CallService', () => {
  function makeService() {
    const prisma = {
      callSession: {
        create: jest.fn().mockResolvedValue({ id: 'call-1' }),
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({
          startedAt: new Date('2026-06-02T10:00:00.000Z'),
          endedAt: new Date('2026-06-02T10:00:42.000Z'),
        }),
      },
      directMessage: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'message-1',
            kind: data.kind,
            body: data.body,
            createdAt: new Date('2026-06-02T10:00:00.000Z'),
            attachments: [],
            sender: {
              id: data.senderId,
              username: 'caller',
              displayName: 'Caller',
              avatarUrl: null,
              country: null,
            },
            recipient: { id: data.recipientId },
          }),
        ),
      },
      datingMessage: { create: jest.fn() },
      datingMatch: { findUnique: jest.fn() },
      room: { findUnique: jest.fn() },
      roomMessage: { create: jest.fn() },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new CallService(
      prisma as never,
      { getPeer: jest.fn() } as never,
      { assertMatchParticipant: jest.fn() } as never,
      { getRoomAccess: jest.fn() } as never,
    );
    return { service, prisma };
  }

  it('tracks ringing users as busy until the call ends', async () => {
    const { service } = makeService();

    const call = await service.createDirectCall(
      CallContext.DM,
      'callee:caller',
      'caller',
      'callee',
      CallMedia.AUDIO,
    );

    expect(service.isUserBusy('caller')).toBe(true);
    expect(service.isUserBusy('callee')).toBe(true);

    await service.endCall(call.id, CallStatus.CANCELED);

    expect(service.isUserBusy('caller')).toBe(false);
    expect(service.isUserBusy('callee')).toBe(false);
  });

  it('creates unavailable call events as CALL messages', async () => {
    const { service, prisma } = makeService();
    const call = await service.createDirectCall(
      CallContext.DM,
      'callee:caller',
      'caller',
      'callee',
      CallMedia.VIDEO,
    );

    const event = await service.createCallEventMessage(
      call,
      CallStatus.UNAVAILABLE,
      'caller',
    );

    expect(prisma.directMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderId: 'caller',
          recipientId: 'callee',
          kind: MessageKind.CALL,
          body: 'Video call unavailable',
        }),
      }),
    );
    expect(event).toEqual(
      expect.objectContaining({
        context: CallContext.DM,
        message: expect.objectContaining({ body: 'Video call unavailable' }),
      }),
    );
  });
});
