import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IPredictionLeg {
    fixture: string;
    market: string;
    outcomeId: string;
    odds: number;
}

export interface IPrediction {
    _id: string;
    fixtureId?: number; // From API-Football
    stakeEventId?: string; // From Stake
    type: 'cumulated' | 'optimal';
    legs: IPredictionLeg[];
    totalOdds: number;
    estimatedProbability: string;
    reasoning: string;
    status: 'pending' | 'won' | 'lost' | 'canceled';
    actualResult?: any;
    prompt?: string;
    rawAIResponse?: string;
    predictedAt: Date;
    resolvedAt?: Date;
}

const predictionSchema = new mongoose.Schema<IPrediction>(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        fixtureId: {
            type: Number,
            index: true,
        },
        stakeEventId: {
            type: String,
            index: true,
        },
        type: {
            type: String,
            enum: ['cumulated', 'optimal'],
            required: true,
        },
        legs: [
            {
                fixture: String,
                market: String,
                outcomeId: String,
                odds: Number,
            },
        ],
        totalOdds: {
            type: Number,
            required: true,
        },
        estimatedProbability: {
            type: String,
        },
        reasoning: {
            type: String,
        },
        status: {
            type: String,
            enum: ['pending', 'won', 'lost', 'canceled'],
            default: 'pending',
            index: true,
        },
        actualResult: {
            type: mongoose.Schema.Types.Mixed,
        },
        prompt: {
            type: String,
        },
        rawAIResponse: {
            type: String,
        },
        predictedAt: {
            type: Date,
            default: Date.now,
        },
        resolvedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

const Prediction = mongoose.model<IPrediction>('Prediction', predictionSchema);

export default Prediction;
