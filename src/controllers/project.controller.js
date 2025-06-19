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
import fs from 'fs';
import Invoice from "../models/Invoices.model.js";
import { DeviceDetails } from "../models/deviceDetails.model.js";
import sendPushNotification from "../utils/sendPushNotification.js";


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



    if (status === 'completed') {
        const aggregation = [];
        aggregation.push({
            $match: {
                projectId: new mongoose.Types.ObjectId(projectId),
                status: 'completed'
            }
        });

        aggregation.push({
            $addFields: {
                quantity: 1
            }
        });
        aggregation.push({
            $project: {
                name: "$taskName",
                quantity: "$quantity",
                price: "$amount"
            }
        });

        const getAllCompletedTasks = await Task.aggregate(aggregation);

        if (getAllCompletedTasks.length === 0) {
            throw new ApiError(400, 'Cannot mark project as completed without any completed tasks');
        }


        const invoiceData = {
            projectName: project.projectName || 'Unknown Project',
            // taskName: task.taskName,
            date: new Date().toLocaleDateString(),
            invoiceNumber: `INVP-${project._id}`,
            items: getAllCompletedTasks
        };

        const s3Url = await generateInvoice(invoiceData, `invoices/INVP-${project._id}.pdf`);

        // Save the Invoice to Database
        const invoice = await Invoice.create({
            invoiceNumber: `INVP-${project._id}`,
            projectId: project._id,
            invoiceUrl: s3Url,
            amount: 0,
            status: 'unpaid',
            InvoiceDate: new Date(),
            invoiceType: 'project'
        });

        if (!invoice) {
            throw new ApiError(500, 'Failed to create invoice');
        }

        project.invoiceUrl = s3Url;

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

const getAllTasks = asyncHandler(async (req, res) => {
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
    const { projectId, taskName, amount, description, taskQuantity } = req.body;

    if (!projectId || !taskName || !amount || !taskQuantity) {
        throw new ApiError(400, 'Missing required fields');
    }

    // Check if the same task already exists in the project
    const existingTask = await Task.findOne({ projectId, taskName });
    if (existingTask) {
        throw new ApiError(409, 'Task with the same name already exists in this project');
    }

    // Create and save the task
    const task = await Task.create({
        projectId,
        taskName,
        amount,
        taskQuantity,
        description,
    });

    if (!task) {
        throw new ApiError(400, 'Failed to save the task');
    }

    return res.status(200).json(new ApiResponse(200, 'Task created successfully', task));
});

const updateTask = asyncHandler(async (req, res) => {
    const taskId = req.params.taskId;
    const { projectId, taskName, description, status, amount, taskQuantity } = req.body;

    if (!isValidObjectId(taskId)) {
        throw new ApiError(400, 'Invalid task ID');
    }

    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
        throw new ApiError(404, 'Task not found');
    }

    if (existingTask.status === 'completed') {
        throw new ApiError(400, 'Cannot update a completed task');
    }

    const duplicateTask = await Task.findOne({ _id: { $ne: taskId }, projectId, taskName });
    if (duplicateTask) {
        throw new ApiError(409, 'Task with the same name already exists in this project');
    }

    const updatedTask = await Task.findByIdAndUpdate(taskId, {
        projectId,
        taskName,
        description,
        status,
        amount,
        taskQuantity
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


const getAllTaskofProject = asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const tasks = await Task.find({ projectId }).select('taskName _id').sort({ createdAt: -1 });
    if (!tasks || tasks.length === 0) {
        throw new ApiError(404, 'No tasks found');
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
        $sort: {
            createdAt: -1
        }
    });

    aggregation.push({
        $facet: {
            tasks: [
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        taskId: "$taskDetails._id",
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



    const task = await Task.findById(taskId);

    if (!task) {
        throw new ApiError(404, 'Task not found');
    }

    if (task.assignedTo) {
        throw new ApiError(400, 'Task is already assigned to a user');
    }

    const existingAssignment = await AssignTask.findOne({ taskId, projectId, userId });
    if (existingAssignment) {
        throw new ApiError(409, 'Task is already assigned to this user for this project');
    }

    // Get the Device details
    const deviceDetails = await DeviceDetails.find({ userId, isLoggedIn: true }).select('deviceToken');
    // console.log('Device Details:', deviceDetails);
    if (deviceDetails && deviceDetails.length > 0) {
        // Send Push Notification to the user
        const deviceTokens = deviceDetails.map(device => device.deviceToken);
        // console.log('Device Tokens:', deviceTokens);
        sendPushNotification(deviceTokens, 'Task Assigned', `You have been assigned a new task: ${task.taskName}`, req.user.userId, userId, {
            type: "task_assigned",
            task: JSON.stringify(task),
        });

    }



    task.assignedTo = userId;
    const status = await task.save();
    if (!status) {
        throw new ApiError(500, 'Failed to assign task');
    }
    const newAssignment = new AssignTask({
        taskId,
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
        $facet: {
            qualityAssurances: [
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        projectName: "$projectDetails.projectName",
                        projectId: "$projectDetails._id",
                        documentName: 1,
                        documentFile: 1,
                        status: 1,
                        _id: 1,
                    }
                },
                { $sort: { createdAt: -1 } }
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
    const { projectId, documentName } = req.body;

    const existdocument = await QualityAssurance.findOne({ projectId, documentName });
    if (existdocument) {
        throw new ApiError(400, 'Document already exists');
    }

    let documentFile = null;


    if (req.files && req.files.documentFile) {
        const file = req.files.documentFile[0];
        const status = await uploadImage(file);
        if (!status.success) {
            throw new ApiError(500, 'Failed to upload document file');
        }

        documentFile = status.fileUrl;
    } else {
        throw new ApiError(400, 'Document file is required');
    }


    const newQualityAssurance = new QualityAssurance({
        projectId,
        documentName,
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
    const { projectId, documentName } = req.body;

    let documentFile = qualityAssurance.documentFile;
    if (req.files && req.files.documentFile) {
        const file = req.files.documentFile[0];
        const status = await uploadImage(file);
        if (!status.success) {
            throw new ApiError(500, 'Failed to upload document file');
        }
        documentFile = status.fileUrl;
    } else {
        documentFile = qualityAssurance.documentFile;
    }

    const updatedQualityAssurance = await QualityAssurance.findByIdAndUpdate(qualityAssuranceId, {
        projectId,
        documentName,
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
            from: "tasks",
            localField: "_id",
            foreignField: "projectId",
            as: "tasks"
        }
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
        $project: {
            _id: 1,
            projectName: 1,
            description: 1,
            startDate: 1,
            endDate: 1,
            status: 1,
            tasks: {
                $map: {
                    input: "$tasks",
                    as: "task",
                    in: {
                        _id: "$$task._id",
                        taskName: "$$task.taskName",
                        amount: "$$task.amount",
                        description: "$$task.description",
                        status: "$$task.status"
                    }
                }
            },
            assignedMembersDetails: {
                $map: {
                    input: "$assignedMembersDetails",
                    as: "member",
                    in: {
                        userId: "$$member.userId",
                        name: "$$member.name",
                        username: "$$member.username",
                        profile_image: "$$member.profile_image"
                    }
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
    const { docId } = req.params;
    if (!isValidObjectId(docId)) {
        throw new ApiError(400, 'Invalid document ID');
    }

    const docDetails = await QualityAssurance.findById(docId).select('documentName documentFile typeOfDocument');
    if (!docDetails) {
        throw new ApiError(404, 'Document details not found');
    }
    res.status(200).json(new ApiResponse(200, 'Document details fetched successfully', docDetails));
});

const taskCompletionUpdate = asyncHandler(async (req, res) => {
    const { taskId, taskUpdateDescription, status } = req.body;
    if (!isValidObjectId(taskId)) {
        throw new ApiError(400, 'Invalid task ID');
    }

    const task = await Task.findById(taskId);
    if (!task) {
        throw new ApiError(404, 'Task not found');
    }
    if (task.status === 'completed') {
        throw new ApiError(400, 'Task is already completed');
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }

    const uploadImages = [];
    if (req.files && req.files.taskUpdateFile && req.files.taskUpdateFile.length > 0) {
        for (const file of req.files.taskUpdateFile) {
            const uploadResult = await uploadImage(file);
            if (uploadResult.success) {
                uploadImages.push(uploadResult.fileUrl);
            } else {
                throw new ApiError(500, 'Failed to upload image');
            }
        }
    }

    // Created a Task Update History
    const taskUpdateHistory = await taskUpdateHistoryModel({
        taskId: task._id,
        updateDescription: taskUpdateDescription,
        status,
        updatePhotos: uploadImages,
        updatedBy: req.user.userId
    });
    await taskUpdateHistory.save();

    if (status === 'completed') {
        const invoiceData = {
            projectName: project.projectName || 'Unknown Project',
            taskName: task.taskName,
            date: new Date().toLocaleDateString(),
            invoiceNumber: `INV-${task._id}`,
            items: [
                { name: task.taskName, quantity: 1, price: task.amount },
            ],
        };

        const s3Url = await generateInvoice(invoiceData, `invoices/INV-${task._id}.pdf`);

        // Save the Invoice to Database
        const invoice = await Invoice.create({
            invoiceNumber: `INV-${task._id}`,
            userId: req.user.userId,
            projectId: task.projectId,
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

        task.invoiceUrl = s3Url;
    }

    task.status = status;
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
            taskName: 1,
            description: 1,
            amount: 1,
            status: 1,
            taskUpdatePhotos: 1,
            taskUpdateDescription: 1,
            invoiceUrl: 1,
            taskUpdateHistory: "$taskUpdateHistory",
            projectDetails: {
                _id: "$projectDetails._id",
                projectName: "$projectDetails.projectName",
                description: "$projectDetails.description",
                status: "$projectDetails.status"
            }
        }
    });

    const task = await Task.aggregate(aggregation);


    return res.status(200).json(new ApiResponse(200, task.length > 0 ? "Task details fetched successfully" : "Task not found",
        task.length > 0 ? task[0] : null));
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
        $match: {
            invoiceType: 'project',
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
};