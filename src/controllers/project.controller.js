import Project from "../models/project.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Task from "../models/task.model.js";
import AssignTask from "../models/assignTask.model.js";
import QualityAssurance from "../models/qualityAssurance.model.js";
import Attendance from "../models/attendance.model.js";
import { isValidObjectId } from "../utils/isValidObjectId.js";
import mongoose from "mongoose";
import { deleteObject, uploadImage } from "../utils/awsS3Utils.js";
import taskUpdateHistoryModel from "../models/taskUpdateHistory.model.js";
import generateInvoice from "../services/generateInvoice.js";
import Invoice from "../models/Invoices.model.js";
import { DeviceDetails } from "../models/deviceDetails.model.js";
import sendPushNotification from "../utils/sendPushNotification.js";
import ProjectTask from "../models/Projecttask.model.js";
import { assign } from "nodemailer/lib/shared/index.js";
import { distance, generateUniqueInvoiceNumber } from "../utils/HelperFunctions.js";
import DocumentType from "../models/documentType.model.js";


const getAllProjects = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const aggregation = [];
    if (search) {
        aggregation.push({
            $match: {
                $or: [
                    { projectName: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } }
                ]
            }
        });
    }

    aggregation.push({
        $facet: {
            projects: [
                { $skip: skip },
                { $limit: limit },
                { $project: { __v: 0 } },
                { $sort: { createdAt: -1 } }
            ],
            totalCount: [{ $count: "count" }]
        }
    });

    const result = await Project.aggregate(aggregation);

    const projects = result[0].projects;
    const totalRecords = result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json(new ApiResponse(200,
        projects.length > 0 ? "Fetched all projects successfully" : "No projects found",
        projects.length > 0 ? {
            projects,
            total_page: totalPages,
            current_page: page,
            total_records: totalRecords,
            per_page: limit
        } : null
    ));

});

const addProject = asyncHandler(async (req, res) => {
    const { projectName, description, startDate, endDate } = req.body;
    const newProject = new Project({
        projectName,
        description,
        startDate,
        endDate
    });

    await newProject.save();

    return res.status(201).json(new ApiResponse(201, "Project created successfully", newProject));
});

const updateProject = asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const { projectName, description, startDate, endDate, status } = req.body;

    if (!isValidObjectId(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
    }
    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }

    if (project.status === 'completed') {
        throw new ApiError(400, 'Cannot update a completed project');
    }


    project.projectName = projectName;
    project.description = description;
    project.startDate = startDate;
    project.endDate = endDate;
    project.status = status;
    const updatedProject = await project.save();
    if (!updatedProject) {
        throw new ApiError(500, 'Failed to update project');
    }

    return res.status(200).json(new ApiResponse(200, "Project updated successfully", updatedProject));
});

const deleteProject = asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    await Project.findByIdAndDelete(projectId);
    return res.status(200).json(new ApiResponse(200, "Project deleted successfully"));
});

const getProjectDropDown = asyncHandler(async (req, res) => {
    const projects = await Project.find({ status: 'active' }).select('projectName');
    return res.status(200).json(new ApiResponse(200, 'Get Project dropdown successfully', projects));
});

const getTaskDropDown = asyncHandler(async (req, res) => {
    const tasks = await Task.find({ status: 'active' }).select('taskName amount _id');
    return res.status(200).json(new ApiResponse(200, 'Get Task dropdown successfully', tasks));
});

const getAllTasks = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const aggregation = [];

    // aggregation.push({
    //     $lookup: {
    //         from: "projects",
    //         localField: "projectId",
    //         foreignField: "_id",
    //         as: "projectDetails"
    //     }
    // });

    // aggregation.push({
    //     $unwind: {
    //         path: "$projectDetails",
    //         preserveNullAndEmptyArrays: true
    //     }
    // });

    aggregation.push({
        $sort: {
            createdAt: -1
        }
    });

    aggregation.push({
        $facet: {
            tasks: [
                { $skip: skip },
                { $limit: limit },
                { $project: { __v: 0 } },
            ],
            totalCount: [{ $count: "count" }]
        }
    });

    const result = await Task.aggregate(aggregation);

    const tasks = result[0].tasks;

    const totalRecords = result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json(new ApiResponse(200,
        tasks.length > 0 ? "Fetched all tasks successfully" : "No tasks found",
        tasks.length > 0 ? {
            tasks,
            total_page: totalPages,
            current_page: page,
            total_records: totalRecords,
            per_page: limit
        } : null
    ));
});

const addTask = asyncHandler(async (req, res) => {
    const { taskName, amount, description } = req.body;

    if (!taskName || !amount) {
        throw new ApiError(400, 'Missing required fields');
    }

    // Check if the same task already exists in the project
    const existingTask = await Task.findOne({ taskName });
    if (existingTask) {
        throw new ApiError(409, 'Task with the same name already exists');
    }

    const task = await Task.create({
        taskName,
        amount,
        description,
    });

    if (!task) {
        throw new ApiError(400, 'Failed to save the task');
    }

    return res.status(200).json(new ApiResponse(200, 'Task created successfully', task));
});

