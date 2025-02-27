import mongoose from "mongoose";

const quick = new mongoose.Schema({
    email:String,
    passcode:Number,
});

export const Quick = mongoose.model('Quick', quick);