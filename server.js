// Import necessary packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const { SmartAPI } = require('smartapi-javascript');
const { MongoClient, ServerApiVersion } = require('mongodb');

// Create an Express application
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoUri = 'mongodb+srv://Naresh:Nareshdon_7@pnn-algo-database.fee3x.mongodb.net/?retryWrites=true&w=majority&appName=pnn-algo-database';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// MongoDB User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    userCode: { type: String, unique: true },
    api_key: { type: String },
    client_code: { type: String },
    totp: { type: String },
    trading_password: { type: String }
});

// MongoDB User Model
const User = mongoose.model('User', userSchema);

// Services and Logic (Advanced Market Analyzer, Risk Manager, etc.)
class AdvancedMarketAnalyzer {
    constructor() {
        this.historicalData = [];
    }

    async analyzeAdvancedMarketCondition(liveData) {
        return {
            ...liveData,
            atr: this.calculateATR(),
            macdData: this.calculateMACD(),
            bollingerBands: this.calculateBollingerBands(),
            pivotPoints: this.calculatePivotPoints(liveData),
            marketBreadth: await this.getMarketBreadth()
        };
    }

    calculateATR() {
        const periods = 14;
        const trueRanges = this.historicalData.slice(1).map((data, i) => {
            const prev = this.historicalData[i];
            const tr = Math.max(
                data.highPrice - data.lowPrice,
                Math.abs(data.highPrice - prev.ltp),
                Math.abs(data.lowPrice - prev.ltp)
            );
            return tr;
        });

        return this.calculateEMA(trueRanges, periods);
    }

    calculateMACD() {
        const fastPeriod = 12;
        const slowPeriod = 26;
        const signalPeriod = 9;
        const prices = this.historicalData.map(d => d.ltp);

        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        const macd = fastEMA - slowEMA;
        const signal = this.calculateEMA([macd], signalPeriod);
        return {
            macd,
            signal,
            histogram: macd - signal
        };
    }

    calculateBollingerBands() {
        const period = 20;
        const stdDev = 2;
        const prices = this.historicalData.map(d => d.ltp);
        const sma = this.calculateSMA(prices, period);
        const standardDeviation = this.calculateStandardDeviation(prices, period);

        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    calculatePivotPoints(previousDay) {
        const { highPrice: H, lowPrice: L, ltp: C } = previousDay;
        const PP = (H + L + C) / 3;
        return {
            r3: H + 2 * (PP - L),
            r2: PP + (H - L),
            r1: (2 * PP) - L,
            pivot: PP,
            s1: (2 * PP) - H,
            s2: PP - (H - L),
            s3: L - 2 * (H - PP)
        };
    }

    async getMarketBreadth() {
        // Implement market breadth calculations using API data
        return {
            advanceDeclineRatio: 0,
            vixValue: 0,
            putCallRatio: 0
        };
    }

    // Helper methods for indicators (SMA, EMA, etc.)
    calculateSMA(data, period) {
        return data.slice(-period).reduce((a, b) => a + b, 0) / period;
    }

    calculateEMA(data, period) {
        const k = 2 / (period + 1);
        return data.reduce((acc, val) => acc + (val - acc) * k, data[0]);
    }

    calculateStandardDeviation(data, period) {
        const mean = this.calculateSMA(data, period);
        const variance = data.slice(-period).reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
        return Math.sqrt(variance);
    }
}

class RiskManager {
    constructor({ smartApi, notificationService }) {
        this.smartApi = smartApi;
        this.notificationService = notificationService;
        this.MAX_POSITION_SIZE = 0.02; // 2% of portfolio per position
        this.MAX_DAILY_LOSS = 0.05;    // 5% max daily loss
        this.MAX_DRAWDOWN = 0.10;      // 10% max drawdown
        this.MARGIN_THRESHOLD = 0.7;   // 70% margin utilization threshold
        this.RISK_FREE_RATE = 0.05;    // 5% annual risk-free rate
    }

    async evaluateRisk() {
        const positions = await this.smartApi.getPosition();
        const metrics = await this.calculateRiskMetrics(positions);

        // Check risk thresholds and take action if necessary
        await this.enforceRiskLimits(metrics);
        return metrics;
    }