const updateTask = asyncHandler(async (req, res) => {
    const taskId = req.params.taskId;
    const { taskName, amount, status, description } = req.body;

    if (!isValidObjectId(taskId)) {
        throw new ApiError(400, 'Invalid task ID');
    }

    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
        throw new ApiError(404, 'Task not found');
    }

    const duplicateTask = await Task.findOne({ _id: { $ne: taskId }, taskName });
    if (duplicateTask) {
        throw new ApiError(409, 'Task with the same name already exists');
    }

    const updatedTask = await Task.findByIdAndUpdate(taskId, {
        taskName,
        amount,
        status,
        description
    }, { new: true });

    if (!updatedTask) {
        throw new ApiError(404, 'Task not found');
    }

    return res.status(200).json(new ApiResponse(200, "Task updated successfully", updatedTask));
});


const deleteTask = asyncHandler(async (req, res) => {
    const taskId = req.params.taskId;
    const deletedTask = await Task.findByIdAndDelete(taskId);
    if (!deletedTask) {
        throw new ApiError(404, 'Task not found');
    }
    return res.status(200).json(new ApiResponse(200, "Task deleted successfully"));
}
);

const getAllProjectTasks = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const aggregation = [];
    aggregation.push({
        $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "projectDetails"
        }
    });

    aggregation.push({
        $unwind: {
            path: "$projectDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $lookup: {
            from: "tasks",
            localField: "taskId",
            foreignField: "_id",
            as: "taskDetails"
        }
    });

    aggregation.push({
        $unwind: {
            path: "$taskDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $sort: { createdAt: -1 },
    });

    aggregation.push({
        $facet: {
            projectTasks: [
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        projectId: "$projectDetails._id",
                        projectName: "$projectDetails.projectName",
                        taskId: "$taskDetails._id",
                        taskName: "$taskDetails.taskName",
                        amount: 1,
                        taskQuantity: 1,
                        status: 1,
                        description: 1,
                        taskUpdateDescription: 1,
                        taskUpdatePhotos: 1,
                        taskUpdateDocuments: 1,
                        updateBy: 1,
                        invoiceUrl: 1,
                    }
                },
            ],
            totalCount: [{ $count: "count" }]
        }
    })

    const result = await ProjectTask.aggregate(aggregation);

    const projectTasks = result[0].projectTasks;

    const totalRecords = result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json(new ApiResponse(200,
        projectTasks.length > 0 ? "Fetched all project tasks successfully" : "No project tasks found",
        projectTasks.length > 0 ? {
            projectTasks,
            total_page: totalPages,
            current_page: page,
            total_records: totalRecords,
            per_page: limit
        } : null
    ));
});

const addProjectTask = asyncHandler(async (req, res) => {
    const { projectId, taskId, taskQuantity, description } = req.body;

    if (!projectId || !taskId || !taskQuantity || !description) {
        throw new ApiError(400, 'Missing required fields');
    }
    if (!isValidObjectId(projectId) || !isValidObjectId(taskId)) {
        throw new ApiError(400, 'Invalid project ID or task ID');
    }

    // Check if the project exists
    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }

    // Check if the task exists
    const task = await Task.findById(taskId);
    if (!task) {
        throw new ApiError(404, 'Task not found');
    }

    // Existing task
    const existingTask = await ProjectTask.findOne({ projectId, taskId });
    if (existingTask) {
        throw new ApiError(409, 'Task already exists in the project');
    }

    const projectTask = await ProjectTask.create({
        projectId,
        taskId,
        amount: task.amount,
        taskQuantity,
        description,
    });

    if (!projectTask) {
        throw new ApiError(400, 'Failed to create project task');
    }

    return res.status(200).json(new ApiResponse(200, 'Project task created successfully', projectTask));
});

const getAllTaskofProject = asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    // const tasks = await ProjectTask.find({ projectId }).select('taskName _id').sort({ createdAt: -1 });
    // if (!tasks || tasks.length === 0) {
    //     throw new ApiError(404, 'No tasks found');
    // }
    // return res.status(200).json(new ApiResponse(200, "Tasks fetched successfully", tasks));

    const aggregation = [];
    aggregation.push({
        $match: { projectId: new mongoose.Types.ObjectId(projectId) }
    });
    aggregation.push({
        $lookup: {
            from: "tasks",
            localField: "taskId",
            foreignField: "_id",
            as: "taskDetails"
        }
    });

    aggregation.push({
        $unwind: {
            path: "$taskDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $project: {
            _id: 1,
            taskName: "$taskDetails.taskName",
        }
    });

    const tasks = await ProjectTask.aggregate(aggregation);


    if (!tasks || tasks.length === 0) {
        throw new ApiError(404, 'No tasks found for this project');
    }

    return res.status(200).json(new ApiResponse(200, "Tasks fetched successfully", tasks));

});

const getAssignTasks = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const aggregation = [];
    aggregation.push({
        $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "projectDetails"
        }
    });
    aggregation.push({
        $unwind: {
            path: "$projectDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "userId",
            as: "userDetails"
        }
    });


    aggregation.push({
        $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $lookup: {
            from: "tasks",
            localField: "taskId",
            foreignField: "_id",
            as: "taskDetails"
        }
    });



    aggregation.push({
        $unwind: {
            path: "$taskDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $sort: { createdAt: -1 },
    });

    aggregation.push({
        $facet: {
            tasks: [
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        taskId: "$projectTaskId",
                        taskName: "$taskDetails.taskName",
                        projectId: "$projectDetails._id",
                        projectName: "$projectDetails.projectName",
                        userId: "$userDetails.userId",
                        name: "$userDetails.name",
                        username: "$userDetails.username",
                    }
                },
            ],
            totalCount: [{ $count: "count" }]
        }
    });

    const result = await AssignTask.aggregate(aggregation);

    const tasks = result[0].tasks;

    const totalRecords = result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json(new ApiResponse(200,
        tasks.length > 0 ? "Fetched all assigned tasks successfully" : "No assigned tasks found",
        tasks.length > 0 ? {
            tasks,
            total_page: totalPages,
            current_page: page,
            total_records: totalRecords,
            per_page: limit
        } : null
    ));
});

