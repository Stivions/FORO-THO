import mongoose, { Schema, Document, models, model } from 'mongoose'

export interface IReview extends Document {
  user: mongoose.Types.ObjectId
  rating: number
  title: string
  content: string
  verified: boolean
  createdAt: Date
  updatedAt: Date
}

const ReviewSchema = new Schema<IReview>(
  {
    user:     { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    rating:   { type: Number, required: true, min: 1, max: 5 },
    title:    { type: String, required: true },
    content:  { type: String, required: true, maxlength: 500 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
)

ReviewSchema.index({ user: 1 }, { unique: true })

export const Review = models.Review || model<IReview>('Review', ReviewSchema)
