import mongoose, { Schema, Document, models, model } from 'mongoose'

export interface ITicketMessage extends Document {
  ticket: mongoose.Types.ObjectId
  sender: mongoose.Types.ObjectId
  content: string
  isInternal: boolean
  createdAt: Date
  updatedAt: Date
}

const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    ticket:     { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    sender:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content:    { type: String, required: true },
    isInternal: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const TicketMessage = models.TicketMessage || model<ITicketMessage>('TicketMessage', TicketMessageSchema)
