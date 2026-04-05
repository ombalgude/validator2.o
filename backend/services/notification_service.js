/**
 * Notification Service
 * Handles real-time notifications and alerts
 */

class NotificationService {
  constructor() {
    this.io = null;
    this.boundIo = null;
    this.connectedClients = new Map();
  }

  initialize(socketIO) {
    if (!socketIO) {
      return this;
    }

    this.io = socketIO;

    if (this.boundIo !== socketIO) {
      this.boundIo = socketIO;
      this.setupEventHandlers(socketIO);
    }

    return this;
  }

  setupEventHandlers(socketIO = this.io) {
    if (!socketIO) {
      return;
    }

    socketIO.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('authenticate', (data = {}) => {
        if (!data.userId || !data.role) {
          return;
        }

        const client = {
          userId: data.userId,
          role: data.role,
          institutionId: data.institutionId || null,
        };

        this.connectedClients.set(socket.id, client);
        socket.join(`user_${data.userId}`);

        if (client.institutionId) {
          socket.join(`institution_${client.institutionId}`);
        }

        if (client.role === 'admin') {
          socket.join('admin');
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  async sendVerificationComplete(certificateId, status, options = {}) {
    try {
      if (!this.io) {
        return;
      }

      const notification = {
        type: 'verification_complete',
        certificateId,
        status,
        timestamp: new Date(),
        message: this.getVerificationMessage(status),
        ...options,
      };

      this.io.emit('verification_complete', notification);

      if (options.uploadedBy) {
        this.io.to(`user_${options.uploadedBy}`).emit('verification_complete', notification);
      }

      if (options.institutionId) {
        this.io.to(`institution_${options.institutionId}`).emit('verification_complete', notification);
      }

      if (status === 'suspicious' || status === 'fake') {
        this.io.to('admin').emit('alert', {
          type: 'suspicious_certificate',
          certificateId,
          status,
          message: `Suspicious certificate detected: ${certificateId}`,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Error sending verification complete notification:', error);
    }
  }

  async sendStatusUpdate(certificateId, newStatus, options = {}) {
    try {
      if (!this.io) {
        return;
      }

      const notification = {
        type: 'status_update',
        certificateId,
        newStatus,
        timestamp: new Date(),
        message: `Certificate ${certificateId} status updated to ${newStatus}`,
        ...options,
      };

      this.io.emit('status_update', notification);

      if (options.uploadedBy) {
        this.io.to(`user_${options.uploadedBy}`).emit('status_update', notification);
      }

      if (options.institutionId) {
        this.io.to(`institution_${options.institutionId}`).emit('status_update', notification);
      }
    } catch (error) {
      console.error('Error sending status update notification:', error);
    }
  }

  async sendAlert(type, message, data = {}) {
    try {
      if (!this.io) {
        return;
      }

      const alert = {
        type,
        message,
        timestamp: new Date(),
        data,
      };

      this.io.to('admin').emit('alert', alert);

      if (Array.isArray(data.userIds)) {
        data.userIds.forEach((userId) => {
          this.io.to(`user_${userId}`).emit('alert', alert);
        });
      }
    } catch (error) {
      console.error('Error sending alert notification:', error);
    }
  }

  async sendDashboardUpdate(updateType, data = {}) {
    try {
      if (!this.io) {
        return;
      }

      this.io.emit('dashboard_update', {
        type: 'dashboard_update',
        updateType,
        data,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error sending dashboard update notification:', error);
    }
  }

  async sendInstitutionNotification(institutionId, type, data = {}) {
    try {
      if (!this.io) {
        return;
      }

      this.io.to(`institution_${institutionId}`).emit('institution_notification', {
        type,
        institutionId,
        data,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error sending institution notification:', error);
    }
  }

  async sendUserNotification(userId, type, data = {}) {
    try {
      if (!this.io) {
        return;
      }

      this.io.to(`user_${userId}`).emit('user_notification', {
        type,
        data,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error sending user notification:', error);
    }
  }

  async broadcastNotification(message, level = 'info', data = {}) {
    try {
      if (!this.io) {
        return;
      }

      this.io.emit('system_notification', {
        type: 'system_notification',
        message,
        level,
        data,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error broadcasting notification:', error);
    }
  }

  getVerificationMessage(status) {
    const messages = {
      verified: 'Certificate has been verified and is authentic',
      suspicious: 'Certificate requires manual review due to suspicious characteristics',
      fake: 'Certificate has been identified as fake or tampered',
      pending: 'Certificate verification is in progress',
    };

    return messages[status] || 'Certificate verification status updated';
  }

  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  getConnectedClientsByRole(role) {
    const clients = [];

    this.connectedClients.forEach((client, socketId) => {
      if (client.role === role) {
        clients.push({
          socketId,
          userId: client.userId,
          role: client.role,
          institutionId: client.institutionId,
        });
      }
    });

    return clients;
  }

  async sendBulkNotification(userIds, type, data = {}) {
    try {
      if (!this.io) {
        return;
      }

      const notification = {
        type,
        data,
        timestamp: new Date(),
      };

      userIds.forEach((userId) => {
        this.io.to(`user_${userId}`).emit('bulk_notification', notification);
      });
    } catch (error) {
      console.error('Error sending bulk notification:', error);
    }
  }

  async sendStatsUpdate(stats) {
    try {
      if (!this.io) {
        return;
      }

      this.io.emit('stats_update', {
        type: 'stats_update',
        stats,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error sending stats update:', error);
    }
  }
}

module.exports = NotificationService;
