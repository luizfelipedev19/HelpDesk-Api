"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesRepository = void 0;
const db_config_1 = require("../config/db.config");
const categories_model_1 = require("../model/categories.model");
const COLUMNS = 'id_categories, name, color';
exports.categoriesRepository = {
    async createCategories(input) {
        const { rows } = await db_config_1.pool.query(`insert into categories(company_id, name, color)
            values($1, $2, $3)
            returning ${COLUMNS}`, [input.companyId, input.nameCategories, input.color]);
        return (0, categories_model_1.rowToCategories)(rows[0]);
    },
    async findById(id, companyId) {
        const { rows } = await db_config_1.pool.query(`select name, color from categories where id_categories = $1 and company_id = $2`, [id, companyId]);
        return rows[0] ? (0, categories_model_1.rowToCategories)(rows[0]) : null;
    },
    async listCategories(companyId) {
        const { rows } = await db_config_1.pool.query(`select name, color from categories where company_id = $1`, [companyId]);
        return rows.map(categories_model_1.rowToCategories);
    },
    async updateCategories(id, companyId, data) {
        const allowd = { name: 'name', color: 'color' };
        const sets = [];
        const values = [];
        for (const [key, column] of Object.entries(allowd)) {
            const value = data[key];
            if (value !== undefined) {
                values.push(values);
                sets.push(`${column} = $${values.length}`);
            }
        }
        if (sets.length === 0)
            return this.findById(id, companyId);
        values.push(id, companyId);
        const { rows } = await db_config_1.pool.query(`update categories
                set ${sets.join(',')}
                where id_categories = $${values.length - 1} and company_id = $${values.length}
                returning ${COLUMNS}`, values);
        return rows[0] ? (0, categories_model_1.rowToCategories)(rows[0]) : null;
    },
    async deleteCategories(id, companyId) {
        const { rows } = await db_config_1.pool.query(`delete from categories where id_categories = $1 and company_id = $s2`, [id, companyId]);
    },
};
