import * as React from "react";
import { useTranslation } from "react-i18next";
import { TextContent, Text, TextVariants } from "@patternfly/react-core";
import { CatalogItem } from "@openshift-console/dynamic-plugin-sdk";
import { ExtensionHook } from "../../types";
import { useK8sWatchResource } from "@openshift-console/dynamic-plugin-sdk/api";
import { mongoDBIcon } from "../../const";
import { CATALOG_TYPE } from "../const";

const useDBaaSCatalog: ExtensionHook<CatalogItem[]> = ({
  namespace,
}): [CatalogItem[], boolean, any] => {
  const { t } = useTranslation();

  const [dbaasService, loaded, errorMsg] = useK8sWatchResource({
    kind: "dbaas.redhat.com~v1alpha1~DBaaSInventory",
    isList: false,
    namespace,
    namespaced: true,
  });

  const loadedOrError = loaded || errorMsg;
  const services = React.useMemo(() => {
    if (!loaded && !errorMsg) return [];

    const mongoDBAtlasServiceCardDescription = (
      <TextContent>
        <Text component={TextVariants.p}>
          {t("dbaas-plugin~MongoDBAtlasCardDescription")}
        </Text>
      </TextContent>
    );

    const mongoDBAtlasServiceDetailsDescription = [
      {
        value: mongoDBAtlasServiceCardDescription,
      },
    ];

    const mongoDBAtlasServiceCard: CatalogItem[] = [
      {
        name: t("Mongo DBaaS"),
        type: CATALOG_TYPE,
        uid: "", //what is this?
        description: t("MongoDBAtlasDescription"),
        provider: "MongoDB",
        tags: ["mongodb"],
        icon: {
          url: mongoDBIcon,
        },
        cta: {
          label: t("View Instances"),
          href: `/dbaas/ns/${namespace}/mongodb-atlas`,
        },
        details: {
          descriptions: mongoDBAtlasServiceDetailsDescription,
        },
      },
    ];
    return mongoDBAtlasServiceCard;
  }, [namespace, dbaasService]);

  return [services, loadedOrError, undefined];
};

export default useDBaaSCatalog;
