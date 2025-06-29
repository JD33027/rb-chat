require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http'); // Import http module
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('./generated/prisma'); // Corrected import path for Prisma Client
const path = require('path');
const multer = require('multer');
const auth = require('./middleware/auth'); // Import the auth middleware
const { Server } = require('socket.io'); // Import Socket.IO Server
const twilio = require('twilio');
const { isValidPhoneNumber } = require('libphonenumber-js');

const app = express();
const prisma = new PrismaClient();
const httpServer = http.createServer(app); // Create HTTP server from Express app

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000", // Allow your deployed frontend
  optionsSuccessStatus: 200
};

const io = new Server(httpServer, { cors: corsOptions }); // Initialize Socket.IO with CORS

// Initialize Twilio Client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// In-memory store for OTPs. For production, use Redis or a database table.
const otpStore = {}; // { "fullPhoneNumber": { otp: "123456", expiry: 167... } }

// --- Middleware ---

// Middleware
app.use(cors(corsOptions)); // Allows cross-origin requests
app.use(express.json()); // Allows server to accept JSON in request body
app.use('/public', express.static(path.join(__dirname, 'public'))); // Serve static files

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
});

// Multer setup for media file uploads
const mediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/media/'); // New directory for media
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});
const uploadMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: 1024 * 1024 * 10 }, // 10MB file size limit for media
});

// --- Authentication Routes ---

// SEND OTP: /api/auth/send-otp
app.post('/api/auth/send-otp', async (req, res) => {
  const { countryCode, phoneNumber } = req.body;
  if (!countryCode || !phoneNumber) {
    return res.status(400).json({ error: 'Country code and phone number are required' });
  }

  const fullPhoneNumber = `${countryCode}${phoneNumber}`;

  // Validate the phone number format
  if (!isValidPhoneNumber(fullPhoneNumber)) {
    return res.status(400).json({ error: 'The provided phone number is not valid.' });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { countryCode_phoneNumber: { countryCode, phoneNumber } },
  });

  if (existingUser) {
    return res.status(409).json({ error: 'A user with this phone number already exists.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const expiry = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

  otpStore[fullPhoneNumber] = { otp, expiry };

  // --- DEVELOPMENT ONLY: Bypass Twilio and provide OTP in response ---
  console.log(`
    ===================================================
    OTP for ${fullPhoneNumber} is: ${otp}
    (This is for development only. Twilio is disabled.)
    ===================================================
  `);
  // In a real app, you would uncomment and use Twilio here.
  // try {
  //   await twilioClient.messages.create({ ... });
  //   res.status(200).json({ message: 'OTP sent successfully.' });
  // } catch (error) {
  //   console.error('Twilio Error:', error);
  //   res.status(500).json({ error: 'Failed to send OTP.' });
  // }
  res.status(200).json({ message: 'OTP sent successfully (dev mode).', devOtp: otp });
});

// SIGNUP: /api/signup
app.post('/api/signup', async (req, res) => {
  const { countryCode, phoneNumber, password, otp } = req.body;

  if (!countryCode || !phoneNumber || !password || !otp) {
    return res.status(400).json({ error: 'All fields, including OTP, are required.' });
  }

  const fullPhoneNumber = `${countryCode}${phoneNumber}`;
  const storedOtpData = otpStore[fullPhoneNumber];

  if (!storedOtpData) {
    return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
  }

  if (Date.now() > storedOtpData.expiry) {
    delete otpStore[fullPhoneNumber];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (storedOtpData.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP.' });
  }

  // OTP is valid, proceed with user creation
  try {
    delete otpStore[fullPhoneNumber]; // Clean up used OTP
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        countryCode,
        phoneNumber,
        password: hashedPassword,
      },
    });

    // Automatically log the user in by creating a token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(201).json({ message: 'User created successfully', token });
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('phoneNumber')) {
      return res.status(409).json({ error: 'A user with this phone number already exists.' });
    }
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'An error occurred during signup' });
  }
});

