"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesController = void 0;
const categories_service_1 = require("../service/categories.service");
const categories_schema_1 = require("../schema/categories.schema");
exports.categoriesController = {
    async create(req, res) {
        const body = categories_schema_1.createCategoriesSchama.parse(req.body);
        console.log('create called with body:', body);
        res.status(201).json(await categories_service_1.categoriesService.createCategories(body, req.user.companyId));
    },
    async getById(req, res) {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        res.status(200).json(await categories_service_1.categoriesService.getBydId(id, req.user.companyId));
    },
    async listAll(req, res) {
        res.status(200).json(await categories_service_1.categoriesService.listCategories(req.user.companyId));
    },
    async updateCategories(req, res) {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = req.body;
        res.status(200).json(await categories_service_1.categoriesService.updateCategories(id, req.user.companyId, data));
    },
    async deleteCategories(req, res) {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await categories_service_1.categoriesService.deleteCategories(id, req.user.companyId);
        res.status(204).send();
    }
};
