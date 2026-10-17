import { boolean } from "zod";

export interface Company {
    id: string,
    name: string, 
    active: boolean,
    cnpj: string, 
}

export type PublicCompany = Company;

export interface CompanyRow {
    id_company: string,
    name: string, 
    active: boolean,
    cnpj: string
}

export function rowToCompany(row: CompanyRow): Company {
    return {
        id: row.id_company,
        name: row.name,
        active: row.active,
        cnpj: row.cnpj
    }
    
}

export function toPublicCompany(company: Company): PublicCompany {

    const{...publicCompany} = company;
    return publicCompany;

}