const assignTask = asyncHandler(async (req, res) => {
    const { taskId, projectId, userId } = req.body;
    if (!taskId || !projectId || !userId) {
        throw new ApiError(400, 'Missing required fields');
    }

    if (!isValidObjectId(taskId)) {
        throw new ApiError(400, 'Invalid task ID');
    }



    const projectTask = await ProjectTask.findById(taskId).populate('taskId', 'taskName amount');
    if (!projectTask) {
        throw new ApiError(404, 'Project Task not found');
    }


    const existingAssignment = await AssignTask.findOne({ taskId: projectTask.taskId, projectTaskId: projectTask._id, projectId, userId });
    if (existingAssignment) {
        throw new ApiError(409, 'Task is already assigned to this user for this project');
    }

    // Get the Device details
    const deviceDetails = await DeviceDetails.find({ userId, isLoggedIn: true }).select('deviceToken');
    if (deviceDetails && deviceDetails.length > 0) {
        // Send Push Notification to the user
        const deviceTokens = deviceDetails.map(device => device.deviceToken);
        sendPushNotification(deviceTokens, 'Task Assigned', `You have been assigned a new task: ${projectTask.taskId.taskName}`, req.user.userId, userId, {
            type: "task_assigned",
            task: JSON.stringify(projectTask.taskId),
        });

    }



    projectTask.assignedTo = userId;
    const status = await projectTask.save();
    if (!status) {
        throw new ApiError(500, 'Failed to assign task');
    }
    const newAssignment = new AssignTask({
        taskId: projectTask.taskId,
        projectTaskId: projectTask._id,
        projectId,
        userId
    });
    await newAssignment.save();
    if (!newAssignment) {
        throw new ApiError(500, 'Failed to create task assignment');
    }

    res.status(201).json(new ApiResponse(201, 'Task assigned successfully', newAssignment));
});


const updateAssignTask = asyncHandler(async (req, res) => {
    const { taskId, projectId, userId } = req.body;
    const assignmentId = req.params.assignmentId;

    const updatedAssignment = await AssignTask.findByIdAndUpdate(assignmentId, {
        taskId,
        projectId,
        userId
    });

    res.status(200).json(new ApiResponse(200, 'Task assignment updated successfully', updatedAssignment));
});

const deleteAssignedTask = asyncHandler(async (req, res) => {
    const assignmentId = req.params.assignmentId;
    const deletedAssignment = await AssignTask.findByIdAndDelete(assignmentId);
    if (!deletedAssignment) {
        throw new ApiError(404, 'Assignment not found');
    }
    res.status(200).json(new ApiResponse(200, 'Task assignment deleted successfully'));
});


const getQualityAssurance = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const aggregation = [];
    aggregation.push({
        $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "projectDetails"
        }
    });
    aggregation.push({
        $unwind: {
            path: "$projectDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $lookup: {
            from: "documenttypes",
            localField: "documentTypeId",
            foreignField: "_id",
            as: "documentTypeDetails"
        }
    });

    aggregation.push({
        $unwind: {
            path: "$documentTypeDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $sort: { createdAt: -1 },
    });

    aggregation.push({
        $facet: {
            qualityAssurances: [
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        projectName: "$projectDetails.projectName",
                        projectId: "$projectDetails._id",
                        documentName: "$documentTypeDetails.name",
                        documentTypeId: "$documentTypeDetails._id",
                        documentFile: 1,
                        status: 1,
                        _id: 1,
                    }
                },
            ],
            totalCount: [{ $count: "count" }]
        }
    });

    const result = await QualityAssurance.aggregate(aggregation);
    const qualityAssurances = result[0].qualityAssurances;
    const totalRecords = result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalRecords / limit);
    res.status(200).json(new ApiResponse(200,
        qualityAssurances.length > 0 ? "Fetched all quality assurances successfully" : "No quality assurances found",
        qualityAssurances.length > 0 ? {
            qualityAssurances,
            total_page: totalPages,
            current_page: page,
            total_records: totalRecords,
            per_page: limit
        } : null
    ));


});


const addQualityAssurance = asyncHandler(async (req, res) => {
    const { projectId, documentTypeId } = req.body;

    const existdocument = await QualityAssurance.findOne({ projectId, documentTypeId });
    if (existdocument) {
        throw new ApiError(400, 'Document already exists');
    }

    let documentFile = null;


    if (req.files?.documentFile?.length > 0) {
        const file = req.files.documentFile[0];
        documentFile = file.location;
    } else {
        throw new ApiError(400, 'Document file is required');
    }


    const newQualityAssurance = new QualityAssurance({
        projectId,
        documentTypeId,
        documentFile: documentFile,
        typeOfDocument: 'file',
    });
    await newQualityAssurance.save();

    res.status(201).json(new ApiResponse(201, 'Quality assurance document added successfully', newQualityAssurance));
});


