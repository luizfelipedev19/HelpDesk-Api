import { categoriesRepository } from "../repository/categories.repository";
import { PublicCategories, toPublicCategories, UpdateCategoryInput } from "../model/categories.model";
import { AppError } from "../errors/app-errors";
import { CreateCategoriesBody } from "../schema/categories.schema";


export interface CreateCategoriesInput {
    nameCategories: string;
    color: string;
}


export const categoriesService = {
        async createCategories(input: CreateCategoriesBody, companyId: string): Promise<PublicCategories>{

        
        try {
            const categories = await categoriesRepository.createCategories({
                companyId: companyId,
                nameCategories: input.name.trim(),
                color: input.color.trim(),
            });

            return toPublicCategories(categories)
        } catch (error) {
            if((error as {code?: string}).code === '23505'){
                throw new AppError('Categoria já cadastrada', 409);
            }
            throw error;
        }
    },

    async getBydId(id: string, companyId: string): Promise<PublicCategories> {
        const categories = await categoriesRepository.findById(id, companyId);

        if(!categories) {
            throw new AppError('Categoria não encontrada', 404);
        }

        return toPublicCategories(categories);
    },

    async listCategories(companyId: string): Promise<PublicCategories[]> {
        const categoriesList = await categoriesRepository.listCategories(companyId);

        if(!categoriesList) {
            throw new AppError('Não foi possivel listar as categorias', 404);
        }

        return categoriesList.map(toPublicCategories);
    },

    async updateCategories(id: string, companyId: string, data: UpdateCategoryInput): Promise<PublicCategories>{
        const updateCategories = await categoriesRepository.updateCategories(id, companyId, data)

        if(!updateCategories) {
            throw new AppError('Não foi possivel atualizar a categoria', 422);
        }

        return toPublicCategories(updateCategories);
    },

    async deleteCategories(id: string, companyId: string): Promise<void>{
         await categoriesRepository.deleteCategories(id, companyId);
    }
}