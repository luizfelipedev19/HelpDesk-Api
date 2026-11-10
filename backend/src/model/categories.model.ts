export interface Categories {
    id: string;
    nameCategories: string;
    color: string;
}

export type PublicCategories = Categories;

export interface CreateCategoriesInput {
    companyId: string;
    nameCategories: string;
    color: string;
}

export interface CategoriesRow {
    id_categories: string;
    company_id: string,
    name: string;
    color: string;
}
export interface UpdateCategoryInput {
    name?: string;
    color?: string | null;
}

export function rowToCategories(row: CategoriesRow): Categories {
    return {
        id: row.id_categories,
        nameCategories: row.name,
        color: row.color,
    };
}

export function toPublicCategories(categories: Categories): PublicCategories {
    const {... publicCategories} = categories;
    return publicCategories;
}