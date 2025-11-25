import mongoose, { Document, Schema } from 'mongoose';

export interface ICompany extends Document {
    name: string;
    description: string;
    industry: 'Technology' | 'Finance' | 'Healthcare' | 'Education' | 'Retail' | 'Other';
    location: string;
    averageRating?: number;
    createdAt: Date;
}

const CompanySchema: Schema = new Schema({
    name: {
        type: String,
        required: [true, 'Please add a company name'],
        unique: true,
        trim: true,
        maxlength: [50, 'Name can not be more than 50 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [500, 'Description can not be more than 500 characters']
    },
    industry: {
        type: String,
        required: [true, 'Please add an industry'],
        enum: [
            'Technology',
            'Finance',
            'Healthcare',
            'Education',
            'Retail',
            'Other'
        ]
    },
    location: {
        type: String,
        required: [true, 'Please add a location']
    },
    averageRating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating can not be more than 5']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Cascade delete reviews when a company is deleted
CompanySchema.pre('deleteOne', { document: true, query: false } as any, async function (this: any, next: any) {
    console.log(`Reviews being removed from company ${this._id}`);
    await mongoose.model('Review').deleteMany({ companyId: this._id });
    next();
});

// Reverse populate with virtuals
CompanySchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'companyId',
    justOne: false
});

export default mongoose.model<ICompany>('Company', CompanySchema);
