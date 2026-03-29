import mongoose, { Schema, Document, models, model } from 'mongoose'

export interface IProduct extends Document {
  title: string
  description: string
  mediaUrl: string
  mimeType: string
  thumbnailUrl?: string
  featured: boolean
  uploadedBy: mongoose.Types.ObjectId
  likers: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    title:        { type: String, required: true, trim: true, maxlength: 80 },
    description:  { type: String, default: '', maxlength: 300 },
    mediaUrl:     { type: String, required: true },
    mimeType:     { type: String, default: 'image/jpeg' },
    thumbnailUrl: { type: String, default: '' },
    featured:     { type: Boolean, default: false },
    uploadedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    likers:       [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

ProductSchema.index({ createdAt: -1 })
ProductSchema.index({ featured: -1, createdAt: -1 })

export const Product = models.Product || model<IProduct>('Product', ProductSchema)
