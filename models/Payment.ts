import mongoose, { Schema, model, models } from 'mongoose'

export interface IPayment {
  _id: string
  user: mongoose.Types.ObjectId
  amount: number
  currency: string
  method: 'paypal' | 'btc' | 'eth' | 'usdt'
  status: 'pending' | 'completed' | 'failed'
  paypalOrderId: string
  cryptoTxHash: string
  cryptoCurrency: string
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    user:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount:          { type: Number, default: 8.00 },
    currency:        { type: String, default: 'USD' },
    method:          { type: String, enum: ['paypal', 'btc', 'eth', 'usdt'], required: true },
    status:          { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    paypalOrderId:   { type: String, default: '' },
    cryptoTxHash:    { type: String, default: '' },
    cryptoCurrency:  { type: String, default: '' },
  },
  { timestamps: true }
)

if (process.env.NODE_ENV === 'development' && models.Payment) delete (models as any).Payment
export const Payment = models.Payment || model<IPayment>('Payment', PaymentSchema)
