import { pool } from "../config/db.config";
import { CreateCategoriesInput, Categories, CategoriesRow, PublicCategories, UpdateCategoryInput, rowToCategories } from "../model/categories.model";

const COLUMNS = 'id_categories, name, color';

export const categoriesRepository = {
    async createCategories(input: CreateCategoriesInput): Promise<Categories> {
        const {rows} = await pool.query<CategoriesRow>(
            `insert into categories(company_id, name, color)
            values($1, $2, $3)
            returning ${COLUMNS}`,
            [input.companyId, input.nameCategories, input.color],
        );
        return rowToCategories(rows[0]);
    },

    async findById(id: string, companyId: string): Promise<Categories | null>{
        const {rows} = await pool.query<CategoriesRow>(
            `select ${COLUMNS} from categories where id_categories = $1 and company_id = $2`,
            [id, companyId],
        );

        return rows[0] ? rowToCategories(rows[0]) : null;
    },

    async listCategories(companyId: string): Promise<Categories[]> {
        const {rows} = await pool.query<CategoriesRow>(
            `select ${COLUMNS} from categories where company_id = $1 order by name`,
            [companyId],
        );

        return rows.map(rowToCategories);
    },

    async updateCategories(id: string, companyId: string, data: UpdateCategoryInput): Promise<Categories | null>{
        const allowd = { name: 'name', color: 'color'} as const;

        const sets: string[] = [];
        const values: unknown[] = [];

            for (const [key, column] of Object.entries(allowd)) {
                const value = data[key as keyof UpdateCategoryInput];
                if(value !== undefined){
                    values.push(value);
                    sets.push(`${column} = $${values.length}`);
                }
            }

            if (sets.length === 0) return this.findById(id, companyId);

            values.push(id, companyId);
            const {rows} = await pool.query<CategoriesRow>(
                `update categories
                set ${sets.join(',')}
                where id_categories = $${values.length - 1} and company_id = $${values.length}
                returning ${COLUMNS}`,
                values,
            );

            return rows[0] ? rowToCategories(rows[0]) : null;
    },

    async deleteCategories(id: string, companyId: string): Promise<boolean> {
        const {rowCount} = await pool.query(
            `delete from categories where id_categories = $1 and company_id = $2`,
            [id, companyId],
        );
        return (rowCount ?? 0) > 0;
    },
}