// LOGIN: /api/login
app.post('/api/login', async (req, res) => {
  const { countryCode, phoneNumber, password } = req.body;

  const fullPhoneNumber = `${countryCode}${phoneNumber}`;

  // It's good practice to validate on login as well
  if (!isValidPhoneNumber(fullPhoneNumber)) {
    return res.status(400).json({ error: 'The provided phone number is not valid.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { countryCode_phoneNumber: { countryCode, phoneNumber } },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1h', // Token expires in 1 hour
    });

    res.json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// --- Get Users Route ---

// GET USERS: GET /api/users
// This route requires authentication
app.get('/api/users', auth, async (req, res) => {
  try {
    // 1. Get all users except the current one
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.userId }, // Exclude the current user
      },
      select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true, lastSeen: true },
    });

    // 2. Get unread message counts for the current user from all other users
    const unreadCounts = await prisma.message.groupBy({
      by: ['senderId'],
      where: {
        recipientId: req.userId,
        status: { not: 'SEEN' },
      },
      _count: {
        id: true,
      },
    });

    // 3. Create a map for efficient lookup
    const unreadCountsMap = new Map(unreadCounts.map((item) => [item.senderId, item._count.id]));

    // 4. Get all messages involving the current user to find the last message for each conversation
    const allMessages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: req.userId }, { recipientId: req.userId }],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 5. Create a map of the last message for each conversation
    const lastMessageMap = new Map();
    for (const message of allMessages) {
      const otherUserId = message.senderId === req.userId ? message.recipientId : message.senderId;
      if (!lastMessageMap.has(otherUserId)) {
        lastMessageMap.set(otherUserId, message);
      }
    }

    // 6. Combine all data: user info, unread count, and last message
    const usersWithDetails = users.map((user) => ({
      ...user,
      unreadCount: unreadCountsMap.get(user.id) || 0,
      lastMessage: lastMessageMap.get(user.id) || null,
    }));

    // 7. Sort users by the timestamp of the last message
    usersWithDetails.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });

    res.json(usersWithDetails);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// --- Update Profile Route ---

// UPDATE PROFILE: PUT /api/profile
app.put('/api/profile', auth, async (req, res) => {
  const { username, profilePictureUrl } = req.body;

  const dataToUpdate = {};
  if (username) dataToUpdate.username = username;
  if (profilePictureUrl) dataToUpdate.profilePictureUrl = profilePictureUrl;

  if (Object.keys(dataToUpdate).length === 0) {
    return res.status(400).json({ error: 'No update data provided.' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: dataToUpdate,
      select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true },
    });
    res.json(updatedUser);
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return res.status(409).json({ error: 'This username is already taken.' });
    }
    console.error('Profile Update Error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// --- Get Current User Profile Route ---

// GET CURRENT USER PROFILE: GET /api/profile
app.get('/api/profile', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});
// --- File Upload Route ---
app.post('/api/upload', auth, upload.single('profilePicture'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a file.' });
  }
  // Return the path to the uploaded file, which the client can use
  const fileUrl = `/public/uploads/${req.file.filename}`;
  res.status(200).json({ profilePictureUrl: fileUrl });
});

// --- Media Upload Route ---
app.post('/api/upload/media', auth, uploadMedia.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a file.' });
  }
  // Return the path to the uploaded file
  const fileUrl = `/public/media/${req.file.filename}`;
  res.status(200).json({ mediaUrl: fileUrl });
});

// --- Contact Discovery Route ---

