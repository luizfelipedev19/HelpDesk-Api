export function normalizeCnpj(value: string): string {
    return value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}


export function isValidCnpj(raw: string): boolean {
    const cnpj = normalizeCnpj(raw);

    if(!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) {
        return false;
    }

    if(/^(.)\1{13}$/.test(cnpj)) {
        return false;
    }

    const value = (ch: string)  => ch.charCodeAt(0) - 48;


    const digit = (base: string, weights: number[]) => {
        const sum = base.split('').reduce((acc, ch, i) => acc + value(ch) * weights[i], 0);
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    };

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const d1 = digit(cnpj.slice(0, 12), w1);
    const d2 = digit(cnpj.slice(0, 12) + d1, w2);

    return cnpj.endsWith(`${d1}${d2}`);
}