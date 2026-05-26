const mongoose = require('mongoose');

const STATUS_ORDER = ['open', 'in_progress', 'resolved', 'closed'];
const SLA_TARGETS = {
  urgent: 60,     // 1 hour in minutes
  high: 240,     // 4 hours in minutes
  medium: 1440,  // 24 hours in minutes
  low: 4320      // 72 hours in minutes
};

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const ticketSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    customerEmail: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
      match: [emailRegex, 'Please provide a valid email address']
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: '{VALUE} is not a valid priority. Choose from: low, medium, high, urgent'
      },
      default: 'low'
    },
    status: {
      type: String,
      enum: {
        values: STATUS_ORDER,
        message: '{VALUE} is not a valid status. Choose from: open, in_progress, resolved, closed'
      },
      default: 'open'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: {
      type: Date
    }
  },
  {
    timestamps: false, // We use custom createdAt and resolvedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Helper function to validate status transition (strictly step-by-step, no skipping)
function isValidTransition(oldStatus, newStatus) {
  if (oldStatus === newStatus) return true;

  const oldIdx = STATUS_ORDER.indexOf(oldStatus);
  const newIdx = STATUS_ORDER.indexOf(newStatus);

  if (oldIdx === -1 || newIdx === -1) return false;

  // Transitions must be adjacent (exactly 1 step forward or 1 step backward)
  return Math.abs(newIdx - oldIdx) === 1;
}

// Store original status on document initialization (for checking status changes in pre-save)
ticketSchema.post('init', function (doc) {
  doc._originalStatus = doc.status;
});

// Pre-save middleware to validate transitions and manage resolvedAt
ticketSchema.pre('save', function () {
  const oldStatus = this._originalStatus || 'open';
  const newStatus = this.status;

  // If status is modified, validate the transition
  if (this.isModified('status')) {
    if (!this.isNew && !isValidTransition(oldStatus, newStatus)) {
      const err = new Error(
        `Invalid status transition from '${oldStatus}' to '${newStatus}'. Allowed path: open -> in_progress -> resolved -> closed (backward only one step).`
      );
      err.status = 400; // Custom property to catch in Express error handler
      throw err;
    }

    // Set or clear resolvedAt based on the transition
    if (['resolved', 'closed'].includes(newStatus)) {
      // Set resolvedAt only if it wasn't already set
      if (!this.resolvedAt) {
        this.resolvedAt = new Date();
      }
    } else {
      // Moving back to open or in_progress: clear resolvedAt
      if (['resolved', 'closed'].includes(oldStatus)) {
        this.resolvedAt = null;
      }
    }
  }
});

// Dynamic Virtual field: ageMinutes
ticketSchema.virtual('ageMinutes').get(function () {
  const endTime = this.resolvedAt || new Date();
  const diffMs = endTime - this.createdAt;
  return Math.max(0, Math.round((diffMs / (1000 * 60)) * 100) / 100); // age in minutes, rounded to 2 decimals
});

// Dynamic Virtual field: slaBreached
ticketSchema.virtual('slaBreached').get(function () {
  const targetMinutes = SLA_TARGETS[this.priority] || 4320;
  return this.ageMinutes > targetMinutes;
});

module.exports = mongoose.model('Ticket', ticketSchema);
module.exports.SLA_TARGETS = SLA_TARGETS;
module.exports.STATUS_ORDER = STATUS_ORDER;
