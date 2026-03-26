import mongoose, { Schema, Document, models, model } from 'mongoose'

export interface ITicket extends Document {
  subject: string
  status: 'open' | 'in_progress' | 'closed'
  priority: 'low' | 'normal' | 'high'
  user: mongoose.Types.ObjectId
  assignedTo?: mongoose.Types.ObjectId
  adminNotes: string
  category: 'support' | 'billing' | 'report' | 'other'
  roomId: string
  createdAt: Date
  updatedAt: Date
}

const TicketSchema = new Schema<ITicket>(
  {
    subject:    { type: String, required: true },
    status:     { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open' },
    priority:   { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    user:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    adminNotes: { type: String, default: '' },
    category:   { type: String, enum: ['support', 'billing', 'report', 'other'], default: 'support' },
    roomId:     { type: String },
  },
  { timestamps: true }
)

export const Ticket = models.Ticket || model<ITicket>('Ticket', TicketSchema)
