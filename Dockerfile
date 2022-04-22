FROM registry.access.redhat.com/ubi8/nodejs-14:1 AS BUILD_IMAGE

WORKDIR /opt/app-root/src/app
COPY . /opt/app-root/src/app

USER 0
RUN npm i -g yarn@1.22.10
RUN yarn install
RUN yarn build

FROM registry.access.redhat.com/ubi8/nodejs-14-minimal:1

COPY LICENSE /licenses/LICENSE
USER 65532:65532
WORKDIR /app
COPY --from=BUILD_IMAGE /opt/app-root/src/app/dist ./dist
COPY --from=BUILD_IMAGE /opt/app-root/src/app/node_modules ./node_modules
COPY --from=BUILD_IMAGE /opt/app-root/src/app/http-server.sh ./http-server.sh

EXPOSE 9001
ENTRYPOINT [ "./http-server.sh", "./dist" ]