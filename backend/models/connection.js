const mongoose=require('mongoose')
const dotenv=require('dotenv')
dotenv.config();



const connectDB = async (retries = 5, delayMs = 3000) => {
    let attempt = 0;
    while (attempt < retries) {
        try {
            const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`);
            console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.name}`);
            return connectionInstance;
        } catch (error) {
            attempt += 1;
            const message = error && (error.message || error);
            console.error(`MONGODB connection FAILED (attempt ${attempt}/${retries}):`, message);
            if (attempt >= retries) {
                console.error('Exceeded maximum retry attempts. Continuing without DB connection.');
                return null;
            }
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
}

module.exports = connectDB;