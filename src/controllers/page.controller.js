import Project from "../models/project.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Page from "../models/pages.model.js";


const getAllPages = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    
    const aggregation = [];
    aggregation.push({
        $facet: {
            pages: [
                { $skip: skip },
                { $limit: limit },
                { $project: { __v: 0 } },
                { $sort: { createdAt: -1 } }
            ],
            totalCount: [{ $count: "count" }]
        }
    });

    const result = await Page.aggregate(aggregation);

    const pages = result[0].pages;
    const totalRecords = result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json(new ApiResponse(200,
        pages.length > 0 ? "Fetched all pages successfully" : "No pages found",
        pages.length > 0 ? {
            pages,
            total_page: totalPages,
            current_page: page,
            total_records: totalRecords,
            per_page: limit
        } : null
    ));

});


const addPage = asyncHandler(async (req, res) => {
    const { pageName, pageURL, pageDescription } = req.body;

    if (!pageName || !pageURL || !pageDescription) {
        throw new ApiError(400, "Page name, URL, and description are required");
    }

    const newPage = new Page({
        pageName,
        pageUrl: pageURL,
        description: pageDescription
    });

    await newPage.save();

    return res.status(201).json(new ApiResponse(201, "Page created successfully", newPage));
});


const updatePage = asyncHandler(async (req, res) => {
    const { pageId } = req.params;
    const { pageName, pageURL, pageDescription } = req.body;

    const page = await Page.findById(pageId);
    if (!page) {
        throw new ApiError(404, 'Page not found');
    }

    const updatedPage = await Page.findByIdAndUpdate(pageId, {
        pageName,
        pageURL,
        description: pageDescription
    }, { new: true });

    if (!updatedPage) {
        throw new ApiError(404, 'Page not found');
    }

    res.status(200).json(new ApiResponse(200, 'Page updated successfully', updatedPage));
});

const deletePage = asyncHandler(async (req, res) => {
    const { pageId } = req.params;
    const page = await Page.findByIdAndDelete(pageId);
    if (!page) {
        throw new ApiError(404, 'Page not found');
    }
    res.status(200).json(new ApiResponse(200, 'Page deleted successfully', null));
});

export { getAllPages, addPage, updatePage, deletePage };