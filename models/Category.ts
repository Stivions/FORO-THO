import { Schema, model, models, type Document, type Types } from 'mongoose'

export interface ICategory extends Document {
  name: string
  slug: string
  icon: string
  description: string
  createdBy: Types.ObjectId
  createdAt: Date
}

const CategorySchema = new Schema<ICategory>(
  {
    name:        { type: String, required: true, unique: true, trim: true, maxlength: 50 },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    icon:        { type: String, default: 'MessageSquare' },
    description: { type: String, default: '', maxlength: 200 },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

if (process.env.NODE_ENV === 'development' && models.Category) {
  delete (models as any).Category
}

export const Category = models.Category || model<ICategory>('Category', CategorySchema)
