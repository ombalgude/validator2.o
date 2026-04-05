const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const NotificationService = require('../services/notification_service');

const createIoStub = () => {
  const ioHandlers = {};
  const emits = [];
  const roomEmits = [];

  return {
    io: {
      on: (event, handler) => {
        ioHandlers[event] = handler;
      },
      emit: (event, payload) => {
        emits.push({ event, payload });
      },
      to: (room) => ({
        emit: (event, payload) => {
          roomEmits.push({ room, event, payload });
        },
      }),
    },
    ioHandlers,
    emits,
    roomEmits,
  };
};

describe('NotificationService', () => {
  test('initialize binds authentication and tracks connected clients', () => {
    const service = new NotificationService();
    const { io, ioHandlers } = createIoStub();
    const socketHandlers = {};
    const joinedRooms = [];

    service.initialize(io);

    ioHandlers.connection({
      id: 'socket-1',
      on: (event, handler) => {
        socketHandlers[event] = handler;
      },
      join: (room) => {
        joinedRooms.push(room);
      },
    });

    socketHandlers.authenticate({
      userId: 'user-1',
      role: 'institution_admin',
      institutionId: 'inst-1',
    });

    assert.equal(service.getConnectedClientsCount(), 1);
    assert.deepEqual(joinedRooms, ['user_user-1', 'institution_inst-1']);

    socketHandlers.disconnect();
    assert.equal(service.getConnectedClientsCount(), 0);
  });

  test('sendVerificationComplete emits global, user, institution, and admin notifications', async () => {
    const service = new NotificationService();
    const { io, emits, roomEmits } = createIoStub();

    service.initialize(io);

    await service.sendVerificationComplete('CERT-1', 'fake', {
      uploadedBy: 'user-1',
      institutionId: 'inst-1',
    });

    assert.equal(emits[0].event, 'verification_complete');
    assert.equal(emits[0].payload.certificateId, 'CERT-1');
    assert.equal(roomEmits.length, 3);
    assert.deepEqual(
      roomEmits.map((entry) => ({ room: entry.room, event: entry.event })),
      [
        { room: 'user_user-1', event: 'verification_complete' },
        { room: 'institution_inst-1', event: 'verification_complete' },
        { room: 'admin', event: 'alert' },
      ]
    );
  });
});
