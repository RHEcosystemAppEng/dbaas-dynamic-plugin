FROM node:14 AS BUILD_IMAGE

WORKDIR /usr/src/app
COPY . /usr/src/app
RUN yarn install
RUN yarn build-dev

FROM node:14-alpine

USER 65532:65532
WORKDIR /app
COPY --from=BUILD_IMAGE /usr/src/app/dist ./dist
COPY --from=BUILD_IMAGE /usr/src/app/node_modules ./node_modules
COPY --from=BUILD_IMAGE /usr/src/app/http-server.sh ./http-server.sh

EXPOSE 9001
ENTRYPOINT [ "./http-server.sh", "./dist" ]