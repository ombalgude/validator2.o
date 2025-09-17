const mongoose=require('mongoose')
const dotenv=require('dotenv')
dotenv.config();



const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.name}`);
    } catch (error) {
        console.error("MONGODB connection FAILED:", error && (error.message || error));
        process.exit(1)
    }
}

module.exports = connectDB;