    async calculateRiskMetrics(positions) {
        const portfolioValue = await this.calculatePortfolioValue(positions);
        const returns = await this.calculateReturns();

        return {
            portfolioValue,
            openPositions: positions.length,
            marginUtilization: await this.calculateMarginUtilization(),
            dailyPnL: await this.calculateDailyPnL(),
            maxDrawdown: this.calculateMaxDrawdown(returns),
            sharpeRatio: this.calculateSharpeRatio(returns),
            currentRisk: this.determineRiskLevel(),
            stopLossHit: false
        };
    }

    async enforceRiskLimits(metrics) {
        if (metrics.dailyPnL <= -this.MAX_DAILY_LOSS * metrics.portfolioValue) {
            await this.liquidateAllPositions('Daily loss limit reached');
        }

        if (metrics.maxDrawdown >= this.MAX_DRAWDOWN) {
            await this.liquidateAllPositions('Maximum drawdown reached');
        }

        if (metrics.marginUtilization >= this.MARGIN_THRESHOLD) {
            await this.reducePositions('High margin utilization');
        }
    }

    async liquidateAllPositions(reason) {
        const positions = await this.smartApi.getPosition();

        for (const position of positions) {
            await this.smartApi.placeOrder({
                variety: 'NORMAL',
                tradingsymbol: position.tradingsymbol,
                symboltoken: position.symboltoken,
                transactiontype: position.quantity > 0 ? 'SELL' : 'BUY',
                exchange: position.exchange,
                ordertype: 'MARKET',
                producttype: position.producttype,
                quantity: Math.abs(position.quantity)
            });
        }

        await this.notificationService.sendAlert({
            type: 'RISK_ALERT',
            severity: 'HIGH',
            message: `All positions liquidated: ${reason}`
        });
    }
}

// Notification Service for Alerts
class NotificationService {
    constructor(config) {
        this.webhookUrl = config.webhookUrl;
        this.emailConfig = config.emailConfig;
    }

    async sendAlert(alert) {
        alert.timestamp = new Date();

        await Promise.all([
            this.sendToWebhook(alert),
            this.sendEmail(alert),
            this.updateDashboard(alert)
        ]);
    }

    async sendToWebhook(alert) {
        try {
            await axios.post(this.webhookUrl, alert);
        } catch (error) {
            console.error('Failed to send webhook alert:', error);
        }
    }

    async sendEmail(alert) {
        if (alert.severity === 'HIGH') {
            // Implement email sending logic
        }
    }

    async updateDashboard(alert) {
        // Implement dashboard update logic
    }
}

// Monitoring Service to detect anomalies
class MonitoringService {
    constructor(notificationService) {
        this.metrics = new Map();
        this.MAX_METRICS_LENGTH = 1000;
        this.notificationService = notificationService;
    }

    async recordMetrics(data) {
        for (const [key, value] of Object.entries(data)) {
            if (!this.metrics.has(key)) {
                this.metrics.set(key, []);
            }

            const metricArray = this.metrics.get(key);
            metricArray.push({ value, timestamp: new Date() });

            if (metricArray.length > this.MAX_METRICS_LENGTH) {
                metricArray.shift();
            }
        }

        await this.analyzeMetrics();
    }

    async analyzeMetrics() {
        const anomalies = this.detectAnomalies();

        if (anomalies.length > 0) {
            await this.notificationService.sendAlert({
                type: 'SYSTEM_ALERT',
                severity: 'MEDIUM',
                message: `Anomalies detected: ${anomalies.join(', ')}`
            });
        }
    }

    detectAnomalies() {
        // Implement anomaly detection logic
        return [];
    }
}

// Initialize the SmartAPI with user details
const smartApi = new SmartAPI({
    api_key: 'your_api_key_here',
    client_code: 'your_client_code_here',
    totp: 'your_totp_here',
    trading_password: 'your_trading_password_here'
});

// API Endpoint for User Registration
app.post('/api/register', async (req, res) => {
    const { username, email, password, phone } = req.body;
    const userCode = generateUniqueUserId(); // Implement this function to generate unique IDs

    try {
        const newUser = new User({ username, email, password, phone, userCode });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully', userCode });
    } catch (error) {
        console.error('User registration error:', error);
        res.status(400).json({ error: 'User registration failed' });
    }
});

// Utility to generate unique user ID
function generateUniqueUserId() {
    return 'U' + Math.floor(Math.random() * 1000000);
}

// API Endpoint for user login (simple example)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, password });
        if (user) {
            res.status(200).json({ message: 'Login successful', user });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('User login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
