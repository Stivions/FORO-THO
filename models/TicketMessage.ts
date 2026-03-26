import mongoose, { Schema, Document, models, model } from 'mongoose'

export interface ITicketAttachment {
  url: string
  name: string
  mimeType: string
}

export interface ITicketMessage extends Document {
  ticket: mongoose.Types.ObjectId
  sender: mongoose.Types.ObjectId
  content: string
  isInternal: boolean
  attachments: ITicketAttachment[]
  createdAt: Date
  updatedAt: Date
}

const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    ticket:     { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    sender:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content:    { type: String, default: '' },
    isInternal: { type: Boolean, default: false },
    attachments: [{
      url:      { type: String },
      name:     { type: String },
      mimeType: { type: String },
    }],
  },
  { timestamps: true }
)

export const TicketMessage = models.TicketMessage || model<ITicketMessage>('TicketMessage', TicketMessageSchema)
