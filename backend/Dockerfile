FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . . 

# o init.sql não cria tudo (companies, cnpj...), então aplica as migrations antes de subir
CMD ["sh", "-c", "npm run migrate && npm run dev"]