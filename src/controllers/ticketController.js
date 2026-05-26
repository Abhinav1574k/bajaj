const Ticket = require('../models/Ticket');
const { SLA_TARGETS } = require('../models/Ticket');

// @desc    Create a new ticket
// @route   POST /tickets
// @access  Public
const createTicket = async (req, res, next) => {
  try {
    const { subject, description, customerEmail, priority, status } = req.body;

    // Validate that we only set allowed fields during creation
    const ticket = new Ticket({
      subject,
      description,
      customerEmail,
      priority,
      status
    });

    const savedTicket = await ticket.save();

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: savedTicket
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tickets with optional filtering (status, priority, breached)
// @route   GET /tickets
// @access  Public
const getTickets = async (req, res, next) => {
  try {
    const { status, priority, breached } = req.query;
    const query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by priority
    if (priority) {
      query.priority = priority;
    }

    // Filter by breached (dynamic calculation)
    if (breached !== undefined) {
      const now = new Date();
      const orConditions = [];

      for (const [prio, limitMin] of Object.entries(SLA_TARGETS)) {
        const limitMs = limitMin * 60 * 1000;

        if (breached === 'true') {
          orConditions.push({
            priority: prio,
            $or: [
              // Case 1: Resolved/Closed tickets where (resolvedAt - createdAt) exceeded target
              {
                resolvedAt: { $exists: true, $ne: null },
                $expr: { $gt: [{ $subtract: ['$resolvedAt', '$createdAt'] }, limitMs] }
              },
              // Case 2: Unresolved tickets where current time exceeds target
              {
                resolvedAt: { $in: [null, undefined] },
                createdAt: { $lt: new Date(now.getTime() - limitMs) }
              }
            ]
          });
        } else if (breached === 'false') {
          orConditions.push({
            priority: prio,
            $or: [
              // Case 1: Resolved/Closed tickets resolved within target
              {
                resolvedAt: { $exists: true, $ne: null },
                $expr: { $lte: [{ $subtract: ['$resolvedAt', '$createdAt'] }, limitMs] }
              },
              // Case 2: Unresolved tickets not yet breached
              {
                resolvedAt: { $in: [null, undefined] },
                createdAt: { $gte: new Date(now.getTime() - limitMs) }
              }
            ]
          });
        }
      }

      if (orConditions.length > 0) {
        query.$or = orConditions;
      }
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing ticket (subject, description, customerEmail, priority, status)
// @route   PATCH /tickets/:id
// @access  Public
const updateTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // List of allowed fields to update
    const allowedUpdates = ['subject', 'description', 'customerEmail', 'priority', 'status'];

    // Apply updates
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        ticket[field] = req.body[field];
      }
    });

    // Save triggers the Mongoose pre-save transition/timestamp validation hooks
    const updatedTicket = await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket updated successfully',
      data: updatedTicket
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a ticket
// @route   DELETE /tickets/:id
// @access  Public
const deleteTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics
// @route   GET /tickets/stats
// @access  Public
const getTicketStats = async (req, res, next) => {
  try {
    const tickets = await Ticket.find();

    const totalTickets = tickets.length;
    const statusCounts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
    let breachedCount = 0;

    let totalOpenAge = 0;
    let openCount = 0;

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    tickets.forEach((t) => {
      // Increment status count
      if (statusCounts[t.status] !== undefined) {
        statusCounts[t.status]++;
      }

      // Increment priority count
      if (priorityCounts[t.priority] !== undefined) {
        priorityCounts[t.priority]++;
      }

      // Check SLA breach status
      if (t.slaBreached) {
        breachedCount++;
      }

      // Open/In-progress tickets: accumulate active age
      if (['open', 'in_progress'].includes(t.status)) {
        totalOpenAge += t.ageMinutes;
        openCount++;
      }

      // Resolved/Closed tickets: accumulate resolution time
      if (['resolved', 'closed'].includes(t.status) && t.resolvedAt) {
        const resolutionTimeMin = (t.resolvedAt - t.createdAt) / (1000 * 60);
        totalResolutionTime += resolutionTimeMin;
        resolvedCount++;
      }
    });

    const avgAgeOpenMinutes = openCount > 0 ? Math.round((totalOpenAge / openCount) * 100) / 100 : 0;
    const avgResolutionTimeMinutes = resolvedCount > 0 ? Math.round((totalResolutionTime / resolvedCount) * 100) / 100 : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalTickets,
        statusCounts,
        priorityCounts,
        breachedCount,
        avgAgeOpenMinutes,
        avgResolutionTimeMinutes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seed the database with dummy tickets for testing
// @route   POST /tickets/seed
// @access  Public
const seedTickets = async (req, res, next) => {
  try {
    const { clear } = req.query;

    if (clear === 'true') {
      await Ticket.deleteMany({});
    }

    const dummyTickets = [
      {
        subject: 'Printer jammed in HR department',
        description: 'The primary laser printer on the 3rd floor is showing error code E-102 and is completely jammed.',
        customerEmail: 'hr.manager@company.com',
        priority: 'low',
        status: 'open',
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
        resolvedAt: null
      },
      {
        subject: 'CRITICAL: Payment Gateway Outage',
        description: 'All transactions are failing with a 504 Gateway Timeout error. Immediate intervention needed.',
        customerEmail: 'finance.ops@company.com',
        priority: 'urgent',
        status: 'in_progress',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago (SLA: 1h -> Breached!)
        resolvedAt: null
      },
      {
        subject: 'VPN connection dropping intermittently',
        description: 'Remote staff reporting VPN disconnects every 15-20 minutes when working from home.',
        customerEmail: 'it.helpdesk@company.com',
        priority: 'high',
        status: 'resolved',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)  // resolved 2 hours ago (Duration: 3h, SLA: 4h -> Not Breached!)
      },
      {
        subject: 'Request to upgrade cloud hosting storage',
        description: 'Our AWS S3 media bucket is reaching 95% capacity. We need an upgrade to prevent upload failures.',
        customerEmail: 'devops@startup.io',
        priority: 'medium',
        status: 'resolved',
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
        resolvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)  // resolved 1 hour ago (Duration: 47h, SLA: 24h -> Breached!)
      },
      {
        subject: 'New employee onboarding equipment',
        description: 'Need to prepare a Macbook Pro and monitor setup for the new frontend developer joining next Monday.',
        customerEmail: 'recruiting@agency.com',
        priority: 'medium',
        status: 'open',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago (SLA: 24h -> Not Breached)
        resolvedAt: null
      }
    ];

    const seededTickets = await Ticket.insertMany(dummyTickets);

    res.status(201).json({
      success: true,
      message: `Successfully seeded ${seededTickets.length} dummy tickets!`,
      count: seededTickets.length,
      data: seededTickets
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getTickets,
  updateTicket,
  deleteTicket,
  getTicketStats,
  seedTickets
};