const updateQualityAssurance = asyncHandler(async (req, res) => {
    const qualityAssuranceId = req.params.qaId;
    if (!isValidObjectId(qualityAssuranceId)) {
        throw new ApiError(400, 'Invalid quality assurance ID');
    }
    const qualityAssurance = await QualityAssurance.findById(qualityAssuranceId);
    if (!qualityAssurance) {
        throw new ApiError(404, 'Quality assurance document not found');
    }
    const { projectId, documentTypeId } = req.body;
    if (!projectId || !documentTypeId) {
        throw new ApiError(400, 'Project ID and Document Type ID are required');
    }

    let documentFile = qualityAssurance.documentFile;
    if (req.files?.documentFile?.length > 0) {
        const file = req.files.documentFile[0];
        documentFile = file.location;
    }

    const updatedQualityAssurance = await QualityAssurance.findByIdAndUpdate(qualityAssuranceId, {
        projectId,
        documentTypeId,
        documentFile
    }, { new: true });

    if (!updatedQualityAssurance) {
        throw new ApiError(404, 'Quality assurance document not found');
    }

    res.status(200).json(new ApiResponse(200, 'Quality assurance document updated successfully', updatedQualityAssurance));
});

const deleteQualityAssurance = asyncHandler(async (req, res) => {
    const qualityAssuranceId = req.params.qaId;
    const deletedQualityAssurance = await QualityAssurance.findByIdAndDelete(qualityAssuranceId);
    if (!deletedQualityAssurance) {
        throw new ApiError(404, 'Quality assurance document not found');
    }
    res.status(200).json(new ApiResponse(200, 'Quality assurance document deleted successfully'));
});

const clockIn = asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
        throw new ApiError(400, 'Latitude and Longitude are required');
    }
    const user = req.user;
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Check if the user has already clocked in today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const existingAttendance = await Attendance.findOne({
        userId: user.userId,
        clockInTime: { $gte: startOfDay, $lt: endOfDay }
    });
    if (existingAttendance) {
        throw new ApiError(400, 'You have already clocked in today');
    }


    const attendance = await Attendance.create({
        userId: user.userId,
        clockInTime: new Date(),
        latitude,
        longitude
    });
    if (!attendance) {
        throw new ApiError(500, 'Failed to clock in');
    }

    res.status(201).json(new ApiResponse(201, 'Clock-in successful', attendance));
});


const clockOut = asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
        throw new ApiError(400, 'Latitude and Longitude are required');
    }

    const user = req.user;
    if (!user) {
        throw new ApiError(404, 'User not found');
    }


    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const attendance = await Attendance.findOne({
        userId: user.userId,
        clockInTime: { $gte: startOfDay, $lt: endOfDay }
    });

    if (!attendance) {
        throw new ApiError(404, 'No clock-in record found for today');
    }

    const currentLocation = { lat: latitude, lon: longitude };
    const ClockedInLocation = { lat: attendance.latitude, lon: attendance.longitude };

    const dist = distance(currentLocation, ClockedInLocation);

    if (dist > 100) { // Assuming 100 meters is the allowed distance
        throw new ApiError(400, `You are too far from your clock-in location to clock out. Distance: ${dist} meters`);
    }

    // update the clock-out time
    attendance.clockOutTime = new Date();
    attendance.isClockedIn = false;
    const updatedAttendance = await attendance.save();
    if (!updatedAttendance) {
        throw new ApiError(500, 'Failed to clock out');
    }

    res.status(200).json(new ApiResponse(200, 'Clock-out successful', updatedAttendance));

});

const getTodayClockingDetails = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const attendance = await Attendance.findOne({
        userId: user.userId,
        clockInTime: { $gte: startOfDay, $lt: endOfDay }
    });

    if (!attendance) {
        throw new ApiError(404, 'No clock-in record found for today');
    }

    res.status(200).json(new ApiResponse(200, 'Today clocking details fetched successfully', attendance));
});
const getProjectDetails = asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    if (!isValidObjectId(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
    }
    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }

    const aggregation = [];

    aggregation.push({
        $match: { _id: project._id }
    });

    aggregation.push({
        $lookup: {
            from: "assigntasks",
            localField: "_id",
            foreignField: "projectId",
            as: "assignedMembers"
        }
    });


    aggregation.push({
        $lookup: {
            from: "users",
            localField: "assignedMembers.userId",
            foreignField: "userId",
            as: "assignedMembersDetails"
        }
    });

    aggregation.push({
        $unwind: {
            path: "$assignedMembersDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $lookup: {
            from: "projecttasks",
            localField: "assignedMembers.projectTaskId",
            foreignField: "_id",
            as: "projectTasks"
        }
    });

    aggregation.push({
        $unwind: {
            path: "$projectTasks",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $lookup: {
            from: "tasks",
            localField: "projectTasks.taskId",
            foreignField: "_id",
            as: "projectTasks.taskDetail"
        }
    });

    aggregation.push({
        $unwind: {
            path: "$projectTasks.taskDetail",
            preserveNullAndEmptyArrays: true
        }
    });






    aggregation.push({
        $group: {
            _id: "$_id",
            projectName: { $first: "$projectName" },
            description: { $first: "$description" },
            startDate: { $first: "$startDate" },
            endDate: { $first: "$endDate" },
            status: { $first: "$status" },
            projectTasks: {
                $addToSet: {
                    _id: "$projectTasks._id",
                    taskName: "$projectTasks.taskDetail.taskName",
                    status: "$projectTasks.status",
                }
            },
            assignedMembersDetails: {
                $addToSet: {
                    userId: "$assignedMembersDetails.userId",
                    name: "$assignedMembersDetails.name",
                    username: "$assignedMembersDetails.username",
                    profile_image: "$assignedMembersDetails.profile_image"
                }
            }
        }
    });

    const result = await Project.aggregate(aggregation);
    const projectDetails = result[0];
    if (!projectDetails) {
        throw new ApiError(404, 'Project details not found');
    }
    res.status(200).json(new ApiResponse(200, 'Project details fetched successfully', projectDetails));

});

