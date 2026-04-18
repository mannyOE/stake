import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IMatchNews {
    _id: string;
    teamName: string;
    fixtureId?: number;
    content: string;
    source: string;
    url?: string;
    publishedAt: Date;
}

const matchNewsSchema = new mongoose.Schema<IMatchNews>(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        teamName: {
            type: String,
            required: true,
            index: true,
        },
        fixtureId: {
            type: Number,
            index: true,
        },
        content: {
            type: String,
            required: true,
        },
        source: {
            type: String,
            required: true,
        },
        url: {
            type: String,
        },
        publishedAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const MatchNews = mongoose.model<IMatchNews>('MatchNews', matchNewsSchema);

export default MatchNews;
