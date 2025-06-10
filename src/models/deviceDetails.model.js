import mongoose from "mongoose";


const deviceDetailsSchema = new mongoose.Schema({
    deviceToken:{
        type:String,
        required: true,
    },
    deviceType: {
        type: String,
        enum: ['android', 'iOS'],
        required: true,
    },
    deviceName: {
        type: String,
        required: true,
    },
    deviceModel: {
        type: String,
        required: true,
    },
    isLoggedIn:{
        type: Boolean,
        default: true,
    },
    userId:{
        type:String,
        required: true,
        ref: 'User', 
    }
},{
    timestamps: true,
    versionKey: false,
});


const DeviceDetails = mongoose.model('DeviceDetails', deviceDetailsSchema);
export { DeviceDetails };