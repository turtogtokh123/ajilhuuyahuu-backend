import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReview extends Document {
    rating: number;
    comment: string;
    createdAt: Date;
    companyId: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
}

interface IReviewModel extends Model<IReview> {
    getAverageRating(companyId: mongoose.Types.ObjectId): Promise<void>;
}

const ReviewSchema: Schema = new Schema({
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: [true, 'Please add a rating between 1 and 5']
    },
    comment: {
        type: String,
        required: [true, 'Please add a comment']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

// Prevent user from submitting more than one review per company
ReviewSchema.index({ companyId: 1, authorId: 1 }, { unique: true });

// Static method to get avg rating and save
ReviewSchema.statics.getAverageRating = async function (companyId: mongoose.Types.ObjectId) {
    const obj = await this.aggregate([
        {
            $match: { companyId: companyId }
        },
        {
            $group: {
                _id: '$companyId',
                averageRating: { $avg: '$rating' }
            }
        }
    ]);

    try {
        await mongoose.model('Company').findByIdAndUpdate(companyId, {
            averageRating: obj[0] ? obj[0].averageRating : undefined
        });
    } catch (err) {
        console.error(err);
    }
};

// Call getAverageRating after save
ReviewSchema.post<IReview>('save', function () {
    (this.constructor as IReviewModel).getAverageRating(this.companyId);
});

// Call getAverageRating before remove
ReviewSchema.pre('deleteOne', { document: true, query: false }, function () {
    (this.constructor as any).getAverageRating(this.companyId);
});

export default mongoose.model<IReview, IReviewModel>('Review', ReviewSchema);