const getMyProjects = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const userId = req.user.userId;
    if (!userId) {
        throw new ApiError(400, 'User ID is required');
    }

    const aggregation = [
        {
            $match: { userId: userId }
        },
        {
            $group: {
                _id: "$projectId"
            }
        },
        {
            $lookup: {
                from: "projects",
                localField: "_id",
                foreignField: "_id",
                as: "projectDetails"
            }
        },
        {
            $unwind: "$projectDetails",
        },
        {
            $replaceRoot: { newRoot: "$projectDetails" }
        },
        {
            $match: { status: 'active' }
        },
        {
            $facet: {
                metadata: [
                    { $count: "total" }
                ],
                data: [
                    { $skip: skip },
                    { $limit: limit }
                ]
            }
        },
        {
            $addFields: {
                total: { $arrayElemAt: ["$metadata.total", 0] }
            }
        }
    ];

    const result = await AssignTask.aggregate(aggregation);


    const projects = result[0]?.data || [];
    const total = result[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json(new ApiResponse(200, 'User projects fetched successfully', {
        projects,
        total_page: totalPages,
        current_page: page,
        total_records: total,
        per_page: limit
    }));
});


const getDocumentType = asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    if (!isValidObjectId(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
    }
    const aggregation = [];
    aggregation.push({
        $match: { projectId: new mongoose.Types.ObjectId(projectId) }
    });

    aggregation.push({
        $project: {
            _id: 1,
            documentName: 1,
            typeOfDocument: 1
        }
    });
    aggregation.push({
        $sort: { createdAt: -1 }
    });


    const documentTypes = await QualityAssurance.aggregate(aggregation);
    if (!documentTypes || documentTypes.length === 0) {
        throw new ApiError(404, 'No documents found for this project');
    }
    res.status(200).json(new ApiResponse(200, 'Document types fetched successfully', documentTypes));
});


