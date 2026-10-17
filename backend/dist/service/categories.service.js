"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesService = void 0;
const categories_repository_1 = require("../repository/categories.repository");
const categories_model_1 = require("../model/categories.model");
const app_errors_1 = require("../errors/app-errors");
exports.categoriesService = {
    async createCategories(input, companyId) {
        try {
            const categories = await categories_repository_1.categoriesRepository.createCategories({
                companyId: companyId,
                nameCategories: input.name.trim(),
                color: input.color.trim(),
            });
            return (0, categories_model_1.toPublicCategories)(categories);
        }
        catch (error) {
            if (error.code === '23505') {
                throw new app_errors_1.AppError('Categoria já cadastrada', 409);
            }
            throw error;
        }
    },
    async getBydId(id, companyId) {
        const categories = await categories_repository_1.categoriesRepository.findById(id, companyId);
        if (!categories) {
            throw new app_errors_1.AppError('Categoria não encontrada', 404);
        }
        return (0, categories_model_1.toPublicCategories)(categories);
    },
    async listCategories(companyId) {
        const categoriesList = await categories_repository_1.categoriesRepository.listCategories(companyId);
        if (!categoriesList) {
            throw new app_errors_1.AppError('Não foi possivel listar as categorias', 404);
        }
        return categoriesList.map(categories_model_1.toPublicCategories);
    },
    async updateCategories(id, companyId, data) {
        const updateCategories = await categories_repository_1.categoriesRepository.updateCategories(id, companyId, data);
        if (!updateCategories) {
            throw new app_errors_1.AppError('Não foi possivel atualizar a categoria', 422);
        }
        return (0, categories_model_1.toPublicCategories)(updateCategories);
    },
    async deleteCategories(id, companyId) {
        await categories_repository_1.categoriesRepository.deleteCategories(id, companyId);
    }
};
