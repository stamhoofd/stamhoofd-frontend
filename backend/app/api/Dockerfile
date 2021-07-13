# Build the ts packages
FROM stamhoofd_common AS build

WORKDIR /usr/src/app
COPY package*.json ./
RUN yarn
COPY . .
COPY --from=stamhoofd_common /usr/src/app/node_modules/ ./node_modules/
RUN yarn build

FROM node:14 AS serve
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/ ./

#EXPOSE 9090
CMD [ "node", "./dist/index.js" ]