const getDocDetails = asyncHandler(async (req, res) => {
    const { projectId } = req.body;
    if (!isValidObjectId(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
    }
    // console.log(projectId);
    const docDetails = await QualityAssurance.find({ projectId }).populate('documentTypeId', 'name').select('documentFile documentTypeId typeOfDocument');

    // console.log(docDetails);
    res.status(200).json(new ApiResponse(200, docDetails.length > 0 ? 'Documents fetched successfully' : 'No documents found', docDetails.length > 0 ? docDetails : null));
});

const taskCompletionUpdate = asyncHandler(async (req, res) => {
    const { taskId, taskUpdateDescription, status, taskCompletedQuantity } = req.body;
    if (!isValidObjectId(taskId)) {
        throw new ApiError(400, 'Invalid task ID');
    }

    const task = await ProjectTask.findById(taskId).populate('taskId', 'taskName taskQuantity taskCompletedQuantity amount');

    if (!task) {
        throw new ApiError(404, 'Task not found');
    }

    const completedQuantity = Number(task.taskCompletedQuantity || 0) + Number(taskCompletedQuantity || 0);
    const taskCompletedStatus = completedQuantity >= task.taskQuantity ? 'completed' : 'in progress';

    if (completedQuantity > Number(task.taskQuantity || 0)) {
        throw new ApiError(400, 'Task completed quantity cannot exceed task quantity');
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }

    const uploadImages = [];

    if (req.files?.taskUpdateFile?.length > 0) {
        req.files.taskUpdateFile.forEach((file) => {
            uploadImages.push(file.location);
        });
    }


    // Created a Task Update History
    const taskUpdateHistory = await taskUpdateHistoryModel({
        taskId: task._id,
        updateDescription: taskUpdateDescription,
        status: taskCompletedStatus,
        taskCompletedQuantity,
        updatePhotos: uploadImages,
        updatedBy: req.user.userId
    });
    await taskUpdateHistory.save();


    const InvoiceNumber = await generateUniqueInvoiceNumber();

    const invoiceData = [{
        projectName: project.projectName || 'Unknown Project',
        taskName: task?.taskId?.taskName,
        date: new Date().toLocaleDateString(),
        invoiceNumber: InvoiceNumber,
        items: [
            { name: task?.taskId?.taskName, quantity: taskCompletedQuantity, price: task?.taskId?.amount },
        ],
        user: {
            name: req.user.name || 'Unknown User',
            email: req.user.email || 'Unknown Email',
            username: req.user.username || 'Unknown Username',
            address: req.user.address || 'Unknown Address',
        }
    }];

    const s3Url = await generateInvoice(invoiceData, `invoices/${InvoiceNumber}.pdf`);

    // Save the Invoice to Database
    const invoice = await Invoice.create({
        invoiceNumber: InvoiceNumber,
        userId: req.user.userId,
        projectId: task.projectId,
        taskCompletedQuantity,
        taskId: task._id,
        invoiceUrl: s3Url,
        amount: task.amount,
        status: 'unpaid',
        InvoiceDate: new Date(),
        invoiceType: 'task'
    });

    if (!invoice) {
        throw new ApiError(500, 'Failed to create invoice');
    }

    task.taskCompletedQuantity = completedQuantity;

    task.invoiceUrl = s3Url;


    task.status = taskCompletedStatus;
    task.taskUpdateDescription = taskUpdateDescription;
    task.taskUpdatePhotos = uploadImages;
    task.updateBy = req.user.userId;

    const updatedTask = await task.save();
    if (!updatedTask) {
        throw new ApiError(500, 'Failed to update task');
    }

    return res.status(200).json(new ApiResponse(200, 'Task updated successfully', updatedTask));
});


const getTaskDetails = asyncHandler(async (req, res) => {
    const taskId = req.params.taskId;
    if (!isValidObjectId(taskId)) {
        throw new ApiError(400, 'Invalid task ID');
    }

    const aggregation = [];
    aggregation.push({
        $match: { _id: new mongoose.Types.ObjectId(taskId) }
    });
    aggregation.push({
        $lookup: {
            from: "taskupdatehistories",
            localField: "_id",
            foreignField: "taskId",
            as: "taskUpdateHistory"
        }
    });
    aggregation.push({
        $lookup: {
            from: "tasks",
            localField: "taskId",
            foreignField: "_id",
            as: "taskDetails"
        }
    });
    aggregation.push({
        $unwind: {
            path: "$taskDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "projectDetails"
        }
    });
    aggregation.push({
        $unwind: {
            path: "$projectDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $project: {
            _id: 1,
            taskName: "$taskDetails.taskName",
            description: 1,
            amount: 1,
            status: 1,
            taskUpdatePhotos: 1,
            taskUpdateDescription: 1,
            invoiceUrl: 1,
            taskUpdateHistory: "$taskUpdateHistory",
            taskQuantity: 1,
            taskCompletedQuantity: 1,
            projectDetails: {
                _id: "$projectDetails._id",
                projectName: "$projectDetails.projectName",
                description: "$projectDetails.description",
                status: "$projectDetails.status"
            }
        }
    });

    const task = await ProjectTask.aggregate(aggregation);


    return res.status(200).json(new ApiResponse(200, task.length > 0 ? "Task details fetched successfully" : "Task not found",
        task.length > 0 ? task[0] : null));
});

const updateProjectTask = asyncHandler(async (req, res) => {
    const projectTaskId = req.params.projectTaskId;
    const { projectId, taskId, taskQuantity, description, taskUpdateDescription } = req.body;

    if (!isValidObjectId(projectTaskId)) {
        throw new ApiError(400, 'Invalid project task ID');
    }

    const task = await ProjectTask.findById(projectTaskId);
    if (!task) {
        throw new ApiError(404, 'Project task not found');
    }

    const updatedTask = await ProjectTask.findByIdAndUpdate(projectTaskId, {
        taskQuantity,
        description,
        taskUpdateDescription
    }, { new: true });

    if (!updatedTask) {
        throw new ApiError(404, 'Project task not found');
    }

    return res.status(200).json(new ApiResponse(200, "Project task updated successfully", updatedTask));
});

const deleteProjectTask = asyncHandler(async (req, res) => {
    const projectTaskId = req.params.projectTaskId;

    const task = await ProjectTask.findByIdAndDelete(projectTaskId);
    if (!task) {
        throw new ApiError(404, 'Project task not found');
    }

    return res.status(200).json(new ApiResponse(200, 'Project task deleted successfully'));
});

const getAllInvoicesProject = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const status = req.query.status || 'all';
    if (status !== 'all' && !['unpaid', 'paid', 'draft'].includes(status)) {
        throw new ApiError(400, 'Invalid status');
    }

    const aggregationTask = [];

    aggregationTask.push({
        $match: {
            userId: req.user.userId
        }
    });
    aggregationTask.push({
        $group: {
            _id: "$projectId",
        }
    });
    aggregationTask.push({
        $project: {
            _id: 0,
            projectId: "$_id"
        }
    });

    const assignedProject = await AssignTask.aggregate(aggregationTask);
    // console.log(assignedProject);
    const projectIds = assignedProject.map(item => item.projectId);


    const aggregation = [];
    aggregation.push({
        $match: {
            projectId: { $in: projectIds },
            invoiceType: 'project',
            status: status === 'all' ? { $ne: null } : status
        }
    });
    aggregation.push({
        $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "projectDetails"
        }
    });
    aggregation.push({
        $unwind: {
            path: "$projectDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $facet: {
            invoices: [
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        invoiceNumber: 1,
                        projectId: "$projectDetails._id",
                        projectName: "$projectDetails.projectName",
                        taskId: 1,
                        invoiceUrl: 1,
                        status: 1,
                        InvoiceDate: 1
                    }
                },
                { $sort: { createdAt: -1 } }
            ],
            totalCount: [{ $count: "count" }]
        }
    });

    const result = await Invoice.aggregate(aggregation);
    // console.log(result);
    const invoices = result[0].invoices;
    const totalRecords = result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalRecords / limit);


    return res.status(200).json(new ApiResponse(200,
        invoices.length > 0 ? "Fetched all project invoices successfully" : "No project invoices found",
        invoices.length > 0 ? {
            invoices,
            total_page: totalPages,
            current_page: page,
            total_records: totalRecords,
            per_page: limit
        } : null
    ));
});

