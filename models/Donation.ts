import mongoose, { Schema, Document, models, model } from 'mongoose'

export interface IDonation extends Document {
  user?: mongoose.Types.ObjectId
  displayName: string
  amount: number
  message: string
  paypalOrderId: string
  cryptoTxHash?: string
  cryptoCurrency?: string
  status: 'pending' | 'completed' | 'failed'
  createdAt: Date
  updatedAt: Date
}

const DonationSchema = new Schema<IDonation>(
  {
    user:           { type: Schema.Types.ObjectId, ref: 'User' },
    displayName:    { type: String, default: 'Anónimo' },
    amount:         { type: Number, required: true, min: 1 },
    message:        { type: String, default: '', maxlength: 200 },
    paypalOrderId:  { type: String, default: '' },
    cryptoTxHash:   { type: String },
    cryptoCurrency: { type: String },
    status:         { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  },
  { timestamps: true }
)

export const Donation = models.Donation || model<IDonation>('Donation', DonationSchema)
