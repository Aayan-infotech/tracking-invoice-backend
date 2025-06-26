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
  ProjectInvoices,
  updateInvoiceStatus,
  getAllActivities,
  addProjectTask,
  getAllProjectTasks,
  getTaskDropDown,
  updateProjectTask,
  deleteProjectTask,
  getTodayClockingDetails,
  clockOut,
  getProjectInvoices,
  generateProjectInvoice,
  getAllDocumentType,
  addDocumentType,
  getDocumentTypeDropdown
} from "../controllers/project.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  projectSchema,
  taskSchema,
  assignTaskSchema,
  qualityAssuranceSchema,
  clockInSchema,
  taskUpdateSchema,
  projectTaskSchema
} from "../validators/projectValidator.js";
import errorHandler from "../middlewares/errorhandler.middleware.js";



const router = Router();

router.get('/', verifyJWT, getAllProjects);
router.post('/', verifyJWT, validateRequest(projectSchema), addProject);
router.put('/update/:projectId', verifyJWT, validateRequest(projectSchema), updateProject);
router.delete('/delete/:projectId', verifyJWT, deleteProject);
router.get('/project-dropdown', verifyJWT, getProjectDropDown);
router.get('/task-dropdown', verifyJWT, getTaskDropDown);

// Task
router.get('/tasks', verifyJWT, getAllTasks);
router.post('/tasks', verifyJWT, validateRequest(taskSchema), addTask);
router.put('/tasks/:taskId', verifyJWT, validateRequest(taskSchema), updateTask);
router.delete('/tasks/:taskId', verifyJWT, deleteTask);
router.get('/tasks/:projectId', verifyJWT, getAllTaskofProject);


// DocumentType 
router.get('/get-document-type', verifyJWT, getAllDocumentType);
router.get('/get-document-type-dropdown', verifyJWT, getDocumentTypeDropdown);
router.post('/add-document-type', verifyJWT, addDocumentType);


// Project Tasks
router.get('/project-tasks', verifyJWT, getAllProjectTasks);
router.post('/project-tasks', verifyJWT, validateRequest(projectTaskSchema), addProjectTask);
router.put('/project-tasks/:projectTaskId', verifyJWT, validateRequest(projectTaskSchema), updateProjectTask);
router.delete('/project-tasks/:projectTaskId', verifyJWT, deleteProjectTask);

// Assign Task 
router.get('/assign-tasks', verifyJWT, getAssignTasks);
router.post('/assign-tasks', verifyJWT, validateRequest(assignTaskSchema), assignTask);
router.put('/assign-tasks/:assignmentId', verifyJWT, validateRequest(assignTaskSchema), updateAssignTask);
router.delete('/assign-tasks/:assignmentId', verifyJWT, deleteAssignedTask);

// Quality Assurance
router.get('/quality-assurance', verifyJWT, getQualityAssurance);
router.post('/quality-assurance', verifyJWT, upload.fields([
  {
    name: "documentFile",
    maxCount: 1,
  },
]), errorHandler, validateRequest(qualityAssuranceSchema), addQualityAssurance);
router.put('/quality-assurance/:qaId', verifyJWT, upload.fields([
  {
    name: "documentFile",
    maxCount: 1,
  },
]), errorHandler, validateRequest(qualityAssuranceSchema), updateQualityAssurance);
router.delete('/quality-assurance/:qaId', verifyJWT, deleteQualityAssurance);

// Project Invoice
router.get('/invoice', verifyJWT, ProjectInvoices);
router.put('/update-invoice', verifyJWT, updateInvoiceStatus);


// mobile 
router.get('/my-projects', verifyJWT, getMyProjects);
router.post('/clock-in', verifyJWT, validateRequest(clockInSchema), clockIn);
router.get('/get-clocking-details', verifyJWT, getTodayClockingDetails);
router.post('/clock-out', verifyJWT, validateRequest(clockInSchema), clockOut);
router.get('/project-details/:projectId', verifyJWT, getProjectDetails);
router.get('/document-type', verifyJWT, getDocumentType);
router.get('/get-document-pdf', verifyJWT, getDocDetails);
router.get('/task-details/:taskId', verifyJWT, getTaskDetails);
router.put(
  '/task-completion-update',
  verifyJWT,
  upload.fields([{ name: "taskUpdateFile", maxCount: 5 }]),
  validateRequest(taskUpdateSchema),
  taskCompletionUpdate,
  errorHandler
);
router.get('/get-invoice', verifyJWT, getAllInvoicesProject);
router.get('/get-activity', verifyJWT, getAllActivities);
router.get('/get-project-invoices', verifyJWT, getProjectInvoices);
router.post('/generate-project-invoice',verifyJWT, generateProjectInvoice);



export default router;