const ProjectInvoices = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const aggregation = [];
    aggregation.push({
        $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "projectDetails"
        }
    });

    aggregation.push({
        $unwind: {
            path: "$projectDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $sort: { createdAt: -1 },
    });

    aggregation.push({
        $facet: {
            invoices: [
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        invoiceNumber: 1,
                        projectId: "$projectDetails._id",
                        projectName: "$projectDetails.projectName",
                        invoiceUrl: 1,
                        status: 1,
                        InvoiceDate: 1
                    }
                },
                { $sort: { createdAt: -1 } }
            ],
            totalCount: [{ $count: "count" }]
        }
    });


    const result = await Invoice.aggregate(aggregation);
    const invoices = result[0].invoices;
    const totalRecords = result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalRecords / limit);


    return res.status(200).json(new ApiResponse(200,
        invoices.length > 0 ? "Fetched all project invoices successfully" : "No project invoices found",
        invoices.length > 0 ? {
            invoices,
            total_page: totalPages,
            current_page: page,
            total_records: totalRecords,
            per_page: limit
        } : null
    ));
});

const updateInvoiceStatus = asyncHandler(async (req, res) => {
    const { invoiceId, status } = req.body;

    if (!isValidObjectId(invoiceId)) {
        throw new ApiError(404, "Invalid Invoice Id");
    }

    const aggregation = [];
    aggregation.push({
        $match: {
            _id: new mongoose.Types.ObjectId(invoiceId),
        }
    });
    aggregation.push({
        $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "projectDetails"
        }
    });
    aggregation.push({
        $unwind: {
            path: "$projectDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $project: {
            _id: 1,
            invoiceNumber: 1,
            projectId: "$projectDetails._id",
            projectName: "$projectDetails.projectName",
            invoiceUrl: 1,
            status: 1,
            InvoiceDate: 1
        }
    });
    const invoice = await Invoice.aggregate(aggregation);

    if (!invoice || invoice.length === 0) {
        throw new ApiError(404, "Invoice not found");
    }

    if (!['paid', 'unpaid', 'draft'].includes(status)) {
        throw new ApiError(400, "Invalid status");
    }

    invoice[0].status = status;
    const updatedInvoice = await Invoice.findByIdAndUpdate(invoice[0]._id, invoice[0], { new: true });

    if (!updatedInvoice) {
        throw new ApiError(500, "Failed to update invoice status");
    }


    return res.status(200).json(new ApiResponse(200, "Invoice status updated successfully", invoice[0]));
});


const getAllActivities = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const invoiceEndDate = req.query.invoiceEndDate ? new Date(req.query.invoiceEndDate) : new Date();
    const invoiceDate = req.query.invoiceDate ? new Date(req.query.invoiceDate) : new Date();
    if (isNaN(invoiceEndDate.getTime()) || isNaN(invoiceDate.getTime())) {
        throw new ApiError(400, 'Invalid date format');
    }
    if (invoiceEndDate < invoiceDate) {
        throw new ApiError(400, 'End date cannot be earlier than start date');
    }

    const aggregation = [];

    aggregation.push({
        $match: {
            $expr: {
                $and: [
                    { $eq: ['$userId', req.user.userId] },
                    { $eq: ['$invoiceType', 'task'] },
                    {
                        $gte: [
                            { $dateToString: { format: "%Y-%m-%d", date: "$InvoiceDate" } },
                            invoiceDate.toISOString().split('T')[0]
                        ]
                    },
                    {
                        $lte: [
                            { $dateToString: { format: "%Y-%m-%d", date: "$InvoiceDate" } },
                            invoiceEndDate.toISOString().split('T')[0]
                        ]
                    }
                ]
            }
        }
    });


    aggregation.push({
        $lookup: {
            from: "tasks",
            localField: "taskId",
            foreignField: "_id",
            as: "taskDetails"
        }
    });
    aggregation.push({
        $unwind: {
            path: "$taskDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $lookup: {
            from: "projects",
            localField: "taskDetails.projectId",
            foreignField: "_id",
            as: "projectDetails"
        }
    });

    aggregation.push({
        $unwind: {
            path: "$projectDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $facet: {
            activities: [
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        taskId: "$taskDetails._id",
                        taskName: "$taskDetails.taskName",
                        projectId: "$projectDetails._id",
                        projectName: "$projectDetails.projectName",
                        invoiceNumber: 1,
                        invoiceUrl: 1,
                        amount: 1,
                        activityDescription: 1,
                        createdAt: 1
                    }
                },
                { $sort: { createdAt: -1 } }
            ],
            totalCount: [{ $count: "count" }]
        }
    });


    const result = await Invoice.aggregate(aggregation);
    const activities = result[0].activities;
    const totalRecords = result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json(new ApiResponse(200,
        activities.length > 0 ? "Fetched all activities successfully" : "No activities found",
        activities.length > 0 ? {
            activities,
            total_page: totalPages,
            current_page: page,
            total_records: totalRecords,
            per_page: limit
        } : null
    ));
});


