import * as React from "react";
import { useTranslation } from "react-i18next";
import { TextContent, Text, TextVariants } from "@patternfly/react-core";
import { CatalogItem } from "@openshift-console/dynamic-plugin-sdk";
import { ExtensionHook } from "../../types";
import { useK8sWatchResource } from "@openshift-console/dynamic-plugin-sdk/api";
import { CATALOG_TYPE, DBAAS_PROVIDER_KIND } from "../const";

const useDBaaSCatalog: ExtensionHook<CatalogItem[]> = ({
  namespace,
}): [CatalogItem[], boolean, any] => {
  const { t } = useTranslation();

  const [dbaasProviders, loaded, errorMsg] = useK8sWatchResource({
    kind: DBAAS_PROVIDER_KIND,
    isList: false,
  });

  const loadedOrError = loaded || errorMsg;

  const providers = React.useMemo(() => {
    if (!loaded && !errorMsg) return [];

    const providerCards: CatalogItem[] = (dbaasProviders as any).items?.map(
      (provider) => {
        return {
          name: t(provider.spec?.provider?.displayName),
          type: CATALOG_TYPE,
          uid: provider.metadata?.uid,
          description: t(provider.spec?.provider?.displayDescription),
          provider: t(provider.spec?.provider?.name),
          tags: ['mongodb', 'crunchy'],
          icon: {
            url:  `data:image/png;base64,${provider.spec?.provider?.icon?.base64data}`,
          },
          cta: {
            label: t("Connect"),
            href: `/dbaas/ns/${namespace}/${provider.metadata?.name}`,
          },
          details: {
            descriptions: [
              {
                value: (
                  <TextContent>
                    <Text component={TextVariants.p}>
                      {t(provider.spec?.provider?.displayDescription)}
                    </Text>
                  </TextContent>
                ),
              },
            ],
          },
        };
      }
    );

    return providerCards;
  }, [loaded, errorMsg]);

  return [providers, loadedOrError, undefined];
};

export default useDBaaSCatalog;
