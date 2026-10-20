FROM node:18

WORKDIR /usr/src/app

COPY package.json ./
COPY . .

RUN npm i

EXPOSE 4000
# provisório
CMD ["npm","start"]