const getProjectInvoices = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const userId = req.user.userId;
    if (!userId) {
        throw new ApiError(404, 'User not found');
    }

    const aggregation = [
        {
            $match: { userId: userId }
        },
        {
            $group: {
                _id: "$projectId"
            }
        },
        {
            $lookup: {
                from: "projects",
                localField: "_id",
                foreignField: "_id",
                as: "projectDetails"
            }
        },
        {
            $unwind: "$projectDetails",
        },
        {
            $replaceRoot: { newRoot: "$projectDetails" }
        },
        {
            $facet: {
                metadata: [
                    { $count: "total" }
                ],
                data: [
                    {
                        $project: {
                            __v: 0,
                        }
                    },
                    { $skip: skip },
                    { $limit: limit },
                ]
            }
        },
        {
            $addFields: {
                total: { $arrayElemAt: ["$metadata.total", 0] }
            }
        }
    ];

    const result = await AssignTask.aggregate(aggregation);


    const projects = result[0]?.data || [];
    const total = result[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json(new ApiResponse(200, 'User projects fetched successfully', {
        projects,
        total_page: totalPages,
        current_page: page,
        total_records: total,
        per_page: limit
    }));

});

const generateProjectInvoice = asyncHandler(async (req, res) => {
    const { projectId } = req.body;
    if (!isValidObjectId(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }

    const user = req.user;

    const aggregation = [];

    aggregation.push({
        $match: {
            projectId: new mongoose.Types.ObjectId(projectId),
            userId: user.userId,
        }
    });

    aggregation.push({
        $lookup: {
            from: "projecttasks",
            localField: "taskId",
            foreignField: "_id",
            as: "projectTask"
        }
    });

    aggregation.push({
        $unwind: {
            path: "$projectTask",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $lookup: {
            from: "tasks",
            localField: "projectTask.taskId",
            foreignField: "_id",
            as: "taskDetails"
        }
    });
    aggregation.push({
        $unwind: {
            path: "$taskDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "projectDetails"
        }
    });
    aggregation.push({
        $unwind: {
            path: "$projectDetails",
            preserveNullAndEmptyArrays: true
        }
    });

    aggregation.push({
        $addFields: {
            user: {
                name: user.name,
                username: user.username,
                email: user.email,
                address: user.address,
            }
        }
    });


    aggregation.push({
        $project: {
            projectName: "$projectDetails.projectName",
            taskName: "$taskDetails.taskName",
            invoiceNumber: 1,
            date: "$InvoiceDate",
            items: [
                {
                    name: "$taskDetails.taskName",
                    quantity: "$taskCompletedQuantity",
                    price: "$taskDetails.amount"
                }
            ],
            user: 1,
        }
    });


    const invoices = await Invoice.aggregate(aggregation);
    if (!invoices || invoices.length === 0) {
        throw new ApiError(404, 'No invoices found for this project');
    }

    const generatedInvoice = await generateInvoice(invoices, `invoices/${projectId}.pdf`);

    res.status(200).json(new ApiResponse(200, 'Invoice generated successfully', {
        invoiceUrl: generatedInvoice
    }));

});


const getAllDocumentType = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const aggregation = [];
    aggregation.push({
        $facet: {
            documentTypes: [
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        description: 1,
                        createdAt: 1
                    }
                },
                { $sort: { createdAt: -1 } }
            ],
            totalCount: [{ $count: "count" }]
        }
    });

    const result = await DocumentType.aggregate(aggregation);

    const documentTypes = result[0].documentTypes;
    const totalRecords = result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json(new ApiResponse(200, documentTypes.length > 0 ? 'Document types fetched successfully' : 'No document types found', documentTypes.length > 0 ? {
        documentTypes,
        total_page: totalPages,
        current_page: page,
        total_records: totalRecords,
        per_page: limit
    } : null));
});

const addDocumentType = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        throw new ApiError(400, 'Document Type name is required');
    }

    const existingDocumentType = await DocumentType.findOne({ name });
    if (existingDocumentType) {
        throw new ApiError(400, 'Document Type with this name already exists');
    }

    const newDocumentType = await DocumentType.create({ name, description });
    res.status(201).json(new ApiResponse(201, 'Document Type created successfully', newDocumentType));
});

const getDocumentTypeDropdown = asyncHandler(async (req, res) => {
    const documentTypes = await DocumentType.find({}, { _id: 1, name: 1 });
    res.status(200).json(new ApiResponse(200, 'Document types fetched successfully', documentTypes));
});
export {
    getAllProjects,
    addProject,
    updateProject,
    deleteProject,
    getAllTasks,
    addTask,
    getProjectDropDown,
    updateTask,
    deleteTask,
    getAllTaskofProject,
    getAssignTasks,
    assignTask,
    updateAssignTask,
    deleteAssignedTask,
    getQualityAssurance,
    addQualityAssurance,
    updateQualityAssurance,
    deleteQualityAssurance,
    clockIn,
    getProjectDetails,
    getMyProjects,
    getDocumentType,
    getDocDetails,
    taskCompletionUpdate,
    getTaskDetails,
    getAllInvoicesProject,
    ProjectInvoices,
    updateInvoiceStatus,
    getAllActivities,
    addProjectTask,
    getAllProjectTasks,
    getTaskDropDown,
    deleteProjectTask,
    updateProjectTask,
    getTodayClockingDetails,
    clockOut,
    getProjectInvoices,
    generateProjectInvoice,
    getAllDocumentType,
    addDocumentType,
    getDocumentTypeDropdown
};