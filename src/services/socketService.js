const socketIO = require('socket.io');
const User = require('../models/User');
const Booking = require('../models/Booking');

// Store active connections
const activeConnections = new Map();

// Initialize Socket.IO
const initSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle driver authentication
    socket.on('authenticate', async ({ token, userId }) => {
      try {
        // In a real app, verify the token here
        const user = await User.findById(userId);
        if (!user) {
          throw new Error('User not found');
        }

        // Store the connection
        activeConnections.set(userId, {
          socketId: socket.id,
          userId,
          role: user.role,
          isOnline: true
        });

        // Join room for private messages
        socket.join(`user_${userId}`);
        
        // If driver, join driver-specific room
        if (user.role === 'driver') {
          socket.join('drivers');
          
          // Notify about driver going online
          io.emit('driverOnline', { 
            driverId: user._id,
            location: user.location,
            timestamp: new Date()
          });
        }

        console.log(`User ${user._id} authenticated`);
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authenticationError', { message: 'Authentication failed' });
      }
    });

    // Handle location updates from drivers
    socket.on('locationUpdate', async (data) => {
      try {
        const { driverId, location } = data;
        
        // Update driver's location in database
        await User.findByIdAndUpdate(driverId, {
          'location.coordinates': [location.lng, location.lat],
          'location.updatedAt': new Date()
        });

        // Broadcast to relevant users
        io.emit('driverLocationUpdated', {
          driverId,
          location,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }
    });

    // Handle booking status updates
    socket.on('bookingStatusUpdate', async (data) => {
      try {
        const { bookingId, status, driverId } = data;
        
        // Get booking details
        const booking = await Booking.findById(bookingId)
          .populate('user', 'socketId')
          .populate('driver', 'socketId');

        if (!booking) return;

        // Update booking status
        booking.status = status;
        await booking.save();

        // Notify user about booking status change
        if (booking.user?.socketId) {
          io.to(booking.user.socketId).emit('bookingStatusChanged', {
            bookingId,
            status,
            driverLocation: data.driverLocation
          });
        }
      } catch (error) {
        console.error('Error updating booking status:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      
      // Find and remove the disconnected user
      for (const [userId, conn] of activeConnections.entries()) {
        if (conn.socketId === socket.id) {
          activeConnections.delete(userId);
          
          // If it was a driver, notify about going offline
          if (conn.role === 'driver') {
            io.emit('driverOffline', { 
              driverId: userId,
              timestamp: new Date()
            });
          }
          break;
        }
      }
    });
  });

  return io;
};

// Helper function to get online drivers
const getOnlineDrivers = () => {
  return Array.from(activeConnections.values())
    .filter(conn => conn.role === 'driver' && conn.isOnline);
};

// Helper function to get user's socket connection
const getUserSocket = (userId) => {
  const connection = activeConnections.get(userId.toString());
  return connection ? connection.socketId : null;
};

module.exports = {
  initSocket,
  getOnlineDrivers,
  getUserSocket,
  activeConnections
};
