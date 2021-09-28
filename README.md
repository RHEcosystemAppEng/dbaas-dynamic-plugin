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

## Using Console's API

OpenShift Console exposes API via global window object in runtime. In order to use the API you need to configure [webpack externals](https://webpack.js.org/configuration/externals).

1. in webpack.config.js add [externals configuration](https://github.com/rawagner/console-dynamic-foo/blob/wp_externals/webpack.config.ts#L40-L42)

```
externals: {
  '@openshift-console/dynamic-plugin-sdk/api': 'api',
}
```

2. Add path mapping to [tsconfig.json](https://github.com/rawagner/console-dynamic-foo/blob/wp_externals/tsconfig.json#L11-L14) - this step is needed because TS does not yet support node's package exports

```
"paths": {
  "@openshift-console/dynamic-plugin-sdk/api": ["node_modules/@openshift-console/dynamic-plugin-sdk/lib/api/api"],
}
```

After following the steps above you will be able to import API in your components/functions like

```
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk/api';
```

See the usage in [Foo component](https://github.com/rawagner/console-dynamic-foo/blob/wp_externals/src/components/Foo.tsx)

Every imported component/function from `@openshift-console/dynamic-plugin-sdk/api` will be replaced in runtime by an actual implementation.

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
   USER=<quay user/org> yarn img-build
   ```
2. Run the image:
   ```sh
   USER=<quay user/org> yarn img-run
   ```
3. Push the image to image registry:
   ```sh
   docker push quay.io/$USER/dbaas-dynamic-plugin
   ```

Update and apply `oc-manifest.yaml` to use a custom plugin image.
