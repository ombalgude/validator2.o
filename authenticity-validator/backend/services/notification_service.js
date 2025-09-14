/**
 * Notification Service
 * Handles real-time notifications and alerts
 */

const io = require('socket.io');

class NotificationService {
    constructor() {
        this.io = null;
        this.connectedClients = new Map();
    }

    /**
     * Initialize notification service with Socket.IO instance
     * @param {Object} socketIO - Socket.IO instance
     */
    initialize(socketIO) {
        this.io = socketIO;
        this.setupEventHandlers();
    }

    /**
     * Setup Socket.IO event handlers
     */
    setupEventHandlers() {
        if (!this.io) return;

        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);

            // Handle user authentication
            socket.on('authenticate', (data) => {
                if (data.userId && data.role) {
                    this.connectedClients.set(socket.id, {
                        userId: data.userId,
                        role: data.role,
                        institutionId: data.institutionId
                    });
                    socket.join(`user_${data.userId}`);
                    if (data.role === 'institution' && data.institutionId) {
                        socket.join(`institution_${data.institutionId}`);
                    }
                    if (data.role === 'admin') {
                        socket.join('admin');
                    }
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
                this.connectedClients.delete(socket.id);
            });
        });
    }

    /**
     * Send verification complete notification
     * @param {string} certificateId - Certificate ID
     * @param {string} status - Verification status
     * @param {Object} options - Additional options
     */
    async sendVerificationComplete(certificateId, status, options = {}) {
        try {
            if (!this.io) return;

            const notification = {
                type: 'verification_complete',
                certificateId,
                status,
                timestamp: new Date(),
                message: this.getVerificationMessage(status),
                ...options
            };

            // Send to all connected clients
            this.io.emit('verification_complete', notification);

            // Send to specific user if certificate was uploaded by them
            if (options.uploadedBy) {
                this.io.to(`user_${options.uploadedBy}`).emit('verification_complete', notification);
            }

            // Send to admins for suspicious/fake certificates
            if (status === 'suspicious' || status === 'fake') {
                this.io.to('admin').emit('alert', {
                    type: 'suspicious_certificate',
                    certificateId,
                    status,
                    message: `Suspicious certificate detected: ${certificateId}`,
                    timestamp: new Date()
                });
            }

        } catch (error) {
            console.error('Error sending verification complete notification:', error);
        }
    }

    /**
     * Send status update notification
     * @param {string} certificateId - Certificate ID
     * @param {string} newStatus - New verification status
     * @param {Object} options - Additional options
     */
    async sendStatusUpdate(certificateId, newStatus, options = {}) {
        try {
            if (!this.io) return;

            const notification = {
                type: 'status_update',
                certificateId,
                newStatus,
                timestamp: new Date(),
                message: `Certificate ${certificateId} status updated to ${newStatus}`,
                ...options
            };

            // Send to all connected clients
            this.io.emit('status_update', notification);

            // Send to specific user if certificate was uploaded by them
            if (options.uploadedBy) {
                this.io.to(`user_${options.uploadedBy}`).emit('status_update', notification);
            }

        } catch (error) {
            console.error('Error sending status update notification:', error);
        }
    }

    /**
     * Send alert notification
     * @param {string} type - Alert type
     * @param {string} message - Alert message
     * @param {Object} data - Additional data
     */
    async sendAlert(type, message, data = {}) {
        try {
            if (!this.io) return;

            const alert = {
                type,
                message,
                timestamp: new Date(),
                data
            };

            // Send to admins
            this.io.to('admin').emit('alert', alert);

            // Send to specific users if specified
            if (data.userIds && Array.isArray(data.userIds)) {
                data.userIds.forEach(userId => {
                    this.io.to(`user_${userId}`).emit('alert', alert);
                });
            }

        } catch (error) {
            console.error('Error sending alert notification:', error);
        }
    }

    /**
     * Send dashboard update notification
     * @param {string} updateType - Type of update
     * @param {Object} data - Update data
     */
    async sendDashboardUpdate(updateType, data = {}) {
        try {
            if (!this.io) return;

            const update = {
                type: 'dashboard_update',
                updateType,
                data,
                timestamp: new Date()
            };

            // Send to all connected clients
            this.io.emit('dashboard_update', update);

        } catch (error) {
            console.error('Error sending dashboard update notification:', error);
        }
    }

    /**
     * Send institution-specific notification
     * @param {string} institutionId - Institution ID
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     */
    async sendInstitutionNotification(institutionId, type, data = {}) {
        try {
            if (!this.io) return;

            const notification = {
                type,
                institutionId,
                data,
                timestamp: new Date()
            };

            // Send to institution members
            this.io.to(`institution_${institutionId}`).emit('institution_notification', notification);

        } catch (error) {
            console.error('Error sending institution notification:', error);
        }
    }

    /**
     * Send user-specific notification
     * @param {string} userId - User ID
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     */
    async sendUserNotification(userId, type, data = {}) {
        try {
            if (!this.io) return;

            const notification = {
                type,
                data,
                timestamp: new Date()
            };

            // Send to specific user
            this.io.to(`user_${userId}`).emit('user_notification', notification);

        } catch (error) {
            console.error('Error sending user notification:', error);
        }
    }

    /**
     * Broadcast system-wide notification
     * @param {string} message - Notification message
     * @param {string} level - Notification level (info, warning, error)
     * @param {Object} data - Additional data
     */
    async broadcastNotification(message, level = 'info', data = {}) {
        try {
            if (!this.io) return;

            const notification = {
                type: 'system_notification',
                message,
                level,
                data,
                timestamp: new Date()
            };

            // Send to all connected clients
            this.io.emit('system_notification', notification);

        } catch (error) {
            console.error('Error broadcasting notification:', error);
        }
    }

    /**
     * Get verification message based on status
     * @param {string} status - Verification status
     * @returns {string} Message
     */
    getVerificationMessage(status) {
        const messages = {
            'verified': 'Certificate has been verified and is authentic',
            'suspicious': 'Certificate requires manual review due to suspicious characteristics',
            'fake': 'Certificate has been identified as fake or tampered',
            'pending': 'Certificate verification is in progress'
        };

        return messages[status] || 'Certificate verification status updated';
    }

    /**
     * Get connected clients count
     * @returns {number} Number of connected clients
     */
    getConnectedClientsCount() {
        return this.connectedClients.size;
    }

    /**
     * Get connected clients by role
     * @param {string} role - User role
     * @returns {Array} Array of client info
     */
    getConnectedClientsByRole(role) {
        const clients = [];
        this.connectedClients.forEach((client, socketId) => {
            if (client.role === role) {
                clients.push({
                    socketId,
                    userId: client.userId,
                    role: client.role,
                    institutionId: client.institutionId
                });
            }
        });
        return clients;
    }

    /**
     * Send bulk notification to multiple users
     * @param {Array} userIds - Array of user IDs
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     */
    async sendBulkNotification(userIds, type, data = {}) {
        try {
            if (!this.io) return;

            const notification = {
                type,
                data,
                timestamp: new Date()
            };

            // Send to each user
            userIds.forEach(userId => {
                this.io.to(`user_${userId}`).emit('bulk_notification', notification);
            });

        } catch (error) {
            console.error('Error sending bulk notification:', error);
        }
    }

    /**
     * Send real-time statistics update
     * @param {Object} stats - Statistics data
     */
    async sendStatsUpdate(stats) {
        try {
            if (!this.io) return;

            const update = {
                type: 'stats_update',
                stats,
                timestamp: new Date()
            };

            // Send to all connected clients
            this.io.emit('stats_update', update);

        } catch (error) {
            console.error('Error sending stats update:', error);
        }
    }
}

module.exports = NotificationService;

