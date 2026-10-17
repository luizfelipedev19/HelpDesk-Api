"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToCategories = rowToCategories;
exports.toPublicCategories = toPublicCategories;
function rowToCategories(row) {
    return {
        id: row.id_categores,
        nameCategories: row.name,
        color: row.color,
    };
}
function toPublicCategories(categories) {
    const { ...publicCategories } = categories;
    return publicCategories;
}
