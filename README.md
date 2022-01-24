# DBaaS Dynamic Plugin

## Local development

1. `yarn build` to build the plugin, generating output to `dist` directory
2. `yarn http-server` to start an HTTP server hosting the generated assets

```
Starting up http-server, serving ./dist
Available on:
  http://127.0.0.1:9001
  http://192.168.1.190:9001
  http://10.40.192.80:9001
Hit CTRL-C to stop the server
```

The server runs on port 9001 with caching disabled and CORS enabled. Additional
[server options](https://github.com/http-party/http-server#available-options) can be passed to
the script, for example:

```sh
yarn http-server -a 127.0.0.1
```

3. Go to OCP Console that running locally and use the flowing command to run Bridge.

```
source ./contrib/oc-environment.sh && go run cmd/bridge/main.go -plugins dbaas-dynamic-plugin=http://127.0.0.1:9001/
```

For more details, see the plugin development section in
[Console Dynamic Plugins README](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk/README.md) for details
on how to run Bridge using local plugins.

## Deployment on cluster

Console dynamic plugins are supposed to be deployed via [OLM operators](https://github.com/operator-framework).
In case of demo plugin, we just apply a minimal OpenShift manifest which adds the necessary resources.

```sh
oc apply -f oc-manifest.yaml
```

Note that the `Service` exposing the HTTP server is annotated to have a signed
[service serving certificate](https://docs.openshift.com/container-platform/4.6/security/certificates/service-serving-certificate.html)
generated and mounted into the image. This allows us to run the server with HTTP/TLS enabled, using
a trusted CA certificate.

## Enabling the plugin

Once deployed on the cluster, demo plugin must be enabled before it can be loaded by Console.

To enable the plugin manually, edit [Console operator](https://github.com/openshift/console-operator)
config and make sure the plugin's name is listed in the `spec.plugins` sequence (add one if missing):

```sh
oc edit console.operator.openshift.io cluster
```

```yaml
# ...
spec:
  plugins:
    - dbaas-dynamic-plugin
# ...
```

## Docker image

Following commands should be executed in Console repository root.

1. Build the image:
   ```sh
   QUAY_USER=<quay user/org> yarn img-build
   ```
2. Run the image:
   ```sh
   QUAY_USER=<quay user/org> yarn img-run
   ```
3. Push the image to image registry:
   ```sh
   QUAY_USER=<quay user/org> yarn img-push
   ```

Update and apply `oc-manifest.yaml` to use a custom plugin image.
