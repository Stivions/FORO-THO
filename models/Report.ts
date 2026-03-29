import { Schema, model, models } from 'mongoose'

export interface IReport {
  reporter: any
  targetType: 'user' | 'post' | 'comment'
  targetId: any
  reportedUser?: any
  reason: string
  details?: string
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
}

const ReportSchema = new Schema<IReport>(
  {
    reporter:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType:   { type: String, enum: ['user', 'post', 'comment'], required: true },
    targetId:     { type: Schema.Types.ObjectId, required: true },
    reportedUser: { type: Schema.Types.ObjectId, ref: 'User' },
    reason:       { type: String, required: true, maxlength: 80 },
    details:      { type: String, default: '', maxlength: 500 },
    status:       { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open' },
    adminNotes:   { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
)

ReportSchema.index({ status: 1, createdAt: -1 })
ReportSchema.index({ reporter: 1, createdAt: -1 })
ReportSchema.index({ targetType: 1, targetId: 1, createdAt: -1 })

if (process.env.NODE_ENV === 'development' && models.Report) {
  delete (models as any).Report
}

export const Report = models.Report || model<IReport>('Report', ReportSchema)
