const mongoose = require('mongoose');

function getDbConnectionOptions(env = process.env) {
    const maxPoolSize = Number(env.MONGO_MAX_POOL_SIZE) || (env.VERCEL ? 10 : 20);
    return {
        maxPoolSize,
        serverSelectionTimeoutMS: 5000,
    };
}

const connectDB = async () => {
    try {
        const options = getDbConnectionOptions();
        await mongoose.connect(process.env.MONGO_URI, options);
        console.log(`MongoDB connected successfully (maxPoolSize: ${options.maxPoolSize})`);
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
    }
};

module.exports = connectDB;
module.exports.getDbConnectionOptions = getDbConnectionOptions;
