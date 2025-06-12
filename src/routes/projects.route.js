import { Router } from "express";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getAllProjects,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    getAllTasks,
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
    ProjectInvoices
} from "../controllers/project.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    projectSchema,
    taskSchema,
    assignTaskSchema,
    qualityAssuranceSchema,
    clockInSchema,
    taskUpdateSchema
} from "../validators/projectValidator.js";
import errorHandler from "../middlewares/errorhandler.middleware.js";



const router = Router();

router.get('/', verifyJWT, getAllProjects);
router.post('/', verifyJWT, validateRequest(projectSchema), addProject);
router.put('/update/:projectId', verifyJWT, validateRequest(projectSchema), updateProject);
router.delete('/delete/:projectId', verifyJWT, deleteProject);
router.get('/project-dropdown', verifyJWT, getProjectDropDown);

// Task
router.get('/tasks', verifyJWT, getAllTasks);
router.post('/tasks', verifyJWT, validateRequest(taskSchema), addTask);
router.put('/tasks/:taskId', verifyJWT, validateRequest(taskSchema), updateTask);
router.delete('/tasks/:taskId', verifyJWT, deleteTask);
router.get('/tasks/:projectId', verifyJWT, getAllTaskofProject);

// Assign Task 
router.get('/assign-tasks', verifyJWT, getAssignTasks);
router.post('/assign-tasks', verifyJWT, validateRequest(assignTaskSchema), assignTask);
router.put('/assign-tasks/:assignmentId', verifyJWT, validateRequest(assignTaskSchema), updateAssignTask);
router.delete('/assign-tasks/:assignmentId', verifyJWT, deleteAssignedTask);

// Quality Assurance
router.get('/quality-assurance', verifyJWT, getQualityAssurance);
router.post('/quality-assurance', verifyJWT, validateRequest(qualityAssuranceSchema), addQualityAssurance);
router.put('/quality-assurance/:qaId', verifyJWT, validateRequest(qualityAssuranceSchema), updateQualityAssurance);
router.delete('/quality-assurance/:qaId', verifyJWT, deleteQualityAssurance);

// Project Invoice
router.get('/invoice',verifyJWT,ProjectInvoices);


// mobile 
router.get('/my-projects', verifyJWT, getMyProjects);
router.post('/clock-in', verifyJWT, validateRequest(clockInSchema), clockIn);
router.get('/project-details/:projectId', verifyJWT, getProjectDetails);
router.get('/document-type', verifyJWT, getDocumentType);
router.get('/doc-details/:docId', verifyJWT, getDocDetails);
router.get('/task-details/:taskId', verifyJWT, getTaskDetails);
router.put('/task-completion-update', verifyJWT, upload.fields([
    {
        name: "taskUpdateFile",
        maxCount: 5,
    },
]), errorHandler, validateRequest(taskUpdateSchema), taskCompletionUpdate);
router.get('/get-invoice',verifyJWT,getAllInvoicesProject);



export default router;