// FIND CONTACTS: POST /api/contacts/find
// This route requires authentication
app.post('/api/contacts/find', auth, async (req, res) => {
  const { phoneNumbers } = req.body; // Expects an array of phone numbers

  if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    return res.status(400).json({ error: 'An array of phone numbers is required' });
  }

  try {
    // Find users whose phone numbers are in the provided list
    const foundUsers = await prisma.user.findMany({
      where: {
        // Assuming phoneNumbers array now contains objects like { countryCode: "+1", phoneNumber: "5551234567" }
        OR: phoneNumbers.map(num => ({
          countryCode: num.countryCode,
          phoneNumber: num.phoneNumber,
        })),
        // Exclude the requesting user's own number
        NOT: {
          id: req.userId,
        },
      },
      select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true },
    });
    res.json(foundUsers);
  } catch (error) {
    console.error('Contact Discovery Error:', error);
    res.status(500).json({ error: 'An error occurred during contact discovery' });
  }
});

// --- WebSocket (Socket.IO) Setup ---

// Store active users and their socket IDs
const onlineUsers = {}; // { userId: socketId }

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // WebSocket Authentication
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId; // Attach userId to the socket object
      onlineUsers[socket.userId] = socket.id; // Add user to online users map
      console.log(`User ${socket.userId} authenticated and online.`);
      io.emit('user_online', socket.userId); // Notify all clients that a user is online
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
      socket.disconnect(true); // Disconnect unauthenticated socket
    }
  });

  // Handle message sending
  socket.on('sendMessage', async (data) => {
    // Ensure sender is authenticated via WebSocket
    if (!socket.userId) {
      console.warn('Unauthenticated socket tried to send message.');
      return;
    }

    const { recipientId, content, repliedToId, type = 'TEXT', caption } = data;
    const senderId = socket.userId;

    if (!recipientId || !content) {
      console.warn('Invalid message data received:', data);
      return;
    }

    try {
      const messageData = {
        content,
        type,
        caption,
        senderId,
        recipientId,
      };

      if (repliedToId) {
        messageData.repliedToId = repliedToId;
      }

      // 1. Persist message to database
      const newMessage = await prisma.message.create({
        data: messageData,
        include: {
          sender: { select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true } },
          recipient: { select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true } },
        },
      });

      // 2. Emit message to sender (for immediate display)
      socket.emit('messageSent', newMessage);

      // 3. Emit message to recipient if online
      const recipientSocketId = onlineUsers[recipientId];
      if (recipientSocketId) {
        // The message has been delivered
        const deliveredMessage = await prisma.message.update({
          where: { id: newMessage.id },
          data: { status: 'DELIVERED' },
          include: {
            sender: { select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true } },
            recipient: { select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true } },
            repliedTo: {
              include: {
                sender: { select: { id: true, username: true, countryCode: true, phoneNumber: true } },
              },
            },
          },
        });

        // Notify the recipient
        io.to(recipientSocketId).emit('receiveMessage', deliveredMessage);

        // Notify the original sender that the message was delivered
        socket.emit('messageStatusUpdated', {
          messageId: deliveredMessage.id,
          status: 'DELIVERED',
        });

        console.log(`Message sent from ${senderId} to online user ${recipientId}`);
      } else {
        console.log(`Message sent from ${senderId} to offline user ${recipientId}. Stored in DB.`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally, emit an error back to the sender
      socket.emit('messageError', { error: 'Failed to send message', originalMessage: data });
    }
  });

  // Handle marking messages as seen
  socket.on('markAsSeen', async ({ senderId }) => {
    if (!socket.userId) return;

    try {
      // Update all messages from the sender to the current user that are not 'SEEN'
      const { count } = await prisma.message.updateMany({
        where: {
          senderId: senderId,
          recipientId: socket.userId,
          status: { not: 'SEEN' },
        },
        data: { status: 'SEEN' },
      });

      if (count > 0) {
        // Notify the original sender that their messages have been seen
        const senderSocketId = onlineUsers[senderId];
        if (senderSocketId) {
          io.to(senderSocketId).emit('messagesSeen', {
            recipientId: socket.userId, // The user who saw the messages
          });
        }
        console.log(`User ${socket.userId} marked ${count} messages from ${senderId} as SEEN.`);
      }
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  });

  // Handle typing indicators
  socket.on('startTyping', ({ recipientId }) => {
    if (!socket.userId) return;
    const recipientSocketId = onlineUsers[recipientId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing', { senderId: socket.userId });
    }
  });

  socket.on('stopTyping', ({ recipientId }) => {
    if (!socket.userId) return;
    const recipientSocketId = onlineUsers[recipientId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('stopTyping', { senderId: socket.userId });
    }
  });

  // Handle deleting messages
  socket.on('deleteMessages', async ({ messageIds }) => {
    if (!socket.userId) return;

    try {
      // Ensure the user can only delete messages they sent
      const messages = await prisma.message.findMany({
        where: {
          id: { in: messageIds },
          senderId: socket.userId,
        },
      });

      if (messages.length !== messageIds.length) {
        // The user is trying to delete messages they don't own.
        // We could emit an error, but for now we'll just ignore the invalid ones.
        console.warn(`User ${socket.userId} attempted to delete messages they don't own.`);
        return;
      }

      await prisma.message.updateMany({
        where: { id: { in: messageIds } },
        data: { isDeleted: true, content: '' }, // Clear content for privacy
      });

      // Notify all relevant clients (sender and recipient)
      io.emit('messagesDeleted', { messageIds });
    } catch (error) {
      console.error('Error deleting messages:', error);
    }
  });

  // Handle forwarding messages
  socket.on('forwardMessages', async ({ messageIds, recipientIds }) => {
    if (!socket.userId || !messageIds || !recipientIds) return;

    try {
      const originalMessages = await prisma.message.findMany({
        where: { id: { in: messageIds } },
        orderBy: { createdAt: 'asc' }, // Forward in the order they were sent
      });

      for (const recipientId of recipientIds) {
        for (const originalMessage of originalMessages) {
          const newMessage = await prisma.message.create({
            data: {
              type: originalMessage.type,
              content: originalMessage.content,
              caption: originalMessage.caption,
              senderId: socket.userId,
              recipientId: recipientId,
              isForwarded: true,
            },
            include: {
              sender: { select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true } },
              recipient: { select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true } },
            },
          });

          // Notify sender that the forwarded message was sent
          socket.emit('messageSent', newMessage);

          // Notify recipient of the forwarded message
          const recipientSocketId = onlineUsers[recipientId];
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('receiveMessage', newMessage);
          }
        }
      }
    } catch (error) {
      console.error('Error forwarding messages:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    if (socket.userId && onlineUsers[socket.userId] === socket.id) {
      const userId = socket.userId;
      delete onlineUsers[userId];
      const lastSeenTime = new Date();
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { lastSeen: lastSeenTime },
        });
        // Notify all clients that a user is offline and provide their last seen time
        io.emit('user_offline', { userId, lastSeen: lastSeenTime });
        console.log(`User ${userId} disconnected. Last seen: ${lastSeenTime.toISOString()}`);
      } catch (error) {
        console.error(`Failed to update last seen for user ${userId}`, error);
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// --- Chat History Route ---

// GET MESSAGES: GET /api/messages/:recipientId
// This route requires authentication
app.get('/api/messages/:recipientId', auth, async (req, res) => {
  const currentUserId = req.userId;
  const otherUserId = req.params.recipientId;

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: currentUserId },
        ],
      },
      orderBy: {
        createdAt: 'asc', // Order messages chronologically
      },
      include: {
        sender: { select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true } },
        recipient: { select: { id: true, countryCode: true, phoneNumber: true, username: true, profilePictureUrl: true } },
        repliedTo: {
          include: {
            sender: { select: { id: true, username: true, countryCode: true, phoneNumber: true } },
          },
        },
      },
    });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => { // Listen on the HTTP server, not just the Express app
  console.log(`Server is running on port ${PORT}`);
});
