import { Schema, model, models } from 'mongoose'

export interface IProductRequest {
  user: any
  product: any
  ticket?: any
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'fulfilled'
  message: string
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
}

const ProductRequestSchema = new Schema<IProductRequest>(
  {
    user:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product:    { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    ticket:     { type: Schema.Types.ObjectId, ref: 'Ticket', default: null },
    status:     { type: String, enum: ['pending', 'reviewing', 'approved', 'rejected', 'fulfilled'], default: 'pending' },
    message:    { type: String, default: '', maxlength: 500 },
    adminNotes: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
)

ProductRequestSchema.index({ user: 1, createdAt: -1 })
ProductRequestSchema.index({ product: 1, createdAt: -1 })
ProductRequestSchema.index({ ticket: 1 })
ProductRequestSchema.index({ status: 1, createdAt: -1 })

if (process.env.NODE_ENV === 'development' && models.ProductRequest) {
  delete (models as any).ProductRequest
}

export const ProductRequest = models.ProductRequest || model<IProductRequest>('ProductRequest', ProductRequestSchema)
